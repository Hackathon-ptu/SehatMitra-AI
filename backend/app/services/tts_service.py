import io
import base64
import edge_tts

class TTSService:
    @staticmethod
    async def text_to_speech(text: str, language_code: str) -> str:
        primary = language_code.split('-')[0].lower()
        
        # Valid Microsoft Neural Indian voices
        voice_map = {
            "hi": "hi-IN-SwaraNeural",
            "pa": "hi-IN-SwaraNeural", # Edge TTS fallback for Punjabi phonetics
            "bn": "bn-IN-BashkarNeural",
            "te": "te-IN-MohanNeural",
            "mr": "mr-IN-ManoharNeural",
            "ta": "ta-IN-ValluvarNeural",
            "gu": "gu-IN-NiranjanNeural",
            "kn": "kn-IN-SapnaNeural",
            "ml": "ml-IN-MidhunNeural",
            "or": "hi-IN-SwaraNeural", # Edge TTS fallback for Odia phonetics
            "ur": "ur-IN-SalmanNeural",
            "en": "en-IN-NeerjaNeural"
        }
        
        voice = voice_map.get(primary, "hi-IN-SwaraNeural" if primary in ["hi", "pa", "or"] else "en-IN-NeerjaNeural")
        
        try:
            communicate = edge_tts.Communicate(text, voice)
            audio_data = io.BytesIO()
            
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data.write(chunk["data"])
                    
            audio_bytes = audio_data.getvalue()
            if not audio_bytes:
                raise Exception("Empty audio stream from Edge TTS")
                
            return base64.b64encode(audio_bytes).decode("utf-8")
        except Exception as primary_err:
            print(f"[TTSService] Voice {voice} failed: {primary_err}. Falling back to default voice.")
            # Fallback to SwaraNeural or NeerjaNeural
            fallback_voice = "hi-IN-SwaraNeural" if primary != "en" else "en-IN-NeerjaNeural"
            communicate = edge_tts.Communicate(text, fallback_voice)
            audio_data = io.BytesIO()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data.write(chunk["data"])
            audio_bytes = audio_data.getvalue()
            if not audio_bytes:
                raise Exception("Fallback Edge TTS failed")
            return base64.b64encode(audio_bytes).decode("utf-8")
