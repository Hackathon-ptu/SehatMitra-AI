from fastapi import APIRouter, Depends, Query
from app.schemas.hospital import HospitalResponse
from app.services.hospital_service import HospitalService

router = APIRouter()

@router.get("/", response_model=HospitalResponse)
async def get_nearby_hospitals(
    lat: float = Query(..., description="Latitude of user"),
    lon: float = Query(..., description="Longitude of user"),
    risk: str = Query("moderate", description="Risk level (low, moderate, high, emergency)")
):
    response = await HospitalService.get_nearby_hospitals(
        latitude=lat,
        longitude=lon,
        risk_level=risk
    )
    return response
