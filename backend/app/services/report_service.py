import io
import re
import json
import logging
import base64
import asyncio
import random
import numpy as np
from PIL import Image, ImageOps
from google import genai
from google.genai import types
from google.genai.errors import APIError
from groq import Groq
from app.core.config import settings
from pydantic import BaseModel
from typing import List, Optional

try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass

logger = logging.getLogger(__name__)

# Pydantic Schemas to support response verification and formatting (kept for backward compatibility imports)
class BiomarkerInfo(BaseModel):
    name: str
    value: str
    unit: str
    reference_range: str
    status: str

class ReportAnalysisResponse(BaseModel):
    patient_name: Optional[str] = None
    test_date: Optional[str] = None
    report_type: Optional[str] = None
    biomarkers: List[BiomarkerInfo] = []
    critical_flags: List[str] = []
    patient_summary: str
    diet_lifestyle_tips: List[str] = []

CLINICAL_KNOWLEDGE = {
    "hemoglobin": {
        "low": "Suggests anemia. Recommend iron-rich diet (spinach, jaggery, lentils, beetroot) and Vitamin C.",
        "high": "Possible dehydration or polycythemia. Ensure adequate hydration."
    },
    "glucose": {
        "high": "Elevated blood sugar. Recommend glycemic control, physical activity, and HbA1c testing.",
        "low": "Hypoglycemia risk. Advise immediate fast-acting carbohydrates."
    },
    "sugar": {
        "high": "Elevated blood sugar. Advise dietary glycemic control and physical activity.",
        "low": "Hypoglycemia risk. Advise fast-acting carbs."
    },
    "platelet": {
        "low": "Thrombocytopenia. Monitor for bruising, bleeding, or viral symptoms (e.g., Dengue).",
        "high": "Possible reactive thrombocytosis or inflammatory condition."
    },
    "wbc": {
        "high": "Possible acute infection or inflammation.",
        "low": "Leukopenia, reduced immune defenses."
    },
    "lung": {
        "critical": "Abnormal radiological finding. Immediate clinical review required.",
        "high": "Opacity / consolidation noted. Assess for respiratory infection or pneumonia."
    },
    "fracture": {
        "critical": "Cortical disruption / fracture identified. Orthopedic immobilization advised."
    }
}

