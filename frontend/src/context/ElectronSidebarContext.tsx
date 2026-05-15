import { createContext, useContext, useState, useRef, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import exifr from 'exifr'
import { resizeImageInWorker } from '../utils/resizeImageWorker'
import ToastNotification from '../components/ToastNotification'

const API = import.meta.env.VITE_API_URL

type ExistingPhoto = {
  original_filename: string
  folder: string | null
  deleted_at: string | null
}

export interface UploadProgress {
  current: number
  total: number
  type: 'photo' | 'folder'
}

interface ElectronSidebarContextType {
  refreshTrigger: number
  triggerRefresh: () => void
  uploadInProgress: boolean
  setUploadInProgress: (v: boolean) => void
  uploadProgress: UploadProgress | null
  startUpload: (files: File[], projectId: string, existingPhotos: ExistingPhoto[], type: 'photo' | 'folder') => void
}

const ElectronSidebarContext = createContext<ElectronSidebarContextType>({
  refreshTrigger: 0,
  triggerRefresh: () => {},
  uploadInProgress: false,
  setUploadInProgress: () => {},
  uploadProgress: null,
  startUpload: () => {},
})

export function ElectronSidebarProvider({ children }: { children: ReactNode }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [uploadInProgress, setUploadInProgress] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1)

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, type })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }

  const startUpload = async (files: File[], projectId: string, existingPhotos: ExistingPhoto[], type: 'photo' | 'folder') => {
    setUploadInProgress(true)
    setUploadProgress({ current: 0, total: files.length, type })

    let failedCount = 0
    let successCount = 0
    let limitExceeded = false
    let skipCount = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setUploadProgress({ current: i + 1, total: files.length, type })

      try {
        const relativePath = (file as any).webkitRelativePath
        const folder = relativePath ? relativePath.split('/')[0] : null

        const isDuplicate = existingPhotos.some(
          p => p.original_filename === file.name && p.folder === folder && !p.deleted_at
        )
        if (isDuplicate) { skipCount++; successCount++; continue }

        {
          const exifData: Record<string, string> = {}
          try {
            const parsed = await exifr.parse(file, {
              pick: ['DateTimeOriginal', 'Make', 'Model', 'LensModel',
                     'ISO', 'ExposureTime', 'FNumber', 'FocalLength',
                     'GPSLatitude', 'GPSLongitude']
            })
            if (parsed) {
              if (parsed.DateTimeOriginal) exifData.taken_at = new Date(parsed.DateTimeOriginal).toISOString()
              if (parsed.Make || parsed.Model) exifData.camera = `${parsed.Make || ''} ${parsed.Model || ''}`.trim()
              if (parsed.LensModel) exifData.lens = parsed.LensModel
              if (parsed.ISO) exifData.iso = `ISO ${parsed.ISO}`
              if (parsed.ExposureTime) exifData.shutter_speed = parsed.ExposureTime < 1
                ? `1/${Math.round(1 / parsed.ExposureTime)}s`
                : `${parsed.ExposureTime.toFixed(1)}s`
              if (parsed.FNumber) exifData.aperture = `f/${parsed.FNumber.toFixed(1)}`
              if (parsed.FocalLength) exifData.focal_length = `${Math.round(parsed.FocalLength)}mm`
              if (parsed.GPSLatitude) exifData.gps_lat = String(parsed.GPSLatitude)
              if (parsed.GPSLongitude) exifData.gps_lng = String(parsed.GPSLongitude)
            }
          } catch {
            // EXIF 추출 실패 무시
          }

          const resizedBlob = await resizeImageInWorker(file)
          const { data: urlData } = await axios.get(`${API}/photos/cf-upload-url`)
          const { uploadURL } = urlData

          const formData = new FormData()
          formData.append('file', resizedBlob, file.name)
          const cfRes = await fetch(uploadURL, { method: 'POST', body: formData })
          const cfData = await cfRes.json()
          if (!cfData.success) throw new Error('CF upload failed')
          const imageUrl = cfData.result.variants[0]

          await axios.post(`${API}/photos/`, {
            project_id: projectId,
            image_url: imageUrl,
            folder,
            original_filename: file.name,
            source: 'web',
            ...exifData,
          })
        }
        successCount++

      } catch (error) {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined
        const detail = axios.isAxiosError(error) ? error.response?.data?.detail : undefined
        const code = typeof detail === 'object' ? detail.code : detail

        if (status === 401) {
          break
        } else if (code === 'PHOTO_LIMIT_EXCEEDED') {
          limitExceeded = true
          break
        } else {
          failedCount++
        }
      }
    }

    if (limitExceeded) {
      showToast(
        successCount > 0
          ? t('photo.upload.limitExceededPartial', { success: successCount })
          : t('photo.upload.limitExceeded'),
        'warning'
      )
    } else if (failedCount > 0) {
      showToast(t('photo.upload.fail', { count: failedCount }), 'error')
    } else if (successCount - skipCount > 0) {
      showToast(t('photo.upload.success', { count: successCount - skipCount }), 'success')
    } else if (skipCount > 0) {
      showToast(t('photo.upload.allSkipped', { count: skipCount }), 'warning')
    }

    try {
      await queryClient.invalidateQueries({ queryKey: ['photos', projectId] })
    } catch { /* ignore */ } finally {
      setUploadInProgress(false)
      setUploadProgress(null)
    }
  }

  return (
    <ElectronSidebarContext.Provider
      value={{ refreshTrigger, triggerRefresh, uploadInProgress, setUploadInProgress, uploadProgress, startUpload }}
    >
      {toast && (
        <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      {children}
    </ElectronSidebarContext.Provider>
  )
}

export const useElectronSidebar = () => useContext(ElectronSidebarContext)
