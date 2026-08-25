import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

def send_otp_email(to_email: str, otp_code: str) -> bool:
    """
    Sends a 6-digit OTP email using Gmail SMTP_SSL for health verification.
    """
    SMTP_EMAIL = os.getenv("SMTP_EMAIL") or settings.SMTP_USER or ""
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD") or settings.SMTP_PASSWORD or ""
    SMTP_HOST = "smtp.gmail.com"
    SMTP_PORT = 465  # SSL Port

    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print(f"[WARNING] SMTP credentials missing. OTP for {to_email} is {otp_code}", flush=True)
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Your SehatMitra-AI Verification Code: {otp_code}"
    msg["From"] = f"SehatMitra AI <{SMTP_EMAIL}>"
    msg["To"] = to_email

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <h2 style="color: #059669; text-align: center; margin-bottom: 20px;">SehatMitra-AI</h2>
        <p style="color: #334155; font-size: 15px;">Hello,</p>
        <p style="color: #334155; font-size: 15px;">Your one-time verification code for registering your account is:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #059669; background-color: #ecfdf5; padding: 12px 24px; border-radius: 8px; border: 1px dashed #10b981;">{otp_code}</span>
        </div>
        <p style="color: #64748b; font-size: 13px; text-align: center;">This code is valid for 10 minutes. Please do not share it with anyone.</p>
      </div>
    </body>
    </html>
    """
    msg.attach(MIMEText(html_content, "html"))

    try:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        print(f"[SUCCESS] OTP email successfully dispatched to {to_email}", flush=True)
        return True
    except Exception as e:
        print(f"[ERROR] Failed to send email via SMTP: {e}", flush=True)
        return False
