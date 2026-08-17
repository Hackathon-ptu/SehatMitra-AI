from typing import List

class HospitalService:
    @staticmethod
    async def get_nearby_hospitals(latitude: float, longitude: float, risk_level: str) -> dict:
        # Mock implementation returning geo-located PHCs/hospitals based on risk level.
        # Higher risk level recommends higher-tier facilities (e.g. District Hospital, Tertiary Care).
        # Lower risk level recommends Primary Health Centres (PHCs) or Community Health Centres (CHCs).
        
        if risk_level in ["high", "emergency"]:
            recommended_tier = "Tier-3 Tertiary/District Hospital"
            hospitals = [
                {
                    "name": "District Civil Hospital",
                    "distance_km": 2.4,
                    "type": "Government District Hospital",
                    "emergency_available": True,
                    "latitude": latitude + 0.015,
                    "longitude": longitude - 0.012,
                    "address": "Civil Lines, Near Main Chowk, City Center"
                },
                {
                    "name": "Apex Super Specialty Hospital",
                    "distance_km": 4.1,
                    "type": "Private Multi-Specialty",
                    "emergency_available": True,
                    "latitude": latitude - 0.025,
                    "longitude": longitude + 0.031,
                    "address": "Sector 12, Bypass Road"
                }
            ]
        else:
            recommended_tier = "Tier-1 Primary Health Centre (PHC)"
            hospitals = [
                {
                    "name": "Primary Health Centre (PHC) - North",
                    "distance_km": 1.2,
                    "type": "Government PHC",
                    "emergency_available": False,
                    "latitude": latitude + 0.005,
                    "longitude": longitude + 0.007,
                    "address": "Village Road, Near Post Office"
                },
                {
                    "name": "Community Health Centre (CHC) - Central",
                    "distance_km": 3.0,
                    "type": "Government CHC",
                    "emergency_available": True,
                    "latitude": latitude - 0.011,
                    "longitude": longitude - 0.008,
                    "address": "Market Road, Block B"
                }
            ]
            
        return {
            "recommended_tier": recommended_tier,
            "hospitals": hospitals
        }
