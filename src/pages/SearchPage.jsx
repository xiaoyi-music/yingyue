import { useState } from 'react'
import { search as searchApi } from '../services/api'
import SongItem from '../components/SongItem'
import usePlayerStore, { prefetchUrls } from '../stores/playerStore'

const sources = [
  { value: 'joox', label: 'Joox' },
  { value: 'netease', label: 'NetEase' },
  { value: 'kuwo', label: 'KuWo' },
]

export default function SearchPage() {
  const [keyword, setKeyword] = useState('')
  const [source, setSource] = useState('joox')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  // 搜索历史
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('searchHistory') || '[]') }
    catch { return [] }
  })

  const playlist = usePlayerStore((s) => s.playlist)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const playIndex = usePlayerStore((s) => s.playIndex)

  const handleSearch = async (e) => {
    e.preventDefault()
    const kw = keyword.trim()
    if (!kw) return

    setLoading(true)
    setSearched(true)

    // 保存搜索历史
    const newHistory = [kw, ...history.filter((h) => h !== kw)].slice(0, 10)
    setHistory(newHistory)
    localStorage.setItem('searchHistory', JSON.stringify(newHistory))

    try {
      const data = await searchApi({ source, name: kw, count: 30 })
      const list = Array.isArray(data) ? data : []
      setResults(list)
      if (list.length > 0) prefetchUrls(list, 5)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handlePlay = (song) => {
    const existingIdx = playlist.findIndex(
      (s) => s.id === song.id && s.source === song.source
    )
    if (existingIdx >= 0) {
      playIndex(existingIdx)
    } else {
      const store = usePlayerStore.getState()
      store.playlist.push(song)
      usePlayerStore.setState({ playlist: [...store.playlist] })
      playIndex(store.playlist.length - 1)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">搜索</h1>

      {/* 搜索表单 */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 text-sm text-white outline-none focus:border-purple-500"
        >
          {sources.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="歌名 / 歌手 / 专辑..."
          className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-400 outline-none focus:border-purple-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-purple-500 disabled:opacity-50"
        >
          {loading ? '...' : '搜索'}
        </button>
      </form>

      {/* 搜索历史 */}
      {!searched && history.length > 0 && (
        <div className="mb-6">
          <p className="mb-2 text-xs text-gray-500">搜索历史</p>
          <div className="flex flex-wrap gap-2">
            {history.map((h) => (
              <button
                key={h}
                onClick={() => { setKeyword(h); handleSearch({ preventDefault: () => {} }) }}
                className="rounded-full border border-gray-600 px-3 py-1 text-xs text-gray-300 transition hover:border-purple-500 hover:text-purple-400"
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 结果 */}
      {loading && (
        <p className="py-12 text-center text-sm text-gray-500">搜索中...</p>
      )}
      {!loading && searched && results.length === 0 && (
        <p className="py-12 text-center text-sm text-gray-500">未找到结果</p>
      )}
      {results.length > 0 && (
        <div className="space-y-0.5">
          {results.map((song, i) => {
            const activeIdx = playlist.findIndex(
              (s) => s.id === song.id && s.source === song.source
            )
            return (
              <SongItem
                key={`${song.source}:${song.id}:${i}`}
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
