import { useState, useEffect } from 'react'
import { getAlbumArt } from '../services/api'

const cache = new Map()

export default function useAlbumArt(source, picId, size = 300) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (!source || !picId) { setUrl(''); return }
    const key = `${source}:${picId}:${size}`
    if (cache.has(key)) { setUrl(cache.get(key)); return }

    let cancelled = false
    getAlbumArt({ source, id: picId, size })
      .then((data) => {
        if (!cancelled && data.url) {
          cache.set(key, data.url)
          setUrl(data.url)
        }
      })
      .catch(() => { if (!cancelled) setUrl('') })

    return () => { cancelled = true }
  }, [source, picId])

  return url
}
