import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

const API = 'http://localhost:8000'

interface Project {
  id: string
  title: string
  title_en: string
  description: string
  description_en: string
  status: string
  location: string
  is_public: string
}

interface Photo {
  id: string
  image_url: string
  caption: string
  is_portfolio: string
}

export default function ProjectDetail() {
  const { id } = useParams()
  const [project, setProject] = useState<Project | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)

  const fetchPhotos = async () => {
    if (!id) return
    const res = await axios.get(`${API}/photos/?project_id=${id}`)
    setPhotos(res.data)
  }

  useEffect(() => {
    if (!id) return
    axios.get(`${API}/projects/${id}`).then(res => setProject(res.data))
    fetchPhotos()
  }, [id])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !id) return
    setUploading(true)

    const files = Array.from(e.target.files)
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('project_id', id)
      await axios.post(`${API}/photos/upload?project_id=${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    }

    await fetchPhotos()
    setUploading(false)
    e.target.value = ''
  }

  const handleTogglePortfolio = async (photo: Photo) => {
    const newValue = photo.is_portfolio === 'true' ? 'false' : 'true'
    await axios.put(`${API}/photos/${photo.id}`, {
      ...photo,
      is_portfolio: newValue
    })
    fetchPhotos()
  }

  const handleDelete = async (photoId: string) => {
    await axios.delete(`${API}/photos/${photoId}`)
    fetchPhotos()
  }

  if (!project) return <div className="p-6 text-gray-400">로딩 중...</div>

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-1">{project.title}</h2>
        {project.title_en && <p className="text-gray-400 mb-4">{project.title_en}</p>}
        {project.location && <p className="text-sm text-gray-500 mb-4">📍 {project.location}</p>}
        {project.description && <p className="text-gray-700 mb-2">{project.description}</p>}
        {project.description_en && <p className="text-gray-500 text-sm">{project.description_en}</p>}
      </div>

      {/* 업로드 버튼 */}
      <div className="mb-6">
        <label className="cursor-pointer bg-black text-white px-4 py-2 text-sm tracking-wider hover:bg-gray-800 inline-block">
          {uploading ? '업로드 중...' : '+ 사진 업로드'}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
        <span className="ml-3 text-xs text-gray-400">JPG, PNG, WebP 지원 / 여러 장 동시 업로드 가능</span>
      </div>

      {/* 사진 그리드 */}
      <div className="grid grid-cols-2 gap-4">
        {photos.map(photo => (
          <div key={photo.id} className="relative group rounded overflow-hidden bg-gray-100">
            <img
              src={photo.image_url}
              alt={photo.caption}
              className="w-full object-cover"
            />
            {/* 호버 시 컨트롤 */}
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                onClick={() => handleTogglePortfolio(photo)}
                className={`px-3 py-1 text-xs rounded ${photo.is_portfolio === 'true' ? 'bg-green-500 text-white' : 'bg-white text-black'}`}
              >
                {photo.is_portfolio === 'true' ? '✓ 포트폴리오' : '포트폴리오 추가'}
              </button>
              <button
                onClick={() => handleDelete(photo.id)}
                className="px-3 py-1 text-xs bg-red-500 text-white rounded"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>

      {photos.length === 0 && !uploading && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-2">아직 사진이 없어요</p>
          <p className="text-sm">위 버튼으로 사진을 업로드해봐요</p>
        </div>
      )}
    </div>
  )
}