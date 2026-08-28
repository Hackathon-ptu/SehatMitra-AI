import json
import asyncio
import traceback
import re
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv
load_dotenv()

from app.core.config import settings
from app.schemas.triage import TriageRequest, TriageResponse, ChatMessage
from groq import AsyncGroq
from google import genai
from google.genai import types

_groq_client = None

def get_groq_client():
    global _groq_client
    if _groq_client is None:
        if settings.GROQ_API_KEY:
            _groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    return _groq_client

_gemini_client = None

def get_gemini_client_new():
    global _gemini_client
    if _gemini_client is None:
        if settings.GEMINI_API_KEY:
            _gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
    return _gemini_client

def clean_json_response(raw_text: str) -> dict:
    clean = re.sub(r'```(?:json)?', '', raw_text).strip()
    match = re.search(r'\{.*\}', clean, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    return json.loads(clean)


class TriageService:
    @staticmethod
    async def perform_triage(symptoms_data: Dict[str, Any], patient_history: Optional[Dict[str, Any]] = None, language: str = "en") -> Dict[str, Any]:
        detected = symptoms_data.get("detected_symptoms", [])
        user_input_summary = symptoms_data.get("user_input_summary", "")
        
        is_hi = language.startswith("hi")
 
        import re
        def extract_json_from_llm(raw_text: str) -> dict:
            clean = re.sub(r'```(?:json)?', '', raw_text).strip()
            match = re.search(r'\{.*\}', clean, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            return json.loads(clean)
 
        dialogue_history = symptoms_data.get("dialogue_history", [])
        history_str = ""
        if dialogue_history:
            history_str = "\n".join([f"{msg.get('sender', 'user')}: {msg.get('text', '')}" for msg in dialogue_history])
 
        lang_name = "English"
        if language.startswith("hi"):
            lang_name = "Hindi"
        elif language.startswith("pa"):
            lang_name = "Punjabi"
        elif language.startswith("bn"):
            lang_name = "Bengali"
        elif language.startswith("ta"):
            lang_name = "Tamil"
        elif language.startswith("te"):
            lang_name = "Telugu"
        elif language.startswith("mr"):
            lang_name = "Marathi"
        elif language.startswith("gu"):
            lang_name = "Gujarati"
        elif language.startswith("kn"):
            lang_name = "Kannada"
        elif language.startswith("ml"):
            lang_name = "Malayalam"
        elif language.startswith("or"):
            lang_name = "Odia"
        elif language.startswith("ur"):
            lang_name = "Urdu"
 
        age = patient_history.get('age', 'N/A') if patient_history else 'N/A'
        history_context = ""
        if patient_history:
            history_context = f"""
            Patient Medical Profile Context:
            - Age: {patient_history.get('age', 'N/A')}
            - Gender: {patient_history.get('gender', 'N/A')}
            - Pre-existing Chronic Conditions: {', '.join(patient_history.get('chronic_conditions', []))}
            - Known Allergies: {', '.join(patient_history.get('allergies', []))}
            """
 
        system_prompt = f"""
        You are SehatMitra-AI, a clinical triage assistant.
        - If the user sends a pure greeting ("hi", "hello", "namaste") on turn 1: Greet warmly and ask for their chief complaint.
        - If the user mentions ANY symptom (e.g. pain, fever, cough), regardless of turn number: Proceed with the OPQRST clinical intake (Onset, Provocation, Quality, Region, Severity, Timing). Ask ONLY ONE clarifying question at a time.
        - Maintain state = "interviewing" until you have sufficient clinical history (at least 3-4 probing questions answered), then transition to state = "completed".

        PATIENT CLINICAL DATA:
        - Patient Age: {age}
        - Patient Preferred Language: {lang_name}
        {history_context}

        STRICT JSON OUTPUT SCHEMA:
        {{
          "state": "interviewing" | "completed" | "emergency",
          "next_question": "Conversational follow-up question in patient's language ({lang_name}) (or null if completed/emergency)",
          "differential_diagnosis": ["Primary suspected condition in patient's language ({lang_name})", "Secondary suspected condition in patient's language ({lang_name})"],
          "red_flags": ["Critical sign in patient's language ({lang_name})"],
          "summary": "Clinical summary of symptoms in patient's language ({lang_name}) or null if state is interviewing",
          "recommended_action": "Actionable home care advice or emergency instruction in patient's language ({lang_name})"
        }}
        
        CRITICAL LOCALIZATION INSTRUCTION:
        Always reply in the exact language used by the patient ({lang_name}). You MUST generate ALL conversational and report text fields (next_question, summary, recommended_action, differential_diagnosis, red_flags) strictly in {lang_name} using the native script. For greetings, translate the greeting message into the chosen language ({lang_name}) using the native script (e.g. for Hindi, translate 'Namaste! I am SehatMitra...' to Hindi).
        """
        
        try:
            from app.services.inference_service import inference_manager
            res = await inference_manager.get_triage_decision(system_prompt=system_prompt, chat_history=dialogue_history)
            
            # Determine risk level from state/red_flags
            risk_level = "low"
            if res.state == "emergency":
                risk_level = "emergency"
            elif res.red_flags:
                risk_level = "high"
            elif res.state == "completed":
                risk_level = "moderate"
                
            primary_diag = res.differential_diagnosis[0] if res.differential_diagnosis else "Under clinical evaluation"
            if is_hi and primary_diag == "Under clinical evaluation":
                primary_diag = "चिकित्सीय मूल्यांकन के अंतर्गत"
            
            # Build reasons and remedies lists
            reasons = [res.summary] if res.summary else ["Symptom evaluation completed."]
            remedies = [res.recommended_action] if res.recommended_action else []
            
            return {
                "risk_level": risk_level,
                "primary_diagnosis": primary_diag,
                "reasons": reasons,
                "remedies": remedies,
                "red_flags": res.red_flags or [],
                "recommendation": res.recommended_action or "Consult nearby healthcare facility.",
                "disclaimer": "This is an AI-assisted triage evaluation, not a definitive diagnosis.",
                "doctor_reply": res.next_question or res.summary or "",
                "doctor_message": res.next_question or res.summary or "",
                "is_interview_complete": res.state in ["completed", "emergency"]
            }
        except Exception as e:
            print(f"[TriageService] ClinicalInferenceManager execution failed: {e}. Falling back to defensive clinical rule-based triage.")
                
        # Defensive Fallback Clinical Rule-based System
        detected_lower = [str(val).lower() for val in detected]
        has_emergency_sym = any(s in detected_lower for s in ["chest pain", "difficulty breathing", "severe bleeding", "unconsciousness", "severe abdominal pain"])
        has_high_sym = any(s in detected_lower for s in ["fever", "pain", "comorbidity"])
        
        has_comorbidity = patient_history and len(patient_history.get("chronic_conditions", [])) > 0
        
        if has_emergency_sym:
            risk_level = "emergency"
            if is_hi:
                primary_diagnosis = "आपातकालीन चिकित्सा स्थिति (जैसे तीव्र छाती का दर्द / सांस लेने में तकलीफ)"
                reasons = [
                    "गंभीर लक्षण पाए गए हैं जैसे कि सीने में दर्द या सांस लेने में असमर्थता।",
                    "संभावित रूप से तीव्र हृदय या फेफड़े की जटिलता का संकेत।",
                    "तत्काल अस्पताल में हस्तक्षेप की आवश्यकता।"
                ]
                remedies = [
                    "कोई घरेलू उपाय न करें, तुरंत आपातकालीन एम्बुलेंस को कॉल करें।",
                    "रोगी को शांत रखें और ढीले कपड़े पहनाएं।",
                    "यदि चिकित्सक द्वारा पहले से निर्धारित की गई हो तो एस्पिरिन/नाइट्रोग्लिसरीन दें।"
                ]
                red_flags = [
                    "नीले होंठ या चेहरा (ऑक्सीजन की कमी)",
                    "होश खोना या भ्रम होना",
                    "अत्यधिक पसीना आना और सांस लेने में गंभीर तकलीफ"
                ]
                recommendation = "कृपया तुरंत नजदीकी अस्पताल के आपातकालीन विभाग में जाएं या एम्बुलेंस बुलाएं।"
                disclaimer = "यह एक एआई-जनरेटेड आपातकालीन अलर्ट है। कृपया इसे पेशेवर चिकित्सा सलाह का विकल्प न समझें।"
            else:
                primary_diagnosis = "Emergency Medical Condition (e.g. Acute Chest Pain / Respiratory Distress)"
                reasons = [
                    "Critical symptoms detected indicating potential acute cardiorespiratory event.",
                    "High risk of complications requiring immediate advanced life support.",
                    "Symptom onset suggests urgent medical attention is vital."
                ]
                remedies = [
                    "Do not attempt home care. Contact emergency medical services immediately.",
                    "Keep the patient calm, sitting upright, and in well-ventilated space.",
                    "Administer prescribed emergency medication if previously directed by doctor."
                ]
                red_flags = [
                    "Cyanosis (bluish skin, lips, or nail beds)",
                    "Loss of consciousness or sudden confusion",
                    "Inability to speak in full sentences due to breathlessness"
                ]
                recommendation = "Please go to the nearest hospital Emergency Room or call ambulance services immediately."
                disclaimer = "Emergency: This is an automated AI triage assessment. Do not delay professional help."
        elif has_high_sym or has_comorbidity:
            risk_level = "high"
            if is_hi:
                primary_diagnosis = "तीव्र संक्रमण या अंतर्निहित बीमारी का बढ़ना"
                reasons = [
                    "लक्षणों में उच्च तापमान (बुखार) या गंभीर दर्द शामिल हैं।",
                    "अंतर्निहित बीमारियों (जैसे मधुमेह/उच्च रक्तचाप) के कारण जोखिम बढ़ गया है।",
                    "जटिलताओं से बचने के लिए शीघ्र डॉक्टर से परामर्श की आवश्यकता।"
                ]
                remedies = [
                    "खूब सारा आराम करें और शरीर को हाइड्रेटेड रखें (गुनगुना पानी पिएं)।",
                    "बुखार कम करने के लिए ठंडे पानी की पट्टियां सिर पर रखें।",
                    "हल्का और सुपाच्य भोजन लें।"
                ]
                red_flags = [
                    "बुखार का 103°F से अधिक होना",
                    "तीव्र सिरदर्द या गर्दन में अकड़न",
                    "24 घंटे से अधिक समय तक लगातार उल्टी होना"
                ]
                recommendation = "कृपया अगले 12 से 24 घंटों के भीतर किसी डॉक्टर/क्लीनिक से परामर्श लें।"
                disclaimer = "यह मूल्यांकन केवल मार्गदर्शन के लिए है। कृपया चिकित्सक की सलाह का पालन करें।"
            else:
                primary_diagnosis = "Acute Infection or Exacerbation of Underlying Illness"
                reasons = [
                    "Presence of system-wide symptoms like fever or acute pain.",
                    "Increased risk due to pre-existing chronic conditions/comorbidities.",
                    "Requires prompt medical evaluation to prevent progression."
                ]
                remedies = [
                    "Ensure adequate bed rest and high fluid intake.",
                    "Use tepid sponging to manage high fever.",
                    "Consume easy-to-digest, nutrient-dense meals."
                ]
                red_flags = [
                    "Fever exceeding 103°F (39.4°C) unresponsive to antipyretics",
                    "Severe headache accompanied by neck stiffness",
                    "Persistent vomiting preventing hydration for over 24 hours"
                ]
                recommendation = "Please consult a healthcare professional within the next 12-24 hours."
                disclaimer = "This is an AI screening tool for educational purposes. Consult a doctor for diagnostic confirmation."
        else:
            risk_level = "low" if not detected else "moderate"
            if is_hi:
                primary_diagnosis = "सौम्य वायरल बीमारी या सामान्य थकान"
                reasons = [
                    "कोई गंभीर या आपातकालीन लक्षण नहीं पाए गए हैं।",
                    "लक्षण सामान्य वायरल फ्लू या शारीरिक थकान से मेल खाते हैं।",
                    "आराम और स्व-देखभाल से ठीक होने की उच्च संभावना।"
                ]
                remedies = [
                    "पर्याप्त आराम करें और गर्म तरल पदार्थ (जैसे सूप, काढ़ा) लें।",
                    "गले में खराश के लिए नमक के पानी से गरारे करें।",
                    "गर्म पानी से भाप लें।"
                ]
                red_flags = [
                    "लक्षणों का 5 दिनों से अधिक समय तक बने रहना",
                    "अचानक सांस लेने में तकलीफ होना",
                    "थकान का अत्यधिक बढ़ जाना"
                ]
                recommendation = "घर पर आराम करें और स्व-देखभाल के उपायों का पालन करें। यदि लक्षण 3 दिन में न सुधरें तो डॉक्टर को दिखाएं।"
                disclaimer = "यह जानकारी केवल स्वास्थ्य शिक्षा के लिए है। चिकित्सा निदान के लिए डॉक्टर से मिलें।"
            else:
                primary_diagnosis = "Mild Viral Syndrome or General Fatigue"
                reasons = [
                    "No red-flag or critical symptoms identified in the assessment.",
                    "Symptoms match typical low-grade viral illness or muscle strain.",
                    "High likelihood of self-resolution with proper rest."
                ]
                remedies = [
                    "Get full rest and consume warm fluids (like herbal teas or soups).",
                    "Gargle with warm salt water if throat discomfort is present.",
                    "Inhale steam for nasal congestion relief."
                ]
                red_flags = [
                    "Symptoms persisting or worsening after 5 days",
                    "Development of high fever or breathing difficulty",
                    "Signs of dehydration like dark urine or dizziness"
                ]
                recommendation = "Manage symptoms at home with rest. Seek professional advice if condition doesn't improve in 3 days."
                disclaimer = "This educational summary is not a substitute for clinical diagnostics. Consult a doctor if symptoms persist."
                
        return {
            "risk_level": risk_level,
            "primary_diagnosis": primary_diagnosis,
            "reasons": reasons,
            "remedies": remedies,
            "red_flags": red_flags,
            "recommendation": recommendation,
            "disclaimer": disclaimer,
            "doctor_reply": "I have completed the risk assessment based on your symptoms." if not is_hi else "मैंने आपके लक्षणों के आधार पर जोखिम मूल्यांकन पूरा कर लिया है।"
        }

    @staticmethod
    async def perform_dual_ai_triage(request: TriageRequest) -> TriageResponse:
        # Resolve language name for prompt injection
        lang_map = {
            "en": "English",
            "hi": "Hindi",
            "pa": "Punjabi",
            "bn": "Bengali",
            "ta": "Tamil",
            "te": "Telugu",
            "mr": "Marathi",
            "gu": "Gujarati",
            "kn": "Kannada",
            "ml": "Malayalam",
            "or": "Odia",
            "ur": "Urdu"
        }
        language_name = lang_map.get(request.language.lower()[:2], "English")

        # Compile message history (limit to last 14 turns to preserve multi-turn clinical context)
        messages = []
        if request.history:
            for msg in request.history[-14:]:
                messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": request.message})

        # Calculate current turn/step dynamically
        user_msg_count = sum(1 for m in request.history if m.role == "user") if request.history else 0
        current_step = user_msg_count + 1

        CLINICAL_INTAKE_SYSTEM_PROMPT = f"""
        You are SehatMitra-AI, an empathetic, thorough clinical intake assistant.
        Your goal is to conduct a systematic, multi-turn clinical interview by asking ONE focused diagnostic follow-up question at a time (e.g., pain scale 0-10, duration, onset, exact location, or red flags) to gather details on the patient's symptoms.
        
        CURRENT TURN NUMBER: {current_step}
        
        DYNAMIC INTERVIEW COMPLEXITY & COMPLETION RULES:
        - You must dynamically control when the interview is complete by setting "is_interview_complete" to true or false:
          - Emergency cases (e.g. chest pain, severe shortness of breath, sudden numbness, anaphylaxis): Short-circuit immediately, asking only 1-2 questions to establish key parameters before concluding. Set "is_interview_complete" to true.
          - Standard/Simple cases (e.g. mild cold, simple cut, localized rash): Ask 3-5 questions before concluding and setting "is_interview_complete" to true.
          - Complex/Vague cases (e.g. chronic pain, multiple systemic symptoms, or vague complaints): Ask 8-14+ questions, continuing to clarify all clinical parameters (SOCRATES framework: Site, Onset, Character, Radiation, Associations, Time course, Exacerbating/Relieving factors, Severity) and red flags, before setting "is_interview_complete" to true.
        - While "is_interview_complete" is false, set "recommendation" to "" and "doctor_checklist" to [].
        - Once "is_interview_complete" is true, conclude the assessment in "conversational_reply" and fully populate the final "recommendation" and "doctor_checklist".
        - On every turn, set "current_step" to {current_step}, and "collected_points" to a list of clinical points gathered so far.
        
        INTERVIEW STYLE:
        - Be warm, supportive, and clinical.
        - Ask ONLY ONE focused question per turn in "conversational_reply" to avoid overwhelming the patient.
        - In "reasons", maintain a cumulative, detailed clinical summary of the patient's case (e.g. "The patient reports a dull headache starting yesterday. Pain is rated 7/10."). Do not discard details from previous turns.
        
        CLINICAL URGENCY:
        - Assess the urgency of symptoms:
          - Emergency: Chest pain, severe breathlessness, unconsciousness, severe bleeding, or anaphylaxis.
          - High: Worsening fever with stiff neck, severe localized pain, pre-existing comorbidities (diabetes, asthma) with worsening symptoms.
          - Medium: Moderate fever, persistent cough, minor infections, moderate pain.
          - Low: Mild symptoms, common cold, minor cuts, fatigue, normal viral symptoms.
        - Recommend the correct specialist (e.g., Cardiologist, Pulmonologist, General Physician, Pediatrician, Dermatologist).
        - Create a doctor checklist of 3-5 critical diagnostic questions or check-boxes for the clinical team/patient to verify.
        
        GREETINGS & CASUAL INPUTS:
        - If the patient message is a greeting (e.g., "hi", "hello", "hlo", "namaste") or casual chat without symptoms, respond naturally in "conversational_reply", set "is_clinical_triage" to false, "clinical_summary" to "", "reasons" to [], "risk_level" to "Low", "doctor_checklist" to [], "recommended_specialist" to "", "interview_status" to "in_progress", and "is_interview_complete" to false.
        
        CRITICAL LOCALIZATION INSTRUCTION:
        - The requested language is: {language_name}.
        - You MUST translate the `conversational_reply`, `clinical_summary`, `reasons`, `recommendation`, `recommended_specialist`, `doctor_checklist` items, and `disclaimer` into {language_name} using the native script.
        - The JSON keys must remain in English as defined below.
        
        STRICT JSON OUTPUT SCHEMA:
        You must output a valid JSON object. Do not include any other text. Here is the JSON schema:
        {{
          "conversational_reply": "ONE focused diagnostic follow-up question in patient's language, or welcoming message if greeting",
          "clinical_summary": "Clinical summary of symptoms in patient's language, or empty string if no symptoms are described yet",
          "is_clinical_triage": true | false,
          "risk_level": "Low" | "Medium" | "High" | "Emergency",
          "reasons": ["Cumulative clinical summary line 1", "Cumulative clinical summary line 2"],
          "recommendation": "Practical home guidance and detailed red-flag warnings in patient's language (leave empty string \"\" if is_interview_complete is false)",
          "doctor_checklist": ["checklist item 1 in patient's language", "checklist item 2 in patient's language"] (or empty list [] if is_interview_complete is false),
          "recommended_specialist": "Recommended specialist name in patient's language" (or empty string "" if is_clinical_triage is false),
          "disclaimer": "AI triage disclaimer in patient's language",
          "interview_status": "in_progress" | "completed",
          "current_step": {current_step},
          "collected_points": ["point 1", "point 2"],
          "is_interview_complete": true | false
        }}
        """

        parsed = None
        engine = None

        # 1. Primary Inference: Groq LPU with dynamic model discovery
        groq_client = get_groq_client()
        if groq_client:
            models_to_try = [
                'openai/gpt-oss-120b',
                'openai/gpt-oss-20b',
                'qwen/qwen3.6-27b'
            ]
            try:
                # Dynamic discovery
                print("[TriageService] Fetching dynamic Groq models list...")
                groq_models = await groq_client.models.list()
                exclusions = ['guard', 'whisper', 'safeguard', 'embedding', 'prompt-guard']
                discovered_ids = []
                for m in groq_models.data:
                    m_id_lower = m.id.lower()
                    if not any(ex in m_id_lower for ex in exclusions):
                        if any(inc in m_id_lower for inc in ["llama", "mixtral", "gemma", "gpt-oss", "qwen"]):
                            discovered_ids.append(m.id)
                if discovered_ids:
                    models_to_try = discovered_ids + [m for m in models_to_try if m not in discovered_ids]
                    print(f"[TriageService] Discovered Groq models: {discovered_ids}")
            except Exception as list_err:
                print(f"[TriageService] Groq model listing failed: {list_err}. Using default list.")

            for model_name in models_to_try:
                try:
                    print(f"[TriageService] Trying Groq model: {model_name}")
                    response = await groq_client.chat.completions.create(
                        model=model_name,
                        messages=[
                            {"role": "system", "content": CLINICAL_INTAKE_SYSTEM_PROMPT},
                            *messages
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.65,
                        max_tokens=1200,
                        timeout=15.0
                    )
                    raw_content = response.choices[0].message.content
                    parsed = clean_json_response(raw_content)
                    engine = "groq"
                    print(f"[TriageService] Groq success on {model_name}")
                    break
                except Exception as e:
                    print(f"[TriageService] Groq primary execution failed on {model_name}: {type(e).__name__}: {e}")
                    traceback.print_exc()

        # 2. Fallback Failover: Google GenAI Client
        if not parsed:
            gemini_client = get_gemini_client_new()
            if gemini_client:
                gemini_models = [
                    "gemini-3.6-flash", 
                    "gemini-3.5-flash", 
                    "gemini-flash-latest"
                ]
                for gemini_model_name in gemini_models:
                    try:
                        print(f"[TriageService] Trying Gemini fallback model (Async GenAI SDK): {gemini_model_name}")
                        # Build contents for new GenAI SDK
                        genai_contents = []
                        for msg in messages:
                            role = "user" if msg["role"] == "user" else "model"
                            genai_contents.append(
                                types.Content(
                                    role=role,
                                    parts=[types.Part.from_text(text=msg["content"])]
                                )
                            )

                        response = await gemini_client.aio.models.generate_content(
                            model=gemini_model_name,
                            contents=genai_contents,
                            config=types.GenerateContentConfig(
                                response_mime_type="application/json",
                                system_instruction=CLINICAL_INTAKE_SYSTEM_PROMPT
                            )
                        )
                        raw_content = response.text.strip()
                        parsed = clean_json_response(raw_content)
                        engine = "gemini_fallback"
                        print(f"[TriageService] Gemini fallback success on {gemini_model_name}")
                        break
                    except Exception as gemini_err:
                        print(f"[TriageService] Gemini fallback execution failed on {gemini_model_name}: {type(gemini_err).__name__}: {gemini_err}")
                        traceback.print_exc()

        # 3. Intelligent Deterministic Clinical Engine (Active when cloud LLM is offline or unconfigured)
        if not parsed:
            engine = "rule_based_clinical_engine"
            parsed = TriageService._generate_clinical_rule_triage(
                request_message=request.message,
                history=messages,
                language_code=request.language.lower()[:2],
                language_name=language_name,
                current_step=current_step
            )

        try:
            # Norm / Validate risk levels
            r_level = parsed.get("risk_level", "Medium").strip().capitalize()
            if r_level not in ["Low", "Medium", "High", "Emergency"]:
                if r_level.lower() == "moderate":
                    r_level = "Medium"
                else:
                    r_level = "Medium"

            is_triage = parsed.get("is_clinical_triage", True)
            is_complete = parsed.get("is_interview_complete") or (parsed.get("interview_status") == "completed") or (current_step >= 4) or False
            
            reasons_list = parsed.get("reasons") or [parsed.get("clinical_summary", "Clinical intake recorded.")]
            if not isinstance(reasons_list, list):
                reasons_list = [str(reasons_list)]

            checklist_list = parsed.get("doctor_checklist") or [
                "Verify vitals (BP, SpO2, Pulse, Temp)",
                "Physical examination of affected region",
                "Review history of allergies and current medications"
            ]

            rec_specialist = parsed.get("recommended_specialist", "General Physician")
            rec_text = parsed.get("recommendation") or f"Please consult a {rec_specialist} for formal clinical evaluation."
            reply_text = parsed.get("conversational_reply") or parsed.get("message") or parsed.get("clinical_summary") or "Please describe any additional symptoms."

            return TriageResponse(
                clinical_summary=parsed.get("clinical_summary", "Clinical symptom assessment conducted."),
                risk_level=r_level,
                doctor_checklist=checklist_list,
                recommended_specialist=rec_specialist,
                disclaimer=parsed.get("disclaimer", "Disclaimer: AI-assisted triage evaluation. Consult a doctor for definitive medical advice."),
                engine_used=engine or "clinical_engine",
                message=reply_text,
                has_symptoms=is_triage,
                reply=reply_text,
                is_clinical_triage=is_triage,
                reasons=[r for r in reasons_list if r and str(r).strip()],
                recommendation=rec_text,
                interview_status="completed" if is_complete else "in_progress",
                current_step=int(parsed.get("current_step") or current_step),
                total_steps=int(parsed.get("total_steps") or 4),
                collected_points=parsed.get("collected_points") or [request.message],
                is_interview_complete=is_complete
            )
        except Exception as norm_err:
            print(f"[TriageService] Critical normalization fallback error: {norm_err}")
            traceback.print_exc()
            return TriageResponse(
                clinical_summary=f"Clinical analysis: {request.message}",
                risk_level="Medium",
                doctor_checklist=["Verify vitals (BP, Temperature, Pulse)", "Review symptoms manually with patient"],
                recommended_specialist="General Physician",
                disclaimer="AI clinical intake support. Seek physical doctor examination.",
                engine_used="safe_clinical_fallback",
                message=f"I have recorded: '{request.message}'. Do you have any other symptoms like fever or pain?",
                has_symptoms=True,
                reply=f"I have recorded: '{request.message}'. Do you have any other symptoms like fever or pain?",
                is_clinical_triage=True,
                reasons=[f"Reported symptom: {request.message}"],
                recommendation="Please consult the nearest Primary Health Centre (PHC) or Community Clinic.",
                interview_status="in_progress",
                current_step=current_step,
                collected_points=[request.message],
                is_interview_complete=False
            )

    @staticmethod
    def _generate_clinical_rule_triage(
        request_message: str,
        history: List[dict],
        language_code: str,
        language_name: str,
        current_step: int
    ) -> dict:
        # Collect all user messages
        user_texts = [m["content"] for m in history if m.get("role") == "user"]
        combined_text = " ".join(user_texts).lower()
        latest_text = request_message.lower()

        # Emergency keywords
        emergency_kw = [
            "chest pain", "breathless", "difficulty breathing", "heart attack", "unconscious",
            "stroke", "paralysis", "severe bleeding", "cyanosis", "सीने में दर्द", "सांस", "ਬੇਹੋਸ਼",
            "ਛਾਤੀ", "రక్తస్రావం", "மூச்சுத்திணறல்"
        ]
        is_emergency = any(k in combined_text for k in emergency_kw)

        # High risk keywords
        high_kw = [
            "high fever", "103", "104", "vomiting blood", "stiff neck", "severe pain",
            "diabetes", "asthma", "pregnancy", "तेज़ बुखार", "उल्टी", "ਅਸਥਮਾ", "ਸ਼ੂਗਰ"
        ]
        is_high = any(k in combined_text for k in high_kw)

        # Symptom domains
        is_fever = any(k in combined_text for k in ["fever", "temp", "cold", "बुखार", "ताप", "ਜਵਰ", "તાવ", "জ্বর", "జ్వరం", "காய்ச்சல்"])
        is_resp = any(k in combined_text for k in ["cough", "throat", "sore", "phlegm", "खांसी", "गला", "ਖੰਘ", "இருமல்", "దగ్గు"])
        is_headache = any(k in combined_text for k in ["headache", "migraine", "head pain", "सिरदर्द", "ਸਿਰ ਦਰਦ", "தலைவலி", "తలనొప్పి"])
        is_stomach = any(k in combined_text for k in ["stomach", "abdomen", "vomit", "diarrhea", "लूज मोशन", "पेट दर्द", "ਉਲਟੀ", "വയറുവേദന"])

        # Determine risk level
        if is_emergency:
            risk_level = "Emergency"
        elif is_high:
            risk_level = "High"
        elif is_fever or is_headache or is_stomach:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        # Determine if completed: Emergency reaches conclusion by step 2, normal by step 3 or 4
        is_complete = (is_emergency and current_step >= 2) or (current_step >= 3)

        # Multi-turn Questions based on step and language
        q_map = {
            "hi": {
                "step1": "यह लक्षण कब से शुरू हुआ है और क्या आपको हल्का या तेज़ बुखार भी है?",
                "step2": "1 से 10 के पैमाने पर दर्द या तकलीफ की तीव्रता कितनी है? क्या आराम करने से सुधार होता है?",
                "step3": "क्या आपको सांस लेने में परेशानी, चक्कर आना या पहले से मधुमेह/बीपी की कोई बीमारी है?",
                "complete": "आपके लक्षणों का क्लिनिकल मूल्यांकन पूरा हो गया है। कृपया नीचे दी गई डॉक्टर पर्ची और सलाह देखें।",
                "emergency": "चेतावनी: आपके लक्षण तीव्र आपातकाल का संकेत दे सकते हैं। कृपया तुरंत नजदीकी अस्पताल के आपातकालीन विभाग में जाएं या 108 एम्बुलेंस को कॉल करें।",
                "summary": f"रोगी ने '{request_message}' की शिकायत दर्ज की है। प्राथमिक जांच पूरी की गई।",
                "recs": "पर्याप्त आराम करें, स्वच्छ गुनगुना पानी पिएं और नजदीकी प्राथमिक स्वास्थ्य केंद्र (PHC) से परामर्श लें।",
                "specialist": "जनरल फिजिशियन / चिकित्सा अधिकारी" if not is_emergency else "आपातकालीन चिकित्सा विशेषज्ञ (Cardiologist/Emergency)",
                "checklist": [
                    "रक्तचाप (BP), पल्स और SpO2 ऑक्सीजन स्तर की जांच करें",
                    "तापमान थर्मामीटर से मापें",
                    "यदि 24 घंटे में लक्षण न सुधरें तो डॉक्टर से सीधे मिलें"
                ]
            },
            "pa": {
                "step1": "ਇਹ ਲੱਛਣ ਕਿੰਨੇ ਦਿਨਾਂ ਤੋਂ ਹੈ ਅਤੇ ਕੀ ਤੁਹਾਨੂੰ ਬੁਖ਼ਾਰ ਜਾਂ ਕੰਬਣੀ ਵੀ ਮਹਿਸੂਸ ਹੋ ਰਹੀ ਹੈ?",
                "step2": "ਤਕਲੀਫ਼ ਦੀ ਗੰਭੀਰਤਾ ਕਿੰਨੀ ਹੈ? ਕੀ ਕੋਈ ਦਵਾਈ ਲੈਣ ਨਾਲ ਰਾਹਤ ਮਿਲੀ ਹੈ?",
                "step3": "ਕੀ ਤੁਹਾਨੂੰ ਸਾਹ ਲੈਣ ਵਿੱਚ ਔਖ, ਚੱਕਰ ਆਉਣ ਜਾਂ ਕੋਈ ਪੁਰਾਣੀ ਬਿਮਾਰੀ (ਸ਼ੂਗਰ/ਬੀਪੀ) ਹੈ?",
                "complete": "ਤੁਹਾਡੇ ਲੱਛਣਾਂ ਦਾ ਮੁਲਾਂਕਣ ਪੂਰਾ ਹੋ ਗਿਆ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਹੇਠਾਂ ਦਿੱਤੀ ਡਾਕਟਰ ਸਲਿੱਪ ਵੇਖੋ।",
                "emergency": "ਜ਼ਰੂਰੀ ਚੇਤਾਵਨੀ: ਲੱਛਣ ਐਮਰਜੈਂਸੀ ਦਾ ਸੰਕੇਤ ਦਿੰਦੇ ਹਨ। ਕਿਰਪਾ ਕਰਕੇ ਤੁਰੰਤ ਨਜ਼ਦੀਕੀ ਹਸਪਤਾਲ ਜਾਓ ਜਾਂ 108 ਐਂਬੂਲੈਂਸ ਬੁਲਾਓ।",
                "summary": f"ਮਰੀਜ਼ ਵੱਲੋਂ '{request_message}' ਦੇ ਲੱਛਣ ਦਰਜ ਕੀਤੇ ਗਏ ਹਨ।",
                "recs": "ਪੂਰਾ ਆਰਾਮ ਕਰੋ, ਤਰਲ ਪਦਾਰਥ ਲਓ ਅਤੇ ਨਜ਼ਦੀਕੀ ਸਰਕਾਰੀ ਹਸਪਤਾਲ ਜਾਂ ਕਲੀਨਿਕ ਵਿਖੇ ਜਾਂਚ ਕਰਵਾਓ।",
                "specialist": "ਜਨਰਲ ਫਿਜ਼ੀਸ਼ੀਅਨ" if not is_emergency else "ਐਮਰਜੈਂਸੀ ਮੈਡੀਕਲ ਅਫਸਰ",
                "checklist": [
                    "ਬਲੱਡ ਪ੍ਰੈਸ਼ਰ ਅਤੇ ਨਬਜ਼ ਦੀ ਜਾਂਚ",
                    "ਤਾਪਮਾਨ ਨੋਟ ਕਰੋ",
                    "ਲੋੜ ਪੈਣ 'ਤੇ ਮੁੱਢਲੀ ਜਾਂਚ ਟੈਸਟ ਕਰਵਾਓ"
                ]
            },
            "bn": {
                "step1": "এই উপসর্গটি কতদিন ধরে অনুভব করছেন এবং এর সাথে কি জ্বর বা কাঁপুনি আছে?",
                "step2": "অসুস্থতার তীব্রতা কেমন? কোনো ওষুধে কি উপশম হচ্ছে?",
                "step3": "শ্বাসকষ্ট, বুকে চাপ বা কোনো দীর্ঘস্থায়ী রোগ (ডায়াবেটিস/উচ্চ রক্তচাপ) আছে কি?",
                "complete": "উপসর্গ মূল্যায়ন সম্পন্ন হয়েছে। অনুগ্রহ করে ডাক্তারের পরামর্শ ও প্রেসক্রিপশন স্লিপ দেখুন।",
                "emergency": "জরুরি সতর্কতা: অবিলম্বে নিকটস্থ হাসপাতালে যোগাযোগ করুন বা জরুরি অ্যাম্বুলেন্স ডাকুন।",
                "summary": f"রোগীর প্রাথমিক উপসর্গ: '{request_message}' নথিভুক্ত করা হয়েছে।",
                "recs": "পর্যাপ্ত বিশ্রাম নিন, প্রচুর জল পান করুন এবং চিকিৎসকের পরামর্শ নিন।",
                "specialist": "জেনারেল ফিজিশিয়ান" if not is_emergency else "জরুরি বিভাগীয় চিকিৎসক",
                "checklist": ["রক্তচাপ ও নাড়ির গতি পরিমাপ", "শরীরের তাপমাত্রা পরীক্ষা", "জরুরি ওষুধ পর্যালোচনা"]
            },
            "en": {
                "step1": "When did these symptoms first start, and are you also experiencing any fever or chills?",
                "step2": "On a scale of 1 to 10, how severe is your discomfort, and does resting make it better or worse?",
                "step3": "Do you have any associated shortness of breath, dizziness, or pre-existing conditions like diabetes/hypertension?",
                "complete": "Your clinical symptom intake is complete. Please review your provisional clinical summary and doctor slip on the right.",
                "emergency": "EMERGENCY ALERT: Your reported symptoms indicate potential acute distress. Please proceed to the nearest Emergency Room or call 108 immediately.",
                "summary": f"Patient reports chief complaint of '{request_message}'. Systematic intake evaluation conducted.",
                "recs": "Maintain adequate hydration, get complete rest, and consult a medical officer at your nearest Primary Health Centre.",
                "specialist": "General Physician / Medical Officer" if not is_emergency else "Emergency Medicine Specialist / Cardiologist",
                "checklist": [
                    "Measure vital signs (Blood Pressure, Heart Rate, SpO2, Temperature)",
                    "Physical examination of the primary complaint site",
                    "Conduct baseline lab screening if symptoms persist over 48 hours"
                ]
            }
        }

        lang_data = q_map.get(language_code, q_map["en"])

        if is_emergency:
            conversational_reply = lang_data["emergency"]
        elif is_complete:
            conversational_reply = lang_data["complete"]
        elif current_step == 1:
            conversational_reply = lang_data["step1"]
        elif current_step == 2:
            conversational_reply = lang_data["step2"]
        else:
            conversational_reply = lang_data["step3"]

        collected_pts = [f"Turn #{i+1}: {txt}" for i, txt in enumerate(user_texts)]

        return {
            "conversational_reply": conversational_reply,
            "clinical_summary": lang_data["summary"],
            "is_clinical_triage": True,
            "risk_level": risk_level,
            "reasons": [
                f"Chief complaint: {request_message}",
                f"Symptom profile: {', '.join(user_texts[-3:])}",
                f"Clinical classification: {risk_level} Priority"
            ],
            "recommendation": lang_data["recs"],
            "doctor_checklist": lang_data["checklist"],
            "recommended_specialist": lang_data["specialist"],
            "disclaimer": "AI Triage Clinical Assistant. Always consult a verified medical professional.",
            "interview_status": "completed" if is_complete else "in_progress",
            "current_step": current_step,
            "total_steps": 3 if not is_emergency else 2,
            "collected_points": collected_pts,
            "is_interview_complete": is_complete
        }


