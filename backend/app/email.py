import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
import os

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
FROM_EMAIL = "noreply@racconto.app"
FROM_NAME = "Racconto"

EMAIL_TEMPLATES = {
    'ko': {
        'subject': 'Racconto 이메일 인증',
        'title': '이메일 인증',
        'desc': '아래 버튼을 클릭하여 이메일 인증을 완료해주세요.',
        'validity': '링크는 24시간 동안 유효합니다.',
        'button': '이메일 인증하기',
        'ignore': '본인이 요청하지 않은 경우 이 이메일을 무시해주세요.',
    },
    'en': {
        'subject': 'Racconto Email Verification',
        'title': 'Email Verification',
        'desc': 'Click the button below to complete your email verification.',
        'validity': 'This link is valid for 24 hours.',
        'button': 'Verify Email',
        'ignore': 'If you did not request this, please ignore this email.',
    }
}

def send_verification_email(to_email: str, verify_token: str, lang: str = 'ko'):
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = BREVO_API_KEY

    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
        sib_api_v3_sdk.ApiClient(configuration)
    )

    t = EMAIL_TEMPLATES.get(lang, EMAIL_TEMPLATES['ko'])
    
    BASE_URL = os.getenv("BASE_URL", "https://racconto.app")
    verify_url = f"{BASE_URL}/verify-email?token={verify_token}"

    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": to_email}],
        sender={"email": FROM_EMAIL, "name": FROM_NAME},
        subject=t['subject'],
        html_content=f"""
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; 
            background-color: #ffffff; padding: 24px; color: #000000;">
            <h2 style="letter-spacing: 2px;">Racconto</h2>
            <p>{t['desc']}</p>
            <p>{t['validity']}</p>
            <a href="{verify_url}"
            style="display: inline-block; margin-top: 16px; padding: 12px 24px;
                    background: #1a1a1a; color: #ffffff !important; text-decoration: none;
                    letter-spacing: 1px; font-size: 14px; border-radius: 4px;
                    -webkit-text-fill-color: #ffffff;">
                {t['button']}
            </a>
            <p style="margin-top: 24px; color: #999; font-size: 12px;">
                {t['ignore']}
            </p>
        </div>
        """
    )

    try:
        api_instance.send_transac_email(send_smtp_email)
        return True
    except ApiException as e:
        print(f"이메일 발송 실패: {e}")
        return False