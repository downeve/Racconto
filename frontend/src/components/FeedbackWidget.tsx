import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

declare const __APP_VERSION__: string;

const DISCORD_WEBHOOK_URL = import.meta.env.VITE_DISCORD_WEBHOOK_URL;

export default function FeedbackWidget() {
  const { t } = useTranslation(); // t 함수 준비
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // ─── 위치 조절을 위한 상태 추가 ───
  const [isShifted, setIsShifted] = useState(false);

  useEffect(() => {
    // 화면에 'top-button'이 있는지 체크하는 함수
    const checkTopButton = () => {
      const topBtn = document.getElementById('floating-top-button');
      setIsShifted(!!topBtn);
    };

    // DOM이 변경될 때마다 체크 (버튼이 생기거나 사라질 때)
    const observer = new MutationObserver(checkTopButton);
    observer.observe(document.body, { childList: true, subtree: true });

    // 초기 체크
    checkTopButton();

    return () => observer.disconnect();
  }, []);

  const handleSubmit = async () => {
    if (!DISCORD_WEBHOOK_URL) {
      console.error("Discord Webhook URL is missing.");
      setStatus('error');
      return;
    }
    if (!feedback.trim()) return;
    setStatus('loading');

    const isElectron = !!window.racconto;
    const appVersion = isElectron 
    ? (window.racconto?.version || 'Unknown') 
    : (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'web-dev');
    
    const userAgent = window.navigator.userAgent;

    // userAgent에서 OS 파싱
    const getOS = () => {
      if (userAgent.includes('Win')) return 'Windows'
      if (userAgent.includes('Mac')) return 'macOS'
      if (userAgent.includes('Linux')) return 'Linux'
      return 'Unknown'
    }

    // userAgent에서 브라우저 파싱
    const getBrowser = () => {
      if (userAgent.includes('Chrome')) return 'Chrome'
      if (userAgent.includes('Safari')) return 'Safari'
      if (userAgent.includes('Firefox')) return 'Firefox'
      if (userAgent.includes('Edg')) return 'Edge'
      return 'Unknown'
    }

    // OS/Browser 판별 로직은 그대로 사용하되, 가독성을 위해 Embed 구조로 변경
    const discordPayload = {
      embeds: [{
        title: "🚨 새로운 베타 피드백",
        description: feedback,
        color: 0x2b2d31, // 어두운 회색
        fields: [
          { name: "플랫폼", value: isElectron ? `Electron` : `Web`, inline: true },
          { name: "App Version", value: `v${appVersion}`, inline: true },
          { name: "OS/Browser", value: `${getOS()} / ${getBrowser()}`, inline: true },
          { name: "User Agent", value: `\`\`\`${userAgent.substring(0, 150)}\`\`\`` }
        ],
        timestamp: new Date().toISOString()
      }]
    };
    
    try {
      const response = await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordPayload),
      });

      if (!response.ok) throw new Error('Network response was not ok');
      
      setStatus('success');
        setTimeout(() => {
          setIsOpen(false);
          setFeedback('');
          setStatus('idle');
        }, 2000);
      } catch (error) {
        console.error("Feedback submission failed:", error);
        setStatus('error');
      }
    };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        // isShifted가 true면 bottom-[88px](위로 이동), false면 bottom-6(기본)
        className={`fixed right-8 ${isShifted ? 'bottom-[84px]' : 'bottom-6'} bg-stone-800 text-white p-3 rounded-full shadow-lg hover:bg-stone-600 transition-all duration-300 z-50 flex items-center justify-center w-12 h-12`}
        title={t('feedback.buttonTitle')}
      >
        💬
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 font-sans">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-600"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-stone-900 mb-2">
              {t('feedback.modalTitle')}
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              {t('feedback.modalDesc')}
            </p>
            
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={t('feedback.placeholder')}
              className="w-full h-32 p-3 border border-stone-200 rounded text-sm focus:outline-none focus:border-stone-500 resize-none mb-4"
              disabled={status === 'loading' || status === 'success'}
            />

            <button
              onClick={handleSubmit}
              disabled={status === 'loading' || status === 'success' || !feedback.trim()}
              className="w-full py-2.5 bg-stone-900 text-white text-sm font-semibold rounded hover:bg-stone-700 disabled:bg-stone-300 transition-colors"
            >
              {status === 'idle' && t('feedback.send')}
              {status === 'loading' && t('feedback.sending')}
              {status === 'success' && t('feedback.success')}
              {status === 'error' && t('feedback.error')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}