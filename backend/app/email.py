import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
import os

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
FROM_EMAIL = "noreply@racconto.app"
FROM_NAME = "Racconto"

def send_verification_email(to_email: str, verify_token: str):
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = BREVO_API_KEY

    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
        sib_api_v3_sdk.ApiClient(configuration)
    )

    # 변경
    BASE_URL = os.getenv("BASE_URL", "https://racconto.app")
    verify_url = f"{BASE_URL}/verify-email?token={verify_token}"

    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": to_email}],
        sender={"email": FROM_EMAIL, "name": FROM_NAME},
        subject="Racconto 이메일 인증",
        html_content=f"""
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="letter-spacing: 2px;">Racconto</h2>
            <p>아래 버튼을 클릭하여 이메일 인증을 완료해주세요.</p>
            <p>링크는 24시간 동안 유효합니다.</p>
            <a href="{verify_url}"
               style="display: inline-block; margin-top: 16px; padding: 12px 24px;
                      background: #000; color: #fff; text-decoration: none;
                      letter-spacing: 1px; font-size: 14px;">
                이메일 인증하기
            </a>
            <p style="margin-top: 24px; color: #999; font-size: 12px;">
                본인이 요청하지 않은 경우 이 이메일을 무시해주세요.
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