class ReportAnalysisService:
    def __init__(self):
        # Support single key or comma-separated list of keys for auto-rotation
        raw_keys = getattr(settings, "GEMINI_API_KEYS", "") or settings.GEMINI_API_KEY or ""
        self.api_keys = [k.strip() for k in raw_keys.split(",") if k.strip()]
        self.groq_key = settings.GROQ_API_KEY
        raw_model = getattr(settings, "GEMINI_MODEL", "gemini-3.6-flash") or "gemini-3.6-flash"
        self.gemini_model = raw_model.replace("models/", "").strip()

    def _convert_dicom_to_pil(self, file_bytes: bytes) -> Image.Image:
        import pydicom
        dicom_data = pydicom.dcmread(io.BytesIO(file_bytes))
        pixel_array = dicom_data.pixel_array.astype(float)
        rescaled = (np.maximum(pixel_array, 0) / pixel_array.max()) * 255.0
        return Image.fromarray(np.uint8(rescaled)).convert("RGB")

    def _clean_json(self, text: str) -> dict:
        text = text.strip()
        match = re.search(r'(\{.*\})', text, re.DOTALL)
        if match:
            text = match.group(1)
        try:
            return json.loads(text)
        except Exception:
            cleaned = re.sub(r'^```(?:json)?\s*', '', text, flags=re.MULTILINE)
            cleaned = re.sub(r'```\s*$', '', cleaned, flags=re.MULTILINE).strip()
            return json.loads(cleaned)

    async def analyze_report(self, file_bytes: bytes, filename: str = "", mime_type: str = "image/jpeg", language: str = "en") -> dict:
        if not self.api_keys:
            raise ValueError("No GEMINI_API_KEY configured in backend/.env")

        ext = filename.lower().split('.')[-1] if '.' in filename else ''
        is_pdf = 'pdf' in mime_type.lower() or ext == 'pdf'

        if ext in ['dcm', 'dicom'] or 'dicom' in mime_type.lower():
            img = self._convert_dicom_to_pil(file_bytes)
        elif not is_pdf:
            raw_img = Image.open(io.BytesIO(file_bytes))
            img = ImageOps.exif_transpose(raw_img)
            if img.mode != "RGB":
                img = img.convert("RGB")
        else:
            img = None

        prompt = """
        You are an expert diagnostic AI specializing in clinical pathology, radiology (X-Ray, CT, MRI), and prescriptions.
        Extract all measurable biomarkers, vitals, or clinical findings from this document into strictly valid JSON.
        
        Return ONLY a valid JSON object matching this schema:
        {
          "patient_name": "string or null",
          "test_date": "string or null",
          "report_type": "string (e.g. CBC / Chest X-Ray / AYUSH Consultation / Fasting Glucose)",
          "biomarkers": [
            {
              "name": "Parameter / Finding Name",
              "value": "Observed value or anatomical condition",
              "unit": "Unit if applicable or ''",
              "reference_range": "Normal range / Expected condition",
              "status": "normal" // "normal", "low", "high", or "critical"
            }
          ]
        }
        """

        raw_data = None
        last_error = None
        active_client = None

        # Rotate across configured Gemini API keys
        for key in self.api_keys:
            try:
                client = genai.Client(api_key=key)
                contents = [types.Part.from_bytes(data=file_bytes, mime_type="application/pdf")] if is_pdf else [img]
                contents.append(prompt)

                response = await self._generate_content_with_retry(
                    client=client,
                    model=self.gemini_model,
                    contents=contents,
                    config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0.1)
                )
                raw_data = self._clean_json(response.text or "{}")
                if raw_data:
                    active_client = client
                    break
            except Exception as e:
                logger.warning(f"Key failed with error: {e}. Rotating to next key...")
                last_error = e

        if not raw_data:
            raise RuntimeError(f"All Gemini API keys failed or rate-limited: {last_error}")

        # Step 2: RAG Guideline Enrichment
        enriched_notes = []
        critical_flags = []
        for marker in raw_data.get("biomarkers", []):
            name_lower = marker.get("name", "").lower()
            status = marker.get("status", "normal").lower()
            if status in ["low", "high", "critical"]:
                critical_flags.append(f"{marker.get('name')}: {marker.get('value')} ({status.upper()})")
                for k, guidelines in CLINICAL_KNOWLEDGE.items():
                    if k in name_lower and status in guidelines:
                        enriched_notes.append(guidelines[status])

        # Step 3: Fast Vernacular Summary
        summary_prompt = f"""
        You are SehatMitra-AI, a compassionate rural medical assistant.
        Explain these clinical findings to the patient in simple, reassuring {language}.
        Medical Data: {json.dumps(raw_data)}
        Clinical Reference Notes: {json.dumps(enriched_notes)}

        Return strictly valid JSON:
        {{
          "patient_summary": "Clear, reassuring 2-3 sentence overview in {language}.",
          "diet_lifestyle_tips": ["Actionable tip 1", "Actionable tip 2"]
        }}
        """

        summary_data = await self._generate_summary(summary_prompt, active_client)

        return {
            "patient_name": raw_data.get("patient_name") or "Patient",
            "test_date": raw_data.get("test_date") or "Recent",
            "report_type": raw_data.get("report_type") or "Diagnostic Analysis",
            "biomarkers": raw_data.get("biomarkers", []),
            "critical_flags": critical_flags,
            "patient_summary": summary_data.get("patient_summary", "Diagnostic analysis complete."),
            "diet_lifestyle_tips": summary_data.get("diet_lifestyle_tips", [])
        }

    async def _generate_summary(self, prompt: str, gemini_client) -> dict:
        if self.groq_key:
            try:
                groq_client = Groq(api_key=self.groq_key)
                res = groq_client.chat.completions.create(
                    model="openai/gpt-oss-120b",
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"},
                    temperature=0.2
                )
                return self._clean_json(res.choices[0].message.content)
            except Exception as e:
                logger.warning(f"Groq summary error ({e}), switching to Gemini fallback.")

        if gemini_client:
            try:
                res = await self._generate_content_with_retry(
                    client=gemini_client,
                    model=self.gemini_model,
                    contents=prompt,
                    config=types.GenerateContentConfig(response_mime_type="application/json")
                )
                return self._clean_json(res.text or "{}")
            except Exception:
                pass

        return {
            "patient_summary": "Medical record processed. Consult a healthcare provider for clinical review.",
            "diet_lifestyle_tips": ["Stay well-hydrated", "Follow prescribed regimen accurately"]
        }

    async def _generate_content_with_retry(self, client, model, contents, config=None):
        max_retries = 3
        delay = 1.0
        for attempt in range(max_retries + 1):
            try:
                if config:
                    response = client.models.generate_content(
                        model=model,
                        contents=contents,
                        config=config
                    )
                else:
                    response = client.models.generate_content(
                        model=model,
                        contents=contents
                    )
                return response
            except Exception as e:
                is_503 = False
                if isinstance(e, APIError) and e.code == 503:
                    is_503 = True
                elif "503" in str(e) or "UNAVAILABLE" in str(e).upper() or "SERVICE UNAVAILABLE" in str(e).upper():
                    is_503 = True
                elif getattr(e, "code", None) == 503 or getattr(e, "status_code", None) == 503 or getattr(e, "status", None) == 503:
                    is_503 = True

                if is_503 and attempt < max_retries:
                    sleep_time = delay + random.uniform(0, 0.1 * delay)
                    logger.warning(
                        f"Temporary 503 UNAVAILABLE spike on attempt {attempt + 1}. "
                        f"Retrying in {sleep_time:.2f} seconds..."
                    )
                    await asyncio.sleep(sleep_time)
                    delay *= 2.0
                else:
                    raise e

report_service = ReportAnalysisService()
# For backwards compatibility with old imports
report_analysis_service = report_service
