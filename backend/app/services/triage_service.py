import json
from typing import Optional, Dict, Any
from app.core.config import settings
from app.services.ai_service import get_gemini_client

class TriageService:
    @staticmethod
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

        prompt = f"""
        You are Dr. SehatMitra, an expert, empathetic rural triage physician.
        Your goal is to conduct a natural clinical interview (anamnesis) using medical protocols (OPQRST / SOCRATES).

        PATIENT CLINICAL DATA:
        - Exact Symptoms / Latest Message: "{user_input_summary}"
        - Patient Age: {age}
        - Patient Preferred Language: {lang_name}
        - Dialogue History:
        {history_str}
        {history_context}

        CLINICAL RULES:
        1. GREETINGS & SMALL TALK: If the patient greets you (e.g., "hi", "how are you", "namaste") or asks general questions without providing medical symptoms yet:
           - Welcome them warmly, state you are their SehatMitra health assistant, and ask what symptoms they are feeling today.
           - Set "is_interview_complete" to false.
           - Set "risk_level" to "assessing".
           - Set "provisional_diagnosis" to "Awaiting symptom description" (translated to {lang_name}).
           - Keep "clinical_reasons", "recommendations", and "red_flags" empty or default.
        2. MEDICAL INTERVIEW (Multi-turn):
           - When a symptom is mentioned (e.g. "chest pain", "fever", "headache"), DO NOT jump to conclusions immediately unless it is an obvious emergency.
           - Like a real physician, ask 1 to 2 sharp, targeted clinical questions in your `doctor_message` (e.g., onset duration, pain type/radiation, fever temperature, breathing difficulty, existing medical history) to gather complete information.
           - Set "is_interview_complete" to false.
           - Set "risk_level" to "assessing".
           - Set "provisional_diagnosis" to "Under clinical evaluation" (translated to {lang_name}).
        3. EMERGENCY DETECTION:
           - If red-flags appear (crushing chest pain + left arm/jaw radiation, severe dyspnea, sudden paralysis, altered mental status, active heavy bleeding), immediately set `risk_level` to "emergency" and `is_interview_complete` to true. Explain the urgency calmly in `doctor_message`, and recommend calling 108.
        4. DIAGNOSIS & COMPLETION:
           - Only when you have enough clinical details to form a reasonable assessment, set "is_interview_complete" to true and determine the "risk_level" (emergency, high, moderate, low).
        5. LANGUAGE: Always reply in the exact language used by the patient ({lang_name}). You MUST generate ALL conversational and report text fields (doctor_message, provisional_diagnosis, clinical_reasons, recommendations, red_flags) strictly in {lang_name} using the native script.

        STRICT JSON OUTPUT SCHEMA:
        {{
          "doctor_message": "Empathetic conversational response and focused follow-up question(s) in patient's language.",
          "is_interview_complete": false,
          "risk_level": "emergency" | "high" | "moderate" | "low" | "assessing",
          "provisional_diagnosis": "Clear medical term or 'Under clinical evaluation' in user's language",
          "clinical_reasons": ["Symptom 1 observed", "Clinical factor 2"],
          "recommendations": "Actionable home care advice or urgency instruction",
          "red_flags": ["Critical sign 1", "Critical sign 2"]
        }}
        """
        
        # Check Gemini Client
        client = get_gemini_client()
        if client:
            try:
                if hasattr(client, "models"):
                    response = client.models.generate_content(
                        model=settings.GEMINI_MODEL,
                        contents=[prompt]
                    )
                    raw_text = response.text.strip()
                else:
                    model = client.GenerativeModel(settings.GEMINI_MODEL)
                    response = model.generate_content([prompt])
                    raw_text = response.text.strip()
                
                parsed_res = extract_json_from_llm(raw_text)
                diagnosis = parsed_res.get("provisional_diagnosis", "Under clinical evaluation")
                doc_msg = parsed_res.get("doctor_message", "")
                recs = parsed_res.get("recommendations", "")
                reasons = parsed_res.get("clinical_reasons", [])
                rflags = parsed_res.get("red_flags", [])
                
                return {
                    "risk_level": parsed_res.get("risk_level", "assessing"),
                    "primary_diagnosis": diagnosis,
                    "reasons": reasons,
                    "remedies": [recs] if isinstance(recs, str) else recs,
                    "red_flags": rflags,
                    "recommendation": recs,
                    "disclaimer": "This is an AI-assisted triage evaluation, not a definitive diagnosis.",
                    "doctor_reply": doc_msg,
                    "doctor_message": doc_msg,
                    "is_interview_complete": parsed_res.get("is_interview_complete", False)
                }
            except Exception as e:
                print(f"Gemini error in triage service: {e}")

        # Check local Ollama
        import httpx

        try:
            ollama_url = "http://localhost:11434/api/generate"

            # Try granite3-dense:8b first, then llama3.1:8b
            models_to_try = ["granite3-dense:8b", "llama3.1:8b"]
            for model_name in models_to_try:
                try:
                    payload = {
                        "model": model_name,
                        "prompt": prompt,
                        "format": "json",
                        "stream": False,
                        "options": {
                            "num_predict": 220,
                            "temperature": 0.2
                        }
                    }
                    print(f"[Ollama] Attempting assessment with model: {model_name} (timeout: 30s)")
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        res = await client.post(ollama_url, json=payload)
                        if res.status_code == 200:
                            ollama_json = res.json()
                            response_str = ollama_json.get("response", "").strip()
                            print(f"[Ollama] Success with {model_name}. Raw output: {response_str}")
                            parsed_res = extract_json_from_llm(response_str)
                            diagnosis = parsed_res.get("provisional_diagnosis", "Under clinical evaluation")
                            doc_msg = parsed_res.get("doctor_message", "")
                            recs = parsed_res.get("recommendations", "")
                            reasons = parsed_res.get("clinical_reasons", [])
                            rflags = parsed_res.get("red_flags", [])
                            print(f"[OLLAMA SUCCESS] Diagnosis: {diagnosis} | Reply: {doc_msg}")
                            
                            return {
                                "risk_level": parsed_res.get("risk_level", "assessing"),
                                "primary_diagnosis": diagnosis,
                                "reasons": reasons,
                                "remedies": [recs] if isinstance(recs, str) else recs,
                                "red_flags": rflags,
                                "recommendation": recs,
                                "disclaimer": "This is an AI-assisted triage evaluation, not a definitive diagnosis.",
                                "doctor_reply": doc_msg,
                                "doctor_message": doc_msg,
                                "is_interview_complete": parsed_res.get("is_interview_complete", False)
                            }
                        else:
                            print(f"[Ollama] Model {model_name} returned status: {res.status_code}")
                except Exception as inner_e:
                    print(f"[Ollama] Model {model_name} failed: {inner_e}")
            
            raise Exception("All local Ollama models (granite3-dense:8b, llama3.1:8b) failed or timed out.")
        except Exception as e:
            import traceback
            print(f"[Ollama Exception] Triage API call failed: {e}")
            traceback.print_exc()
            print("[Triage Fallback] Falling back to clinical rule-based triage system...")
                
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
