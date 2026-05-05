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
        'subject': 'Racconto 가입 이메일 인증',
        'title': '이메일 인증하기',
        'desc': '안녕하세요! Racconto에 오신 것을 환영합니다! 아래 버튼을 클릭하여 이메일 인증을 해주세요.',
        'validity': '보내 드린 인증 링크는 24시간 동안 유효합니다.',
        'button': '이메일 인증하기',
        'ignore': '만약 본인이 요청하지 않은 경우에는 이 이메일을 무시해주세요.',
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

RESET_TEMPLATES = {
    'ko': {
        'subject': 'Racconto 비밀번호 재설정',
        'title': '비밀번호 재설정',
        'desc': '아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.',
        'validity': '보내 드린 링크는 1시간 동안 유효합니다.',
        'button': '비밀번호 재설정하기',
        'ignore': '만약 본인이 요청하지 않은 경우에는 이 이메일을 무시해주세요.',
    },
    'en': {
        'subject': 'Racconto Password Reset',
        'title': 'Password Reset',
        'desc': 'Click the button below to set a new password.',
        'validity': 'This link is valid for 1 hour.',
        'button': 'Reset Password',
        'ignore': 'If you did not request this, please ignore this email.',
    }
}

def send_password_reset_email(to_email: str, reset_token: str, lang: str = 'ko'):
    t = RESET_TEMPLATES.get(lang, RESET_TEMPLATES['ko'])

    BASE_URL = os.getenv("BASE_URL", "https://racconto.app")
    reset_url = f"{BASE_URL}/reset-password?token={reset_token}"

    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": to_email}],
        sender={"email": FROM_EMAIL, "name": FROM_NAME},
        subject=t['subject'],
        html_content=f"""
        <div style="font-family: Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    max-width: 480px; margin: 0 auto;
                    background-color: #F7F4F0; padding: 40px 32px; color: #1c1917;">
            <div style="margin-bottom: 32px;">
                <span style="font-family: 'Noto Serif KR', Georgia, serif;
                            font-size: 22px; font-weight: bold;
                            letter-spacing: 0.15em; color: #1c1917;">
                    Racconto
                </span>
            </div>
            <div style="background-color: #ffffff; border-radius: 3px;
                        padding: 32px; margin-bottom: 24px;">
                <h2 style="font-size: 16px; font-weight: 600; margin: 0 0 16px 0;
                        letter-spacing: 0.05em; color: #1c1917;">
                    {t['title']}
                </h2>
                <p style="font-size: 14px; line-height: 1.65; color: #44403c; margin: 0 0 8px 0;">
                    {t['desc']}
                </p>
                <p style="font-size: 13px; color: #78716c; margin: 0 0 24px 0;">
                    {t['validity']}
                </p>
                <a href="{reset_url}"
                style="display: inline-block; padding: 12px 28px;
                        background-color: #1c1917; color: #ffffff !important;
                        text-decoration: none; font-size: 13px;
                        letter-spacing: 0.08em; border-radius: 2px;
                        -webkit-text-fill-color: #ffffff;">
                    {t['button']}
                </a>
            </div>
            <p style="font-size: 12px; color: #a8a29e; line-height: 1.6; margin: 0;">
                {t['ignore']}
            </p>
        </div>
        """
    )

    try:
        api_instance.send_transac_email(send_smtp_email)
        return True
    except ApiException as e:
        print(f"비밀번호 재설정 이메일 발송 실패: {e}")
        return False


