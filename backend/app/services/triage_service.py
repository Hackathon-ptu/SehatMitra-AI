import json
from typing import Optional, Dict, Any
from app.core.config import settings
from app.services.ai_service import get_gemini_client

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
        if is_hi:
            lang_name = "Hindi"
        elif language.startswith("pa"):
            lang_name = "Punjabi"
        elif language.startswith("bn"):
            lang_name = "Bengali"
        elif language.startswith("ta"):
            lang_name = "Tamil"
        elif language.startswith("te"):
            lang_name = "Telugu"
 
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
