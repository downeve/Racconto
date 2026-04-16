import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // i18n 임포트

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

    try {
      await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🚨 **New Beta Feedback**\n\`\`\`${feedback}\`\`\``,
        }),
      });
      setStatus('success');
      setTimeout(() => {
        setIsOpen(false);
        setFeedback('');
        setStatus('idle');
      }, 2000);
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        // isShifted가 true면 bottom-18(위로 이동), false면 bottom-6(기본)
        className={`fixed right-8 ${isShifted ? 'bottom-24' : 'bottom-6'} bg-stone-600 text-white p-3 rounded-full shadow-lg hover:bg-stone-900 transition-all duration-300 z-50 flex items-center justify-center w-12 h-12`}
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