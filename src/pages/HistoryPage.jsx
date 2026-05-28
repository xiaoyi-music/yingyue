import usePlayerStore from '../stores/playerStore'
import SongItem from '../components/SongItem'

export default function HistoryPage() {
  const playlist = usePlayerStore((s) => s.playlist)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const playIndex = usePlayerStore((s) => s.playIndex)
  const playHistory = usePlayerStore((s) => s.playHistory)
  const clearHistory = usePlayerStore((s) => s.clearHistory)

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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">播放历史</h1>
        {playHistory.length > 0 && (
          <button
            onClick={clearHistory}
            className="rounded-lg border border-gray-600 px-3 py-1.5 text-xs text-gray-400 transition hover:border-red-500 hover:text-red-400"
          >
            清空历史
          </button>
        )}
      </div>

      {playHistory.length === 0 ? (
        <div className="py-16 text-center">
          <svg className="mx-auto mb-4 h-12 w-12 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-gray-500">暂无播放记录</p>
          <p className="mt-1 text-xs text-gray-600">去搜索歌曲开始听歌吧</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {playHistory.map((song, i) => {
            const activeIdx = playlist.findIndex(
              (s) => s.id === song.id && s.source === song.source
            )
            return (
              <SongItem
                key={`hist:${song.source}:${song.id}:${i}`}
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
