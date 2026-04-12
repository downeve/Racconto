import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
import os

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
FROM_EMAIL = "noreply@racconto.app"
FROM_NAME = "Racconto"

# 1. API 설정을 전역(Global)으로 빼서 한 번만 초기화합니다.
configuration = sib_api_v3_sdk.Configuration()
configuration.api_key['api-key'] = BREVO_API_KEY
api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
    sib_api_v3_sdk.ApiClient(configuration)
)

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
    t = EMAIL_TEMPLATES.get(lang, EMAIL_TEMPLATES['ko'])
    
    BASE_URL = os.getenv("BASE_URL", "https://racconto.app")
    verify_url = f"{BASE_URL}/verify-email?token={verify_token}"

    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": to_email}],
        sender={"email": FROM_EMAIL, "name": FROM_NAME},
        subject=t['subject'],
            html_content=f"""
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;
                        background-color: #F7F4F0; padding: 40px 32px; color: #1c1917;">

                <!-- 로고 -->
                <div style="margin-bottom: 32px;">
                    <span style="font-family: Georgia, 'Times New Roman', serif;
                                font-size: 22px; font-weight: bold;
                                letter-spacing: 0.15em; color: #1c1917;">
                        Racconto
                    </span>
                </div>

                <!-- 본문 -->
                <div style="background-color: #ffffff; border-radius: 8px;
                            padding: 32px; margin-bottom: 24px;">
                    <h2 style="font-size: 16px; font-weight: 600; margin: 0 0 16px 0;
                            letter-spacing: 0.05em; color: #1c1917;">
                        {t['title']}
                    </h2>
                    <p style="font-size: 14px; line-height: 1.7; color: #44403c; margin: 0 0 8px 0;">
                        {t['desc']}
                    </p>
                    <p style="font-size: 13px; color: #78716c; margin: 0 0 24px 0;">
                        {t['validity']}
                    </p>
                    <a href="{verify_url}"
                    style="display: inline-block; padding: 12px 28px;
                            background-color: #1c1917; color: #ffffff !important;
                            text-decoration: none; font-size: 13px;
                            letter-spacing: 0.08em; border-radius: 4px;
                            -webkit-text-fill-color: #ffffff;">
                        {t['button']}
                    </a>
                </div>

                <!-- 하단 -->
                <p style="font-size: 12px; color: #a8a29e; line-height: 1.6; margin: 0;">
                    {t['ignore']}
                </p>
            </div>
            """
    )

    try:
        # 전역으로 선언된 api_instance를 사용합니다.
        api_instance.send_transac_email(send_smtp_email)
        return True
    except ApiException as e:
        print(f"이메일 발송 실패: {e}")
        return False


def send_notice_email(to_email: str, subject: str, content: str):
    """관리자 공지 이메일 발송"""
    try:
        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            to=[{"email": to_email}],
            sender={"email": FROM_EMAIL, "name": FROM_NAME},
            subject=subject,
            html_content=f"""
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;
                        background-color: #F7F4F0; padding: 40px 32px; color: #1c1917;">

                <!-- 로고 -->
                <div style="margin-bottom: 32px;">
                    <span style="font-family: Georgia, 'Times New Roman', serif;
                                font-size: 22px; font-weight: bold;
                                letter-spacing: 0.15em; color: #1c1917;">
                        Racconto
                    </span>
                </div>

                <!-- 본문 -->
                <div style="background-color: #ffffff; border-radius: 8px;
                            padding: 32px; margin-bottom: 24px;">
                    <div style="font-size: 14px; line-height: 1.8; color: #44403c;">
                        {content.replace(chr(10), '<br>')}
                    </div>
                </div>

                <!-- 하단 -->
                <p style="font-size: 12px; color: #a8a29e; line-height: 1.6; margin: 0;
                        border-top: 1px solid #e7e3de; padding-top: 16px;">
                    This email was sent from Racconto (racconto.app).<br>
                    If you have any questions, please contact us at {FROM_EMAIL}.
                </p>
            </div>
            """
        )
        # 2. 여기서 중복되던 인스턴스 생성 코드를 제거하고 전역 api_instance를 그대로 사용합니다.
        api_instance.send_transac_email(send_smtp_email)
    except Exception as e:
        print(f"공지 이메일 발송 실패 ({to_email}): {e}")