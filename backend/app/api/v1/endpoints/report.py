from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.ai_service import analyze_medical_report_image

router = APIRouter()

@router.post("/")
async def upload_and_analyze_report(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith(("image/", "application/pdf")):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a JPG, PNG, or PDF.")
    
    contents = await file.read()
    result = await analyze_medical_report_image(contents, mime_type=file.content_type)
    
    return {
        "filename": file.filename,
        **result
    }