from typing import Optional, Dict, Any

class AIService:
    @staticmethod
    async def generate_chat_reply(message: str, language: str = "hi", session_id: Optional[int] = None) -> dict:
        # Mock implementation for IBM Granite / watsonx.ai integration
        if language == "hi":
            reply = f"नमस्ते! मुझे आपका संदेश मिला: '{message}'। मैं आपकी सहायता कैसे कर सकता हूँ?"
        else:
            reply = f"Hello! I received your message: '{message}'. How can I help you today?"
        
        return {
            "reply": reply,
            "session_id": session_id or 12345
        }

    @staticmethod
    def extract_symptoms(message: str) -> list:
        msg_lower = message.lower()
        symptoms = []
        
        fever_kw = ["bukhar", "fever", "tapman", "102", "101", "103", "temperature"]
        respiratory_kw = ["saans", "breath", "khansi", "cough", "phool rahi"]
        pain_kw = ["sar dard", "headache", "chhati", "chest pain", "dard", "body pain"]
        comorb_kw = ["sugar", "diabetes", "bp", "hypertension"]
        
        if any(kw in msg_lower for kw in fever_kw):
            symptoms.append("fever")
        if any(kw in msg_lower for kw in respiratory_kw):
            symptoms.append("cough/respiratory")
        if any(kw in msg_lower for kw in pain_kw):
            symptoms.append("pain")
        if any(kw in msg_lower for kw in comorb_kw):
            symptoms.append("comorbidity")
            
        return symptoms

    @staticmethod
    async def process_health_interview(session_id: Optional[int], user_message: str, language: str = "hi", existing_collected_data: Optional[dict] = None) -> dict:
        state = existing_collected_data or {}
        step = state.get("step", 1)
        prev_symptoms = state.get("detected_symptoms", [])
        
        current_detected = AIService.extract_symptoms(user_message)
        combined_symptoms = list(set(prev_symptoms + current_detected))
        
        is_completed = False
        next_question = ""
        
        if step == 1:
            next_question = "कितने दिनों से यह समस्या है और क्या सांस लेने में कठिनाई या बुखार है?"
            step = 2
        else:
            msg_lower = user_message.lower()
            duration_kw = ["day", "din", "week", "hafte", "se", "for", "since", "hour", "ghant", "month", "mahine", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]
            has_duration = any(kw in msg_lower for kw in duration_kw)
            has_fever_or_breathing = "fever" in combined_symptoms or "cough/respiratory" in combined_symptoms
            
            if has_duration and has_fever_or_breathing:
                next_question = "धन्यवाद। आपके लक्षणों का विश्लेषण पूरा हो गया है। कृपया रिस्क असेसमेंट देखें।"
                is_completed = True
            else:
                if step >= 3:
                    next_question = "धन्यवाद। आपके लक्षणों का विश्लेषण पूरा हो गया है। कृपया रिस्क असेसमेंट देखें।"
                    is_completed = True
                else:
                    next_question = "कृपया बताएं कितने दिनों से लक्षण हैं और क्या बुखार या सांस की तकलीफ है?"
                    step += 1
        
        collected_symptoms = {
            "step": step,
            "user_input_summary": user_message,
            "detected_symptoms": combined_symptoms,
            "severity_estimate": "high" if "fever" in combined_symptoms and "cough/respiratory" in combined_symptoms else "moderate"
        }
        
        return {
            "session_id": session_id or 98765,
            "next_question": next_question,
            "is_completed": is_completed,
            "collected_symptoms": collected_symptoms
        }

    @staticmethod
    async def evaluate_risk(session_id: int, symptoms_data: dict) -> dict:
        # Mock implementation for IBM Granite risk classification (low, moderate, high, emergency)
        detected = symptoms_data.get("detected_symptoms", [])
        
        if any(s in detected for s in ["chest pain", "difficulty breathing", "severe bleeding"]):
            risk_level = "emergency"
            reasons = ["Critical symptoms indicating severe distress (difficulty breathing/chest pain)."]
            recommendation = "Please seek immediate medical attention or call emergency services."
            disclaimer = "Emergency: This is an AI-generated warning. Do not delay professional help."
        else:
            risk_level = "moderate"
            reasons = ["Common symptoms detected including cough and fatigue without critical indicators."]
            recommendation = "Consult a general practitioner within 24-48 hours and rest."
            disclaimer = "This risk assessment is provided for educational and guidance purposes only."

        return {
            "risk_level": risk_level,
            "reasons": reasons,
            "recommendation": recommendation,
            "disclaimer": disclaimer
        }
