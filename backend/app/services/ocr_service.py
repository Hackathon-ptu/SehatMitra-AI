from typing import Dict, Any

class OCRService:
    @staticmethod
    async def process_medical_report(file_bytes: bytes, filename: str) -> dict:
        # Mock implementation/placeholder for PaddleOCR report parsing.
        # Extracted parameters represent clinical indicators found in the report.
        # Explanation provides simplified medical report information for patients.
        
        extracted_data = {
            "Hemoglobin (Hb)": {
                "value": 11.5,
                "unit": "g/dL",
                "reference_range": "12.0 - 15.5",
                "status": "slightly low"
            },
            "White Blood Cell (WBC)": {
                "value": 6500,
                "unit": "/mcL",
                "reference_range": "4500 - 11000",
                "status": "normal"
            },
            "Platelets": {
                "value": 250000,
                "unit": "/mcL",
                "reference_range": "150000 - 450000",
                "status": "normal"
            }
        }
        
        explanation = (
            "Your blood report indicates a slightly low Hemoglobin level (11.5 g/dL), "
            "which might cause mild fatigue or anemia. All other major blood parameters, "
            "including your white blood cell count and platelets, are within the healthy normal ranges."
        )
        
        return {
            "filename": filename,
            "extracted_data": extracted_data,
            "explanation": explanation,
            "status": "success"
        }
