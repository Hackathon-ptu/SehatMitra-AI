from pydantic import BaseModel
from typing import List, Optional

class HospitalItem(BaseModel):
    name: str
    distance_km: float
    type: str
    emergency_available: bool
    latitude: float
    longitude: float
    address: str
    phone: Optional[str] = "+91-1800-180-1104"
    specialties: Optional[List[str]] = None
    beds_available: Optional[str] = None
    opd_timings: Optional[str] = "08:00 AM - 04:00 PM"

class HospitalResponse(BaseModel):
    recommended_tier: str
    hospitals: List[HospitalItem]
    is_live_data: Optional[bool] = True
