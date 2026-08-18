from pydantic import BaseModel
from typing import List

class HospitalItem(BaseModel):
    name: str
    distance_km: float
    type: str
    emergency_available: bool
    latitude: float
    longitude: float
    address: str

class HospitalResponse(BaseModel):
    recommended_tier: str
    hospitals: List[HospitalItem]
