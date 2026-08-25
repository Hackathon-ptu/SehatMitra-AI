import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

def send_otp_email(to_email: str, otp_code: str) -> bool:
    """
    Sends a 6-digit OTP email using Gmail SMTP for health verification.
    If credentials are missing or connection fails, logs OTP to console and returns True.
    """
    subject = "SehatMitra-AI Health Verification OTP"
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; background-color: #f7fafc; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #2b6cb0; margin: 0;">SehatMitra-AI</h2>
                    <p style="color: #4a5568; font-size: 14px; margin: 5px 0 0 0;">Smart Rural Healthcare Assistant</p>
                </div>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
                <p style="color: #4a5568; font-size: 16px;">Hello,</p>
                <p style="color: #4a5568; font-size: 16px;">Thank you for registering with SehatMitra-AI. To verify your email address, please use the following 6-digit verification code:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2b6cb0; background-color: #ebf8ff; padding: 10px 20px; border-radius: 6px; border: 1px dashed #bee3f8;">
                        {otp_code}
                    </span>
                </div>
                <p style="color: #718096; font-size: 14px; text-align: center;">This OTP is valid for 10 minutes. Please do not share this code with anyone.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #a0aec0; font-size: 12px; text-align: center;">If you did not request this verification, you can safely ignore this email.</p>
            </div>
        </body>
    </html>
    """

    # Check if SMTP details are configured
    if settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD:
        try:
            from_name = settings.EMAILS_FROM_NAME
            from_email = settings.SMTP_USER
            from_addr = f"{from_name} <{from_email}>"
            
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = from_addr
            msg["To"] = to_email

            part = MIMEText(html_content, "html")
            msg.attach(part)

            # Connect and send
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT or 587, timeout=5.0) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(from_addr, to_email, msg.as_string())
            return True
        except Exception as e:
            print(f"Error sending email via SMTP: {e}")
            
    # Local Dev / Fallback high-visibility printing
    print(f"""
============================================================
[SEHATMITRA VERIFICATION OTP]
Recipient : {to_email}
OTP Code  : {otp_code}
Validity  : 10 Minutes
Status    : Console Fallback Mode (Ready for Testing)
============================================================
""")
    return True