def send_verification_email(to_email: str, verify_token: str, lang: str = 'ko'):
    t = EMAIL_TEMPLATES.get(lang, EMAIL_TEMPLATES['ko'])
    
    BASE_URL = os.getenv("BASE_URL", "https://racconto.app")
    verify_url = f"{BASE_URL}/verify-email?token={verify_token}"

    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": to_email}],
        sender={"email": FROM_EMAIL, "name": FROM_NAME},
        subject=t['subject'],
        html_content=f"""
        <div style="font-family: Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    max-width: 480px; margin: 0 auto;
                    background-color: #F7F4F0; padding: 40px 32px; color: #1c1917;">

            <!-- 로고 -->
            <div style="margin-bottom: 32px;">
                <span style="font-family: 'Noto Serif KR', Georgia, serif;
                            font-size: 22px; font-weight: bold;
                            letter-spacing: 0.15em; color: #1c1917;">
                    Racconto
                </span>
            </div>

            <!-- 본문 -->
            <div style="background-color: #ffffff; border-radius: 3px;
                        padding: 32px; margin-bottom: 24px;">
                <h2 style="font-size: 16px; font-weight: 600; margin: 0 0 16px 0;
                        letter-spacing: 0.05em; color: #1c1917;">
                    {t['title']}
                </h2>
                <p style="font-size: 14px; line-height: 1.65; color: #44403c; margin: 0 0 8px 0;">
                    {t['desc']}
                </p>
                <p style="font-size: 13px; color: #78716c; margin: 0 0 24px 0;">
                    {t['validity']}
                </p>
                <a href="{verify_url}"
                style="display: inline-block; padding: 12px 28px;
                        background-color: #1c1917; color: #ffffff !important;
                        text-decoration: none; font-size: 13px;
                        letter-spacing: 0.08em; border-radius: 2px;
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


WELCOME_TEMPLATES = {
    'ko': {
        'subject': 'Racconto에 오신 것을 환영합니다',
        'title': '이메일 인증에 성공하였습니다.',
        'body': (
            '이메일 인증이 성공적으로 완료되었습니다.<br><br>'
            '이제 Racconto와 함께 이야기를 시작할 모든 준비가 끝났습니다.<br>'
            '프로젝트를 만들고, 당신의 사진에 스토리를 담아보세요.'
        ),
        'button': 'Racconto 시작하기',
        'closing': 'Racconto와 함께 멋진 이야기를 만들어가세요.',
    },
    'en': {
        'subject': 'Welcome to Racconto',
        'title': 'Your email has been verified',
        'body': (
            'Your email verification is complete.<br><br>'
            'You\'re all set to start telling your photo stories on Racconto.<br>'
            'Create a project and bring your photos to life.'
        ),
        'button': 'Get Started',
        'closing': 'We\'re excited to see the stories you\'ll create.',
    },
}


def send_welcome_email(to_email: str, lang: str = 'ko'):
    t = WELCOME_TEMPLATES.get(lang, WELCOME_TEMPLATES['ko'])

    BASE_URL = os.getenv("BASE_URL", "https://racconto.app")
    login_url = f"{BASE_URL}/login"

    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": to_email}],
        sender={"email": FROM_EMAIL, "name": FROM_NAME},
        subject=t['subject'],
        html_content=f"""
        <div style="font-family: Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    max-width: 480px; margin: 0 auto;
                    background-color: #F7F4F0; padding: 40px 32px; color: #1c1917;">
            <div style="margin-bottom: 32px;">
                <span style="font-family: 'Noto Serif KR', Georgia, serif;
                            font-size: 22px; font-weight: 700;
                            letter-spacing: 0.08em; color: #1c1917;">
                    Racconto
                </span>
            </div>
            <div style="background-color: #ffffff; border-radius: 3px;
                        padding: 32px; margin-bottom: 24px;">
                <h2 style="font-size: 16px; font-weight: 600; margin: 0 0 16px 0;
                        letter-spacing: 0.05em; color: #1c1917;">
                    {t['title']}
                </h2>
                <p style="font-size: 14px; line-height: 1.65; color: #44403c; margin: 0 0 24px 0;">
                    {t['body']}
                </p>
                <a href="{login_url}"
                style="font-family: 'Noto Serif KR', Georgia, serif;
                        display: inline-block; padding: 12px 28px;
                        background-color: #1c1917; color: #ffffff !important;
                        text-decoration: none; font-size: 13px;
                        letter-spacing: 0.08em; border-radius: 2px;
                        -webkit-text-fill-color: #ffffff;">
                    {t['button']}
                </a>
            </div>
            <p style="font-size: 12px; color: #a8a29e; line-height: 1.6; margin: 0;">
                {t['closing']}
            </p>
        </div>
        """
    )

    try:
        api_instance.send_transac_email(send_smtp_email)
        return True
    except ApiException as e:
        print(f"웰컴 이메일 발송 실패: {e}")
        return False


FAREWELL_TEMPLATES = {
    'ko': {
        'subject': 'Racconto 회원 탈퇴가 완료되었습니다',
        'title': '그동안 함께해 주셔서 감사합니다',
        'body': (
            '요청하신 회원 탈퇴가 정상적으로 처리되었습니다.<br><br>'
            '업로드하신 사진과 모든 개인 데이터는 즉시 삭제되었습니다.<br>'
            '언제든 다시 돌아오셔서 새로운 이야기를 시작해 보시길 바랍니다.'
        ),
        'closing': '지금까지 Racconto를 이용해 주셔서 진심으로 감사드립니다.',
    },
    'en': {
        'subject': 'Your Racconto account has been deleted',
        'title': 'Thank you for being with us',
        'body': (
            'Your account has been successfully deleted.<br><br>'
            'All your photos and personal data have been permanently removed.<br>'
            'You are always welcome to come back.'
        ),
        'closing': 'Thank you sincerely for using Racconto.',
    },
}


def send_farewell_email(to_email: str, lang: str = 'ko'):
    t = FAREWELL_TEMPLATES.get(lang, FAREWELL_TEMPLATES['ko'])

    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": to_email}],
        sender={"email": FROM_EMAIL, "name": FROM_NAME},
        subject=t['subject'],
        html_content=f"""
        <div style="font-family: Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    max-width: 480px; margin: 0 auto;
                    background-color: #F7F4F0; padding: 40px 32px; color: #1c1917;">
            <div style="margin-bottom: 32px;">
                <span style="font-family: 'Noto Serif KR', Georgia, serif;
                            font-size: 22px; font-weight: bold;
                            letter-spacing: 0.15em; color: #1c1917;">
                    Racconto
                </span>
            </div>
            <div style="background-color: #ffffff; border-radius: 3px;
                        padding: 32px; margin-bottom: 24px;">
                <h2 style="font-size: 16px; font-weight: 600; margin: 0 0 16px 0;
                        letter-spacing: 0.05em; color: #1c1917;">
                    {t['title']}
                </h2>
                <p style="font-size: 14px; line-height: 1.65; color: #44403c; margin: 0 0 20px 0;">
                    {t['body']}
                </p>
                <p style="font-size: 13px; color: #78716c; margin: 0;">
                    {t['closing']}
                </p>
            </div>
            <p style="font-size: 12px; color: #a8a29e; line-height: 1.6; margin: 0;">
                racconto.app
            </p>
        </div>
        """
    )

    try:
        api_instance.send_transac_email(send_smtp_email)
        return True
    except ApiException as e:
        print(f"탈퇴 안내 이메일 발송 실패: {e}")
        return False


def send_notice_email(to_email: str, subject: str, content: str):
    """관리자 공지 이메일 발송"""
    try:
        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            to=[{"email": to_email}],
            sender={"email": FROM_EMAIL, "name": FROM_NAME},
            subject=subject,
            html_content=f"""
            <div style="font-family: Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        max-width: 480px; margin: 0 auto;
                        background-color: #F7F4F0; padding: 40px 32px; color: #1c1917;">

                <!-- 로고 -->
                <div style="margin-bottom: 32px;">
                    <span style="font-family: 'Noto Serif KR', Georgia, serif;
                                font-size: 22px; font-weight: bold;
                                letter-spacing: 0.15em; color: #1c1917;">
                        Racconto
                    </span>
                </div>

                <!-- 본문 -->
                <div style="background-color: #ffffff; border-radius: 3px;
                            padding: 32px; margin-bottom: 24px;">
                    <div style="font-size: 14px; line-height: 1.65; color: #44403c;">
                        {content.replace(chr(10), '<br>')}
                    </div>
                </div>

                <!-- 하단 -->
                <p style="font-size: 12px; color: #a8a29e; line-height: 1.6; margin: 0;
                        border-top: 1px solid #E7E0D7; padding-top: 16px;">
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