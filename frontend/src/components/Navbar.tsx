import { Link } from 'react-router-dom'

interface NavbarProps {
  onLogout: () => void
}

export default function Navbar({ onLogout }: NavbarProps) {
  return (
    <nav className="bg-black text-white px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-widest">FotoPM</Link>
        <div className="flex gap-8 items-center">
          <Link to="/projects" className="text-sm tracking-wider hover:text-gray-300">PROJECTS</Link>
          <Link to="/portfolio" className="text-sm tracking-wider hover:text-gray-300">PORTFOLIO</Link>
          <Link to="/trash" className="text-sm tracking-wider hover:text-gray-300">🗑</Link>
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