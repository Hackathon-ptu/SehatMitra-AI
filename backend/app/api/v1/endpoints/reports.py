import mimetypes
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.report_service import report_analysis_service, ReportAnalysisResponse
from app.api.v1.deps import get_current_user_optional
from app.models.user import User
from app.models.history import ReportHistory
from typing import Optional

router = APIRouter()

@router.post("/analyze", response_model=ReportAnalysisResponse)
async def analyze_report(
    file: UploadFile = File(...),
    language: str = Form("en"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    try:
        # 1. Reset pointer and read non-empty bytes
        await file.seek(0)
        file_bytes = await file.read()
        
        if not file_bytes or len(file_bytes) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        # 2. Determine clean mime type
        mime_type = file.content_type
        if not mime_type or mime_type == "application/octet-stream":
            mime_type, _ = mimetypes.guess_type(file.filename or "")
        
        if not mime_type:
            mime_type = "image/jpeg"

        # Supported MIME types check
        valid_mimes = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"]
        if mime_type not in valid_mimes:
            # Fallback to jpeg for general image formats
            mime_type = "image/jpeg"

        result = await report_analysis_service.analyze_report(
            file_bytes=file_bytes,
            filename=file.filename or "",
            mime_type=mime_type,
            language=language
        )
        
        # Save to history if user is authenticated
        if current_user:
            try:
                biomarkers_data = result.get("biomarkers", []) if isinstance(result, dict) else result.model_dump().get("biomarkers", [])
                explanation_data = result.get("patient_summary", "Report analyzed successfully.") if isinstance(result, dict) else result.patient_summary
                report_rec = ReportHistory(
                    user_id=current_user.id,
                    filename=file.filename or "uploaded_report.jpg",
                    extracted_data=biomarkers_data,
                    explanation=explanation_data
                )
                db.add(report_rec)
                db.commit()
                db.refresh(report_rec)
            except Exception as db_err:
                print(f"[reports endpoint] Failed to save report to history: {db_err}")
                
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"[REPORTS API ERROR]: {e}")
        raise HTTPException(status_code=500, detail=str(e))
