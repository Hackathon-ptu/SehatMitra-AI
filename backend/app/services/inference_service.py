import asyncio
import json
from typing import Optional, List
from pydantic import BaseModel
from app.core.config import settings

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

    async def get_triage_decision(self, prompt: str) -> TriageResponse:
        """
        Executes inference first on Groq. If it fails due to rate limits (429), timeouts,
        or server errors (5xx), falls back to Gemini.
        Returns a TriageResponse.
        """
        # 1. Primary Execution (Groq)
        if self.groq_client:
            try:
                print(f"[ClinicalInferenceManager] Attempting Groq inference with model {self.groq_model}")
                response = await self.groq_client.chat.completions.create(
                    model=self.groq_model,
                    messages=[
                        {"role": "system", "content": "You are a clinical AI agent. You must respond with valid JSON matching the requested schema."},
                        {"role": "user", "content": prompt}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.2,
                    timeout=20.0
                )
                raw_content = response.choices[0].message.content
                print(f"[ClinicalInferenceManager] Groq success: {raw_content}")
                parsed = json.loads(raw_content)
                return TriageResponse(**parsed)
            except Exception as e:
                import groq
                is_fallback_trigger = False
                
                # Check for rate limits, timeout, or server errors
                if isinstance(e, (groq.RateLimitError, groq.APITimeoutError, groq.InternalServerError)):
                    is_fallback_trigger = True
                elif hasattr(e, 'status_code') and (e.status_code == 429 or e.status_code >= 500):
                    is_fallback_trigger = True
                elif "timeout" in str(e).lower() or "rate limit" in str(e).lower():
                    is_fallback_trigger = True
                
                print(f"[ClinicalInferenceManager] Groq call failed. Error: {e}. Fallback triggered: {is_fallback_trigger}")
                if not is_fallback_trigger:
                    # For format or structural validation errors, we can also fall back or raise.
                    # Let's trigger fallback for robustness anyway.
                    is_fallback_trigger = True

        # 2. Fallback Execution (Gemini)
        if self.gemini_api_key:
            try:
                print(f"[ClinicalInferenceManager] Triggering fallback: Gemini model {self.gemini_model}")
                import google.generativeai as genai
                genai.configure(api_key=self.gemini_api_key)
                
                model = genai.GenerativeModel(
                    model_name=self.gemini_model,
                    generation_config={"response_mime_type": "application/json"}
                )
                
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: model.generate_content(prompt)
                )
                raw_content = response.text.strip()
                print(f"[ClinicalInferenceManager] Gemini success: {raw_content}")
                parsed = json.loads(raw_content)
                return TriageResponse(**parsed)
            except Exception as e_gemini:
                print(f"[ClinicalInferenceManager] Gemini fallback failed: {e_gemini}")
        
        # 3. Safe-Fail State
        print("[ClinicalInferenceManager] Both Groq and Gemini failed. Activating safe-fail state.")
        return TriageResponse(
            state="emergency",
            next_question=None,
            differential_diagnosis=["Critical Clinical Exception / System Error"],
            red_flags=["Potential life-threatening condition or system unavailability"],
            summary="Emergency: System was unable to process your request. Immediate medical evaluation is recommended.",
            recommended_action="Please call emergency services (108) immediately or visit the nearest healthcare facility."
        )

inference_manager = ClinicalInferenceManager()
