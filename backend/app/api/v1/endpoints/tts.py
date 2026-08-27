from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.services.tts_service import TTSService

router = APIRouter()

from typing import Optional

class TTSSpeakRequest(BaseModel):
    text: str
    language_code: Optional[str] = None
    language: Optional[str] = None

@router.post("/speak")
async def text_to_speech(request: TTSSpeakRequest):
    try:
        lang = request.language or request.language_code or "en"
        audio_base64 = await TTSService.text_to_speech(
            text=request.text,
            language_code=lang
        )
        return {
            "audio_base64": audio_base64,
            "format": "mp3"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"TTS synthesis failed: {str(e)}"
        )
