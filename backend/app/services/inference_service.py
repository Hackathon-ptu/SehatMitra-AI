import asyncio
import json
from typing import Optional, List
from pydantic import BaseModel
from app.core.config import settings

import logging

logger = logging.getLogger(__name__)

class TriageResponse(BaseModel):
    state: str  # 'interviewing', 'completed', 'emergency'
    next_question: Optional[str] = None
    differential_diagnosis: List[str] = []
    red_flags: List[str] = []
    summary: Optional[str] = None
    recommended_action: Optional[str] = None

class ClinicalInferenceManager:
    def __init__(self):
        self.groq_api_key = settings.GROQ_API_KEY
        self.groq_model = settings.GROQ_MODEL
        self.gemini_api_key = settings.GEMINI_API_KEY
        self.gemini_model = settings.GEMINI_MODEL
        
        # Lazy load client only when keys are set
        self._groq_client = None

    @property
    def groq_client(self):
        if not self._groq_client and self.groq_api_key:
            from groq import AsyncGroq
            self._groq_client = AsyncGroq(api_key=self.groq_api_key)
        return self._groq_client

    async def get_triage_decision(self, system_prompt: str, chat_history: List[dict]) -> TriageResponse:
        """
        Executes inference first on Groq. If it fails due to rate limits (429), timeouts,
        or server errors (5xx), falls back to Gemini.
        Returns a TriageResponse.
        """
        # Map message history format to API format
        # chat_history elements look like {"sender": "Patient"/"Doctor", "text": "..."}
        api_messages = []
        for msg in chat_history:
            role = "user" if msg.get("sender") == "Patient" else "assistant"
            api_messages.append({"role": role, "content": msg.get("text", "")})

        # 1. Primary Execution (Groq)
        if self.groq_client:
            models_to_try = [self.groq_model, "openai/gpt-oss-20b"]
            for model_name in models_to_try:
                try:
                    print(f"[ClinicalInferenceManager] Attempting Groq inference with model {model_name}")
                    response = await self.groq_client.chat.completions.create(
                        model=model_name,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            *api_messages
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.2,
                        timeout=20.0
                    )
                    raw_content = response.choices[0].message.content
                    print(f"[ClinicalInferenceManager] Groq success with {model_name}: {raw_content}")
                    parsed = json.loads(raw_content)
                    return TriageResponse(**parsed)
                except Exception as e:
                    logger.error(f"Groq failed on model {model_name}: {e}")

        # 2. Fallback Execution (Gemini)
        if self.gemini_api_key and self.gemini_api_key.strip():
            try:
                gemini_model = getattr(settings, "GEMINI_MODEL", "gemini-3.6-flash")
                print(f"[ClinicalInferenceManager] Triggering fallback: Gemini model {gemini_model}")
                from google import genai
                from google.genai import types
                client = genai.Client(api_key=self.gemini_api_key)
                
                gemini_contents = []
                for msg in api_messages:
                    role = "user" if msg["role"] == "user" else "model"
                    gemini_contents.append({"role": role, "parts": [{"text": msg["content"]}]})

                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: client.models.generate_content(
                        model=gemini_model,
                        contents=gemini_contents,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            system_instruction=system_prompt
                        )
                    )
                )
                raw_content = response.text.strip()
                print(f"[ClinicalInferenceManager] Gemini success: {raw_content}")
                parsed = json.loads(raw_content)
                return TriageResponse(**parsed)
            except Exception as e_gemini:
                logger.error(f"Gemini fallback failed: {e_gemini}")
        else:
            print("[ClinicalInferenceManager] Gemini API Key is empty or not configured. Skipping Gemini fallback.")
        
        # 3. Safe-Fail State
        print("[ClinicalInferenceManager] Both Groq and Gemini failed. Activating safe-fail state.")
        return TriageResponse(
            state="interviewing",
            next_question="Namaste! Humare AI service se connect hone me samasya aa rahi hai. Kripya apna lakshan dobara likhein ya backend configuration check karein.",
            red_flags=[],
            differential_diagnosis=[],
            summary="AI service offline mode."
        )

inference_manager = ClinicalInferenceManager()
