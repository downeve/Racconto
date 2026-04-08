import { useState, useEffect } from 'react'

export default function FolderWatcher() {
  const [folderPath, setFolderPath] = useState<string | null>(null)
  const [watching, setWatching] = useState(false)
  const [addedFiles, setAddedFiles] = useState<string[]>([])
  const [deletedFiles, setDeletedFiles] = useState<string[]>([])

  useEffect(() => {
    if (!window.racconto) return
    window.racconto.onNewFile((filePath: string) => {
      setAddedFiles((prev) => [filePath, ...prev])
    })
    window.racconto.onDeletedFile((filePath: string) => {
      setDeletedFiles((prev) => [filePath, ...prev])
    })
  }, [])

  const handleSelectFolder = async () => {
    if (!window.racconto) return
    const selected = await window.racconto.openFolder()
    if (selected) setFolderPath(selected)
  }

  const handleStartWatcher = async () => {
    if (!folderPath || !window.racconto) return
    await window.racconto.startWatcher(folderPath)
    setWatching(true)
  }

  const handleStopWatcher = async () => {
    if (!window.racconto) return
    await window.racconto.stopWatcher()
    setWatching(false)
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">폴더 감시 테스트</h1>

      <div className="space-y-4">
        <div>
          <button onClick={handleSelectFolder}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            폴더 선택
          </button>
          {folderPath && <p className="mt-2 text-sm text-gray-600">{folderPath}</p>}
        </div>

        <div className="flex gap-2">
          <button onClick={handleStartWatcher} disabled={!folderPath || watching}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-40">
            감시 시작
          </button>
          <button onClick={handleStopWatcher} disabled={!watching}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-40">
            감시 중지
          </button>
        </div>

        {watching && <p className="text-green-600 font-medium">● 감시 중...</p>}

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">➕ 추가된 파일</h2>
            {addedFiles.length === 0
              ? <p className="text-gray-400 text-sm">없음</p>
              : <ul className="space-y-1">
                  {addedFiles.map((f, i) => (
                    <li key={i} className="text-sm font-mono bg-green-50 px-3 py-1 rounded">{f}</li>
                  ))}
                </ul>
            }
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2">🗑️ 삭제된 파일</h2>
            {deletedFiles.length === 0
              ? <p className="text-gray-400 text-sm">없음</p>
              : <ul className="space-y-1">
                  {deletedFiles.map((f, i) => (
                    <li key={i} className="text-sm font-mono bg-red-50 px-3 py-1 rounded">{f}</li>
                  ))}
                </ul>
            }
          </div>
        </div>
      </div>
    </div>
  )
}