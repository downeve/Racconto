let _worker: Worker | null = null

function getWorker(): Worker {
  if (!_worker) {
    _worker = new Worker(new URL('../workers/resizeWorker.ts', import.meta.url), { type: 'module' })
  }
  return _worker
}

export function resizeImageInWorker(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const worker = getWorker()

    const onMessage = (e: MessageEvent<{ blob: Blob | null; error?: string }>) => {
      cleanup()
      if (e.data.error) {
        reject(new Error(e.data.error))
      } else {
        resolve(e.data.blob ?? file)
      }
    }

    const onError = (e: ErrorEvent) => {
      cleanup()
      reject(new Error(e.message))
    }

    function cleanup() {
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
    }

    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError)
    worker.postMessage({ file })
  })
}
