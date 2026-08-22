from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.services.bhashini_service import BhashiniService

router = APIRouter()

class ASRRequest(BaseModel):
    audio_base64: str
    language_code: str  # e.g., 'hi' or 'bn'

class TTSRequest(BaseModel):
    text: str
    language_code: str
    gender: str = "female"

@router.post("/asr")
async def speech_to_text(request: ASRRequest):
    transcription = await BhashiniService.speech_to_text(
        audio_base64=request.audio_base64,
        source_lang=request.language_code
    )
    if not transcription:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail="Bhashini ASR transcription failed or service is not configured."
        )
    return {"text": transcription}

@router.post("/tts")
async def text_to_speech(request: TTSRequest):
    audio_content = await BhashiniService.text_to_speech(
        text=request.text,
        target_lang=request.language_code,
        gender=request.gender
    )
    if not audio_content:
        raise HTTPException(
            status_code=status.HTTP_424_FAILED_DEPENDENCY,
            detail="Bhashini TTS synthesis failed or service is not configured."
        )
    return {"audio_base64": audio_content}
