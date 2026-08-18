import math
import requests
from typing import List, Dict, Any

class HospitalService:
    @staticmethod
    def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate the great circle distance between two points
        on the earth (specified in decimal degrees)
        """
        # Convert decimal degrees to radians
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        r = 6371.0 # Radius of earth in kilometers.
        return c * r

    @staticmethod
    async def get_nearby_hospitals(latitude: float, longitude: float, risk_level: str) -> dict:
        """
        Queries OpenStreetMap's Overpass API for healthcare facilities within a 10km radius
        of user's latitude and longitude. Compares distance using Haversine formula, and filters
        based on clinical risk. Falls back to deterministic local coordinates if the API is offline.
        """
        query = f"""
        [out:json][timeout:15];
        (
          node["amenity"="hospital"](around:10000,{latitude},{longitude});
          way["amenity"="hospital"](around:10000,{latitude},{longitude});
          node["amenity"="clinic"](around:10000,{latitude},{longitude});
          way["amenity"="clinic"](around:10000,{latitude},{longitude});
          node["healthcare"="centre"](around:10000,{latitude},{longitude});
          way["healthcare"="centre"](around:10000,{latitude},{longitude});
          node["healthcare"="hospital"](around:10000,{latitude},{longitude});
          way["healthcare"="hospital"](around:10000,{latitude},{longitude});
        );
        out body center;
        """
        overpass_url = "https://overpass-api.de/api/interpreter"
        raw_elements = []
        is_fallback = False

        try:
            response = requests.post(overpass_url, data={"data": query}, timeout=10)
            if response.status_code == 200:
                data = response.json()
                raw_elements = data.get("elements", [])
        except Exception as e:
            print(f"Overpass API error, using geospatial fallback: {e}")
            is_fallback = True

        hospitals = []

        if not raw_elements or is_fallback:
            # Realistic geospatial fallback calculations
            is_fallback = True
            # Create a structured set of local mock hospitals based on offsets
            fallback_sources = [
                {
                    "name": "District Civil Hospital",
                    "lat_offset": 0.015,
                    "lon_offset": -0.012,
                    "type": "Government District Hospital",
                    "emergency": "yes",
                    "address": "Civil Lines Road, Near Town Center"
                },
                {
                    "name": "Apex Super Specialty Hospital",
                    "lat_offset": -0.025,
                    "lon_offset": 0.031,
                    "type": "Private Multi-Specialty",
                    "emergency": "yes",
                    "address": "Sector 12, Main Bypass Road"
                },
                {
                    "name": "Primary Health Centre (PHC) - Town Centre",
                    "lat_offset": 0.005,
                    "lon_offset": 0.007,
                    "type": "Government PHC",
                    "emergency": "no",
                    "address": "Village Road, Near Post Office"
                },
                {
                    "name": "Community Health Centre (CHC)",
                    "lat_offset": -0.011,
                    "lon_offset": -0.008,
                    "type": "Government CHC",
                    "emergency": "yes",
                    "address": "Market Road, Block B"
                },
                {
                    "name": "Care Clinic & Diagnostics",
                    "lat_offset": 0.008,
                    "lon_offset": -0.004,
                    "type": "Private Clinic",
                    "emergency": "no",
                    "address": "Opposite Railway Station"
                }
            ]
            for src in fallback_sources:
                dest_lat = latitude + src["lat_offset"]
                dest_lon = longitude + src["lon_offset"]
                dist = HospitalService.haversine(latitude, longitude, dest_lat, dest_lon)
                hospitals.append({
                    "name": src["name"],
                    "distance_km": round(dist, 2),
                    "type": src["type"],
                    "emergency_available": src["emergency"] == "yes",
                    "latitude": dest_lat,
                    "longitude": dest_lon,
                    "address": src["address"]
                })
        else:
            for elem in raw_elements:
                tags = elem.get("tags", {})
                name = tags.get("name") or tags.get("operator") or "Unnamed Healthcare Facility"
                
                # Fetch coords (node has lat/lon, way has center/bounds coords)
                lat = elem.get("lat") or elem.get("center", {}).get("lat")
                lon = elem.get("lon") or elem.get("center", {}).get("lon")
                if lat is None or lon is None:
                    continue

                dist = HospitalService.haversine(latitude, longitude, lat, lon)
                
                # Categorization
                amenity = tags.get("amenity")
                healthcare = tags.get("healthcare")
                facility_type = "Primary Care Centre"
                if amenity == "hospital" or healthcare == "hospital":
                    facility_type = "Hospital"
                elif amenity == "clinic":
                    facility_type = "Clinic"
                
                emergency_val = tags.get("emergency") or "no"
                
                addr_street = tags.get("addr:street") or ""
                addr_city = tags.get("addr:city") or ""
                address = f"{addr_street}, {addr_city}".strip(", ") or "Address details unavailable"

                hospitals.append({
                    "name": name,
                    "distance_km": round(dist, 2),
                    "type": tags.get("healthcare:speciality") or facility_type,
                    "emergency_available": emergency_val.lower() == "yes" or facility_type == "Hospital",
                    "latitude": lat,
                    "longitude": lon,
                    "address": address
                })

        # Sorting: Rank nearest first
        hospitals.sort(key=lambda h: h["distance_km"])

        # Filter and classify based on risk
        # If risk is "emergency" or "high", prioritize hospitals with emergency services
        emergency_priority = []
        regular_priority = []

        for h in hospitals:
            # district or emergency yes
            is_emergency_fit = h["emergency_available"] or "district" in h["name"].lower() or "civil" in h["name"].lower()
            if is_emergency_fit:
                emergency_priority.append(h)
            else:
                regular_priority.append(h)

        if risk_level in ["high", "emergency"]:
            recommended_tier = "Emergency / Tier-3 Super Specialty & District Hospitals"
            final_list = emergency_priority + regular_priority
        else:
            recommended_tier = "Tier-1 Primary Health Centres (PHC) & Local Clinics"
            final_list = regular_priority + emergency_priority

        return {
            "recommended_tier": recommended_tier,
            "hospitals": final_list[:5], # top 5 nearby
            "is_live_data": not is_fallback
        }
