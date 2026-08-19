from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.ai_service import analyze_medical_report_image
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.history import ReportHistory
from typing import Optional

router = APIRouter()

@router.post("/")
async def upload_and_analyze_report(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    if not file.content_type or not file.content_type.startswith(("image/", "application/pdf")):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a JPG, PNG, or PDF.")
    
    contents = await file.read()
    result = await analyze_medical_report_image(contents, mime_type=file.content_type)
    
    # Save to history if user is authenticated
    if current_user:
        report_rec = ReportHistory(
            user_id=current_user.id,
            filename=file.filename,
            extracted_data=result.get("extracted_data"),
            explanation=result.get("explanation")
        )
        db.add(report_rec)
        db.commit()
        db.refresh(report_rec)
    
    return {
        "filename": file.filename,
        **result
    }