import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface NavbarProps {
  onLogout: () => void
}

export default function Navbar({ onLogout }: NavbarProps) {
  const { t, i18n } = useTranslation() // 👈 2. i18n 객체 가져오기

  // 👈 3. 언어 토글 함수 (현재 'ko'면 'en'으로, 아니면 'ko'로 변경)
  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ko' ? 'en' : 'ko'
    i18n.changeLanguage(nextLang)
    
    // (보너스) 사용자가 선택한 언어를 로컬 스토리지에 저장해두면 
    // 새로고침하거나 나중에 다시 접속해도 언어가 유지됩니다!
    localStorage.setItem('app_language', nextLang) 
  }

  return (
    <nav className="bg-black text-white px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-widest">FotoPM</Link>
        <div className="flex gap-8 items-center">
          <Link to="/projects" className="text-sm tracking-wider hover:text-gray-300">{t('nav.projects')}</Link>
          <Link to="/portfolio" className="text-sm tracking-wider hover:text-gray-300">{t('nav.portfolio')}</Link>
          <Link to="/trash" className="text-sm tracking-wider hover:text-gray-300">{t('nav.trash')}</Link>
          <Link to="/settings" className="text-sm tracking-wider hover:text-gray-300">{t('nav.settings')}</Link>
          
          {/* 👈 4. 언어 변경 버튼 추가 (로그아웃 버튼 바로 왼쪽 쯤이 좋습니다) */}
          <button
            onClick={toggleLanguage}
            className="text-sm font-bold text-gray-300 hover:text-white transition-colors"
          >
            {i18n.language === 'ko' ? 'EN' : 'KO'}
          </button>

          <button
            onClick={onLogout}
            className="text-sm tracking-wider text-gray-400 hover:text-white"
          >
            로그아웃
          </button>
        </div>
      </div>
    </nav>
  )
}