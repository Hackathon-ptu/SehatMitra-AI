import os
import sys
import random
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.otp import EmailOTP

logger = logging.getLogger("uvicorn.error")

def generate_and_store_otp(db: Session, email: str, phone: str = "") -> str:
    otp_code = f"{random.randint(100000, 999999)}"
    
    # 1. Print OTP prominently with immediate stdout flush for Render logs
    print(f"\n==========================================", flush=True)
    print(f"[SEHATMITRA OTP DISPATCH] -> Email: {email} | OTP: {otp_code}", flush=True)
    print(f"==========================================\n", flush=True)
    sys.stdout.flush()

    # 2. Store or update OTP in DB / cache with a 10-minute expiry
    try:
        # Clear existing OTPs for this email
        db.query(EmailOTP).filter(EmailOTP.email == email).delete()
        db.commit()
        
        otp_entry = EmailOTP(
            email=email,
            otp_code=otp_code,
            expires_at=datetime.utcnow() + timedelta(minutes=10),
            is_used=False
        )
        db.add(otp_entry)
        db.commit()
    except Exception as db_err:
        logger.warning(f"OTP DB storage skipped or table optional: {db_err}")
        db.rollback()

    return otp_code
