import os
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.report import ReportResponse
from app.services.ocr_service import OCRService
from app.models.report import MedicalReport

router = APIRouter()

@router.post("/", response_model=ReportResponse)
async def upload_medical_report(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        file_bytes = await file.read()
        ocr_result = await OCRService.process_medical_report(file_bytes, file.filename)
        
        # Save mock file path
        file_path = f"uploads/{file.filename}"
        
        db_report = MedicalReport(
            user_id=None,
            file_path=file_path,
            extracted_parameters=ocr_result["extracted_data"],
            simplified_explanation=ocr_result["explanation"]
        )
        db.add(db_report)
        db.commit()
        db.refresh(db_report)
        
        return ocr_result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process report: {str(e)}"
        )
