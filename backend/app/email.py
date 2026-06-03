import logging
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
import os

logger = logging.getLogger(__name__)

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
FROM_EMAIL = "noreply@racconto.app"
FROM_NAME = "Racconto"

configuration = sib_api_v3_sdk.Configuration()
configuration.api_key['api-key'] = BREVO_API_KEY
api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
    sib_api_v3_sdk.ApiClient(configuration)
)


def _load_template(key: str, lang: str) -> dict | None:
    """DB에서 템플릿 로드. 없으면 None 반환."""
    try:
        from app.database import SessionLocal
        from app import models
        db = SessionLocal()
        try:
            row = db.query(models.EmailTemplate).filter_by(key=key, lang=lang).first()
            if not row:
                return None
            return {
                'subject':  row.subject,
                'title':    row.title,
                'desc':     row.desc,
                'validity': row.validity,
                'button':   row.button,
                'ignore':   row.ignore,
                'body':     row.body,
                'closing':  row.closing,
            }
        finally:
            db.close()
    except Exception:
        return None


def _get_template(key: str, lang: str, fallback: dict) -> dict:
    """DB 템플릿 우선, 없으면 하드코딩 fallback."""
    db_t = _load_template(key, lang)
    if not db_t:
        return fallback
    # DB에 있는 필드만 덮어쓰고, 없는 필드는 fallback 값 사용
    return {k: (db_t[k] if db_t.get(k) else fallback.get(k, '')) for k in fallback}

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
    },
    'ja': {
        'subject': 'Racconto メール認証',
        'title': 'メール認証',
        'desc': 'Racconto にご登録いただきありがとうございます！以下のボタンをクリックしてメール認証を完了してください。',
        'validity': '認証リンクの有効期限は24時間です。',
        'button': 'メールを認証する',
        'ignore': '心当たりのない場合は、このメールを無視してください。',
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
    },
    'ja': {
        'subject': 'Racconto パスワード再設定',
        'title': 'パスワード再設定',
        'desc': '以下のボタンをクリックして、新しいパスワードを設定してください。',
        'validity': 'リンクの有効期限は1時間です。',
        'button': 'パスワードを再設定する',
        'ignore': '心当たりのない場合は、このメールを無視してください。',
    }
}

def send_password_reset_email(to_email: str, reset_token: str, lang: str = 'ko'):
    t = _get_template('password_reset', lang, RESET_TEMPLATES.get(lang, RESET_TEMPLATES['ko']))

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
        logger.error("비밀번호 재설정 이메일 발송 실패: %s", e)
        return False


def send_verification_email(to_email: str, verify_token: str, lang: str = 'ko'):
    t = _get_template('verification', lang, EMAIL_TEMPLATES.get(lang, EMAIL_TEMPLATES['ko']))
    
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
        logger.error("이메일 발송 실패: %s", e)
        return False


WELCOME_TEMPLATES = {
    'ko': {
        'subject': 'Racconto에 오신 것을 환영합니다',
        'title': '이메일 인증에 성공하였습니다.',
        'body': (
            '이메일 인증이 성공적으로 완료되었습니다.<br><br>'
            '이제 Racconto와 함께 이야기를 시작할 모든 준비가 끝났습니다.<br>'
            '프로젝트를 만들고, 당신의 사진에 스토리를 담아보세요.<br><br>'
            '오픈 베타는 2026년 11월 30일까지 무료로 모든 기능을 이용하실 수 있습니다.'
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
            'Create a project and bring your photos to life.<br><br>'
            'The open beta is free for all features until November 30, 2026.'
        ),
        'button': 'Get Started',
        'closing': 'We\'re excited to see the stories you\'ll create.',
    },
    'ja': {
        'subject': 'Racconto へようこそ',
        'title': 'メール認証が完了しました。',
        'body': (
            'メール認証が正常に完了しました。<br><br>'
            'Racconto で写真のストーリーを語る準備が整いました。<br>'
            'プロジェクトを作成して、あなたの写真に物語を添えてみてください。<br><br>'
            'オープンベータ期間中（2026年11月30日まで）は、すべての機能を無料でご利用いただけます。'
        ),
        'button': 'Racconto を始める',
        'closing': 'あなたが生み出す素晴らしいストーリーを楽しみにしています。',
    },
}


def send_welcome_email(to_email: str, lang: str = 'ko'):
    t = _get_template('welcome', lang, WELCOME_TEMPLATES.get(lang, WELCOME_TEMPLATES['ko']))

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
        logger.error("웰컴 이메일 발송 실패: %s", e)
        return False


SOCIAL_WELCOME_TEMPLATES = {
    'ko': {
        'subject': 'Racconto에 오신 것을 환영합니다',
        'title': 'Racconto에 가입해 주셔서 감사합니다.',
        'body': (
            '소셜 계정으로 가입이 완료되었습니다.<br><br>'
            '이제 Racconto와 함께 이야기를 시작할 모든 준비가 끝났습니다.<br>'
            '프로젝트를 만들고, 당신의 사진에 스토리를 담아보세요.<br><br>'
            '오픈 베타는 2026년 11월 30일까지 무료로 모든 기능을 이용하실 수 있습니다.'
        ),
        'button': 'Racconto 시작하기',
        'closing': 'Racconto와 함께 멋진 이야기를 만들어가세요.',
    },
    'en': {
        'subject': 'Welcome to Racconto',
        'title': 'Thanks for joining Racconto.',
        'body': (
            'You\'ve successfully signed up with your social account.<br><br>'
            'You\'re all set to start telling your photo stories on Racconto.<br>'
            'Create a project and bring your photos to life.<br><br>'
            'The open beta is free for all features until November 30, 2026.'
        ),
        'button': 'Get Started',
        'closing': 'We\'re excited to see the stories you\'ll create.',
    },
    'ja': {
        'subject': 'Racconto へようこそ',
        'title': 'Racconto にご登録いただきありがとうございます。',
        'body': (
            'ソーシャルアカウントでの登録が完了しました。<br><br>'
            'Racconto で写真のストーリーを語る準備が整いました。<br>'
            'プロジェクトを作成して、あなたの写真に物語を添えてみてください。<br><br>'
            'オープンベータ期間中（2026年11月30日まで）は、すべての機能を無料でご利用いただけます。'
        ),
        'button': 'Racconto を始める',
        'closing': 'あなたが生み出す素晴らしいストーリーを楽しみにしています。',
    },
}


def send_social_welcome_email(to_email: str, lang: str = 'ko'):
    t = _get_template('social_welcome', lang, SOCIAL_WELCOME_TEMPLATES.get(lang, SOCIAL_WELCOME_TEMPLATES['ko']))

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
        logger.error("소셜 웰컴 이메일 발송 실패: %s", e)
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
    'ja': {
        'subject': 'Racconto の退会処理が完了しました',
        'title': 'ご利用ありがとうございました',
        'body': (
            'ご要望のとおり、退会処理が正常に完了しました。<br><br>'
            'アップロードされた写真およびすべての個人データは削除されました。<br>'
            'またいつでもご利用いただけますので、またのご登録をお待ちしております。'
        ),
        'closing': 'これまで Racconto をご利用いただき、誠にありがとうございました。',
    },
}


def send_farewell_email(to_email: str, lang: str = 'ko'):
    t = _get_template('farewell', lang, FAREWELL_TEMPLATES.get(lang, FAREWELL_TEMPLATES['ko']))

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
        logger.error("탈퇴 안내 이메일 발송 실패: %s", e)
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
        logger.error("공지 이메일 발송 실패 (%s): %s", to_email, e)