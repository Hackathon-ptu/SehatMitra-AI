from pydantic import BaseModel
from typing import Optional

class ChatRequest(BaseModel):
    message: str
    language: str = "hi"
    session_id: Optional[int] = None

class ChatResponse(BaseModel):
    reply: str
    session_id: Optional[int] = None
