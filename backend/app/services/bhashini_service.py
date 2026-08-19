import httpx
from app.core.config import settings

class BhashiniService:
    @staticmethod
    async def get_pipeline_config(source_lang: str, target_lang: str, task_type: str) -> dict:
        """
        Query Bhashini's model pipeline configurations to resolve dynamic URLs and Keys.
        """
        if not settings.BHASHINI_USER_ID or not settings.BHASHINI_API_KEY:
            return {}

        headers = {
            "userID": settings.BHASHINI_USER_ID,
            "ulcaApiKey": settings.BHASHINI_API_KEY,
            "Content-Type": "application/json"
        }

        # Format request schema based on Bhashini API specifications
        payload = {
            "pipelineId": settings.BHASHINI_PIPELINE_ID,
            "pipelineRequestConfig": {
                "pipelineTasks": [
                    {
                        "taskType": task_type,
                        "config": {
                            "language": {
                                "sourceLanguage": source_lang,
                                "targetLanguage": target_lang
                            }
                        }
                    }
                ]
            }
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(settings.BHASHINI_CONFIG_URL, headers=headers, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    
                    # Locate task configurations in callback config
                    pipeline_tasks = data.get("pipelineResponseConfig", [])
                    callback_config = data.get("callbackUrl", "")
                    
                    target_task = None
                    for task in pipeline_tasks:
                        if task.get("taskType") == task_type:
                            target_task = task
                            break
                            
                    if target_task:
                        config_list = target_task.get("config", [])
                        if config_list:
                            model_config = config_list[0]
                            return {
                                "callbackUrl": callback_config,
                                "inferenceApiKey": data.get("inferenceApiKey", {}).get("value", ""),
                                "serviceId": model_config.get("serviceId", ""),
                                "modelId": model_config.get("modelId", "")
                            }
        except Exception as e:
            print(f"Bhashini pipeline configuration fetch failure: {e}")
        return {}

    @staticmethod
    async def speech_to_text(audio_base64: str, source_lang: str) -> str:
        """
        Send base64 audio string to Bhashini ASR pipeline and transcribe to text.
        """
        config = await BhashiniService.get_pipeline_config(source_lang=source_lang, target_lang="", task_type="asr")
        if not config:
            return ""

        headers = {
            "Authorization": config["inferenceApiKey"],
            "Content-Type": "application/json"
        }

        payload = {
            "pipelineTasks": [
                {
                    "taskType": "asr",
                    "config": {
                        "language": {
                            "sourceLanguage": source_lang
                        },
                        "serviceId": config["serviceId"],
                        "audioFormat": "wav"
                    }
                }
            ],
            "inputData": {
                "audio": [
                    {
                        "audioContent": audio_base64
                    }
                ]
            }
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(config["callbackUrl"], headers=headers, json=payload)
                if response.status_code == 200:
                    res_data = response.json()
                    outputs = res_data.get("pipelineResponse", [])
                    if outputs:
                        asr_res = outputs[0].get("output", [])
                        if asr_res:
                            return asr_res[0].get("source", "")
        except Exception as e:
            print(f"Bhashini ASR failure: {e}")
        return ""

    @staticmethod
    async def text_to_speech(text: str, target_lang: str, gender: str = "female") -> str:
        """
        Convert response text to speech audio using Bhashini TTS. Returns base64 audio.
        """
        config = await BhashiniService.get_pipeline_config(source_lang=target_lang, target_lang="", task_type="tts")
        if not config:
            return ""

        headers = {
            "Authorization": config["inferenceApiKey"],
            "Content-Type": "application/json"
        }

        payload = {
            "pipelineTasks": [
                {
                    "taskType": "tts",
                    "config": {
                        "language": {
                            "sourceLanguage": target_lang
                        },
                        "serviceId": config["serviceId"],
                        "gender": gender
                    }
                }
            ],
            "inputData": {
                "input": [
                    {
                        "source": text
                    }
                ]
            }
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(config["callbackUrl"], headers=headers, json=payload)
                if response.status_code == 200:
                    res_data = response.json()
                    outputs = res_data.get("pipelineResponse", [])
                    if outputs:
                        tts_res = outputs[0].get("audio", [])
                        if tts_res:
                            return tts_res[0].get("audioContent", "")
        except Exception as e:
            print(f"Bhashini TTS failure: {e}")
        return ""
