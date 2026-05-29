import { useEffect, useState } from 'react'
import { search } from '../services/api'
import SongItem from '../components/SongItem'
import usePlayerStore, { prefetchUrls } from '../stores/playerStore'

// 多样化的热门搜索词，覆盖华语/欧美/日韩流行
const hotQueries = [
  '周杰伦', '林俊杰', '陈奕迅', '邓紫棋', '李荣浩',
  'Taylor Swift', 'Ed Sheeran', 'The Weeknd',
  'BTS', 'BLACKPINK', 'IU',
  '米津玄师', 'YOASOBI',
  '晴天', 'Shape of You', 'Blinding Lights',
  '经典钢琴曲', '爵士', 'Lo-fi',
]

export default function HomePage() {
  const [featured, setFeatured] = useState([])
  const [loading, setLoading] = useState(true)

  const playlist = usePlayerStore((s) => s.playlist)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const playIndex = usePlayerStore((s) => s.playIndex)

  // 渐进式加载：每批结果显示出来，不等全部完成
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const seen = new Set()
    const addBatch = (songs) => {
      if (cancelled) return
      const newSongs = songs
        .filter((s) => s?.id)
        .filter((s) => {
          const k = `${s.source}:${s.id}`
          if (seen.has(k)) return false
          seen.add(k)
          return true
        })
      if (newSongs.length > 0) {
        setFeatured((prev) => [...prev, ...newSongs].slice(0, 50))
        setLoading(false)
        prefetchUrls(newSongs, 5)
      }
    }

    // 每次处理 3 个搜索词，渐进渲染
    const batchSize = 3
    let batchIndex = 0

    async function loadBatch() {
      if (cancelled) return
      const batch = hotQueries.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize)
      if (batch.length === 0) return

      try {
        const results = await Promise.all(
          batch.map((q) => search({ name: q, count: 5 }))
        )
        addBatch(results.flat())
      } catch { /* ignore */ }

      batchIndex++
      if (batchIndex * batchSize < hotQueries.length) {
        // 下一批无延迟，但给浏览器渲染机会
        setTimeout(() => loadBatch(), 0)
      }
    }

    loadBatch()
    return () => { cancelled = true }
  }, [])

  const handlePlay = (song) => {
    const store = usePlayerStore.getState()
    const existingIdx = store.playlist.findIndex(
      (s) => s.id === song.id && s.source === song.source
    )
    if (existingIdx >= 0) {
      playIndex(existingIdx)
    } else {
      store.playlist.push(song)
      usePlayerStore.setState({ playlist: [...store.playlist] })
      playIndex(store.playlist.length - 1)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">推荐歌曲</h1>

      {loading && featured.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          <span className="ml-3 text-sm text-gray-500">加载推荐中...</span>
        </div>
      )}

      {featured.length > 0 && (
        <div className="space-y-0.5">
          {featured.map((song, i) => {
            const activeIdx = playlist.findIndex(
              (s) => s.id === song.id && s.source === song.source
            )
            return (
              <SongItem
                key={`rec:${song.source}:${song.id}`}
                song={song}
                index={i}
                isActive={activeIdx >= 0 && activeIdx === currentIndex}
                onPlay={() => handlePlay(song)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
