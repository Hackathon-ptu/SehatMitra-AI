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

        # 3. Handle parser fallback if both failed or returned invalid responses
        if not parsed:
            parsed = {
                "conversational_reply": "I'm sorry, I'm having trouble connecting to my primary clinical analysis models right now.",
                "clinical_summary": f"Dual-AI system analysis offline/error. Symptom recorded: {request.message}",
                "is_clinical_triage": False,
                "risk_level": "Low",
                "reasons": ["Service offline fallback"],
                "recommendation": "Consult physician for diagnosis.",
                "doctor_checklist": [],
                "recommended_specialist": "General Physician",
                "disclaimer": "This fallback summary is active due to AI endpoint timeouts.",
                "interview_status": "in_progress",
                "current_step": current_step,
                "collected_points": [],
                "is_interview_complete": False
            }
            engine = "gemini_fallback"  # Denoting service error mode as fallback outcome

        try:
            # Norm / Validate risk levels
            r_level = parsed.get("risk_level", "Medium").strip().capitalize()
            if r_level not in ["Low", "Medium", "High", "Emergency"]:
                if r_level.lower() == "moderate":
                    r_level = "Medium"
                else:
                    r_level = "Medium"

            is_triage = parsed.get("is_clinical_triage") or parsed.get("has_symptoms") or False
            is_complete = parsed.get("is_interview_complete") or (parsed.get("interview_status") == "completed") or False
            return TriageResponse(
                clinical_summary=parsed.get("clinical_summary", "Clinical assessment in progress."),
                risk_level=r_level,
                doctor_checklist=parsed.get("doctor_checklist") if is_complete else [],
                recommended_specialist=parsed.get("recommended_specialist", "General Physician"),
                disclaimer=parsed.get("disclaimer", "Disclaimer: AI assistant evaluation."),
                engine_used=engine or "fallback",
                message=parsed.get("conversational_reply") or parsed.get("message") or parsed.get("clinical_summary") or "",
                has_symptoms=is_triage,
                reply=parsed.get("conversational_reply") or parsed.get("message") or parsed.get("clinical_summary") or "",
                is_clinical_triage=is_triage,
                reasons=parsed.get("reasons") or [parsed.get("clinical_summary")] or [],
                recommendation=parsed.get("recommendation", "") if is_complete else "",
                interview_status="completed" if is_complete else "in_progress",
                current_step=int(parsed.get("current_step") or current_step),
                total_steps=int(parsed.get("total_steps") or 6),
                collected_points=parsed.get("collected_points") or [],
                is_interview_complete=is_complete
            )
        except Exception as norm_err:
            print(f"[TriageService] Critical normalization fallback error: {norm_err}")
            traceback.print_exc()
            return TriageResponse(
                clinical_summary=f"Clinical analysis currently in safe mode. Symptom recorded: {request.message}",
                risk_level="Medium",
                doctor_checklist=["Verify details manually with the patient", "Log symptom description"],
                recommended_specialist="General Physician",
                disclaimer="Safe clinical backup mode active.",
                engine_used="fallback",
                message=f"I recorded: {request.message}",
                has_symptoms=True,
                reply=f"I recorded: {request.message}",
                is_clinical_triage=True,
                reasons=["Safe mode backup evaluation"],
                recommendation="Please consult a clinician.",
                interview_status="in_progress",
                current_step=current_step,
                collected_points=[],
                is_interview_complete=False
            )

