import math
import requests
from typing import List, Dict, Any, Optional

class HospitalService:
    @staticmethod
    def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate the great circle distance between two points
        on the earth (specified in decimal degrees)
        """
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        r = 6371.0 # Radius of earth in kilometers
        return c * r

    @staticmethod
    async def get_nearby_hospitals(latitude: float, longitude: float, risk_level: str) -> dict:
        """
        Queries OpenStreetMap's Overpass API for healthcare facilities within a 15km radius
        of user's latitude and longitude. Compares distance using Haversine formula, and filters
        based on clinical risk. Falls back to deterministic local coordinates if the API is offline.
        """
        query = f"""
        [out:json][timeout:15];
        (
          node["amenity"="hospital"](around:15000,{latitude},{longitude});
          way["amenity"="hospital"](around:15000,{latitude},{longitude});
          node["amenity"="clinic"](around:15000,{latitude},{longitude});
          way["amenity"="clinic"](around:15000,{latitude},{longitude});
          node["healthcare"="centre"](around:15000,{latitude},{longitude});
          way["healthcare"="centre"](around:15000,{latitude},{longitude});
          node["healthcare"="hospital"](around:15000,{latitude},{longitude});
          way["healthcare"="hospital"](around:15000,{latitude},{longitude});
        );
        out body center;
        """
        overpass_url = "https://overpass-api.de/api/interpreter"
        raw_elements = []
        is_fallback = False

        try:
            response = requests.post(overpass_url, data={"data": query}, timeout=8)
            if response.status_code == 200:
                data = response.json()
                raw_elements = data.get("elements", [])
        except Exception as e:
            print(f"Overpass API error, using geospatial fallback: {e}")
            is_fallback = True

        hospitals = []

        if not raw_elements or is_fallback:
            is_fallback = True
            fallback_sources = [
                {
                    "name": "District Civil Hospital & Trauma Centre",
                    "lat_offset": 0.012,
                    "lon_offset": -0.009,
                    "type": "Government District Hospital",
                    "emergency": "yes",
                    "address": "Civil Lines Road, Near Red Cross Bhawan",
                    "phone": "+91-175-2212345",
                    "specialties": ["Emergency Medicine", "General Surgery", "Cardiology", "Pediatrics"],
                    "beds_available": "18 / 24 General, 4 ICU Beds",
                    "opd_timings": "24x7 Emergency & 08:00 AM - 02:00 PM OPD"
                },
                {
                    "name": "Apex Super Specialty Hospital",
                    "lat_offset": -0.022,
                    "lon_offset": 0.028,
                    "type": "Private Multi-Specialty",
                    "emergency": "yes",
                    "address": "Sector 14 Bypass Road, Medical Enclave",
                    "phone": "+91-11-45678900",
                    "specialties": ["Cardiology", "Neurology", "Orthopedics", "Critical Care"],
                    "beds_available": "12 / 16 ICU Beds available",
                    "opd_timings": "24x7 Emergency / 09:00 AM - 08:00 PM OPD"
                },
                {
                    "name": "Primary Health Centre (PHC) - Village Hub",
                    "lat_offset": 0.006,
                    "lon_offset": 0.005,
                    "type": "Government PHC",
                    "emergency": "no",
                    "address": "Main Gram Panchayat Road, Near School",
                    "phone": "+91-98765-43210",
                    "specialties": ["Maternal & Child Health", "Immunization", "General Medicine"],
                    "beds_available": "6 Day-care Observation Beds",
                    "opd_timings": "09:00 AM - 04:00 PM"
                },
                {
                    "name": "Community Health Centre (CHC) & Maternity Wing",
                    "lat_offset": -0.014,
                    "lon_offset": -0.011,
                    "type": "Government CHC",
                    "emergency": "yes",
                    "address": "Block B, Market Road, Near Post Office",
                    "phone": "+91-175-2345678",
                    "specialties": ["Obstetrics & Gynecology", "Pediatrics", "Emergency Trauma"],
                    "beds_available": "10 / 15 Ward Beds available",
                    "opd_timings": "24x7 Emergency / 08:30 AM - 03:30 PM OPD"
                },
                {
                    "name": "Sanjeevani PolyClinic & Diagnostics",
                    "lat_offset": 0.009,
                    "lon_offset": -0.004,
                    "type": "Private Clinic & Diagnostic Lab",
                    "emergency": "no",
                    "address": "Opposite Bus Stand, Station Road",
                    "phone": "+91-94170-12345",
                    "specialties": ["Pathology Lab", "General Physician", "Dental"],
                    "beds_available": "Day Care Only",
                    "opd_timings": "08:00 AM - 08:00 PM"
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
                    "address": src["address"],
                    "phone": src["phone"],
                    "specialties": src["specialties"],
                    "beds_available": src["beds_available"],
                    "opd_timings": src["opd_timings"]
                })
        else:
            for elem in raw_elements:
                tags = elem.get("tags", {})
                name = tags.get("name") or tags.get("operator") or "Community Health Facility"
                
                lat = elem.get("lat") or elem.get("center", {}).get("lat")
                lon = elem.get("lon") or elem.get("center", {}).get("lon")
                if lat is None or lon is None:
                    continue

                dist = HospitalService.haversine(latitude, longitude, lat, lon)
                
                amenity = tags.get("amenity")
                healthcare = tags.get("healthcare")
                facility_type = "Primary Care Centre"
                if amenity == "hospital" or healthcare == "hospital":
                    facility_type = "Government / Private Hospital"
                elif amenity == "clinic":
                    facility_type = "Community Clinic"
                
                emergency_val = tags.get("emergency") or "no"
                phone_val = tags.get("phone") or tags.get("contact:phone") or "+91-1800-180-1104"
                
                addr_street = tags.get("addr:street") or ""
                addr_city = tags.get("addr:city") or tags.get("addr:district") or ""
                address = f"{addr_street}, {addr_city}".strip(", ") or "Near Main Access Road"

                hospitals.append({
                    "name": name,
                    "distance_km": round(dist, 2),
                    "type": tags.get("healthcare:speciality") or facility_type,
                    "emergency_available": emergency_val.lower() == "yes" or "hospital" in facility_type.lower() or "civil" in name.lower(),
                    "latitude": lat,
                    "longitude": lon,
                    "address": address,
                    "phone": phone_val,
                    "specialties": ["General Medicine", "Emergency Care", "Diagnostics"],
                    "beds_available": "Operational Beds Available",
                    "opd_timings": "24/7 Emergency & OPD" if emergency_val.lower() == "yes" else "09:00 AM - 05:00 PM"
                })

        # Sorting: Nearest first
        hospitals.sort(key=lambda h: h["distance_km"])

        emergency_priority = []
        regular_priority = []

        for h in hospitals:
            is_emergency_fit = h["emergency_available"] or "district" in h["name"].lower() or "civil" in h["name"].lower() or "trauma" in h["name"].lower()
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
            "hospitals": final_list[:8],
            "is_live_data": not is_fallback
        }
