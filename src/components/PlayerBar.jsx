import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import usePlayerStore, { PlayMode } from '../stores/playerStore'
import useAlbumArt from '../hooks/useAlbumArt'
import { simplify } from '../utils/simplify'

const modeLabels = { LOOP: '🔁', SINGLE: '🔂', SHUFFLE: '🔀' }
const modes = [PlayMode.LOOP, PlayMode.SINGLE, PlayMode.SHUFFLE]

function formatTime(s) {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function PlayerBar() {
  const navigate = useNavigate()
  const initAudio = usePlayerStore((s) => s.initAudio)
  const playlist = usePlayerStore((s) => s.playlist)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const volume = usePlayerStore((s) => s.volume)
  const loading = usePlayerStore((s) => s.loading)
  const error = usePlayerStore((s) => s.error)
  const playMode = usePlayerStore((s) => s.playMode)
  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const prev = usePlayerStore((s) => s.prev)
  const next = usePlayerStore((s) => s.next)
  const seek = usePlayerStore((s) => s.seek)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const setPlayMode = usePlayerStore((s) => s.setPlayMode)
  const playIndex = usePlayerStore((s) => s.playIndex)

  const song = playlist[currentIndex] ?? null
  const coverUrl = useAlbumArt(song?.source, song?.pic_id)

  // 初始化 audio 事件监听
  useEffect(() => { initAudio() }, [initAudio])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleProgressClick = useCallback(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      seek(ratio * duration)
    },
    [duration, seek],
  )

  const handleModeToggle = () => {
    const idx = modes.indexOf(playMode)
    setPlayMode(modes[(idx + 1) % modes.length])
  }

  if (playlist.length === 0) return null

  return (
    <div className="glass border-t border-gray-700">
      {/* 进度条 */}
      <div className="relative h-1 w-full bg-gray-700">
        <div
          className="absolute left-0 top-0 h-full bg-purple-500 transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute inset-0 cursor-pointer"
          onClick={handleProgressClick}
        />
      </div>

      <div className="flex items-center gap-2 px-3 py-2 sm:gap-4 sm:px-4">
        {/* 封面 + 歌曲信息 */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <button
            onClick={() => navigate('/now-playing')}
            className="flex-shrink-0 overflow-hidden rounded-lg transition hover:opacity-80"
            title="播放页"
          >
            {coverUrl ? (
              <img
                src={coverUrl}
                alt=""
                className={`h-10 w-10 rounded-lg object-cover sm:h-12 sm:w-12 ${isPlaying ? 'animate-spin-slow' : ''}`}
                style={{ animationDuration: '8s' }}
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-700 sm:h-12 sm:w-12">
                <svg className="h-5 w-5 text-gray-500 sm:h-6 sm:w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v9.28a4.39 4.39 0 0 0-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z" />
                </svg>
              </div>
            )}
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {song ? simplify(song.name) : '未选择'}
            </p>
            <p className="truncate text-xs text-gray-400">
              {song
                ? simplify(Array.isArray(song.artist) ? song.artist.join(', ') : song.artist)
                : ''}
            </p>
          </div>
          {error && (
            <span className="hidden flex-shrink-0 text-xs text-red-400 sm:inline">{error}</span>
          )}
        </div>

        {/* 播放控制 */}
        <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-3">
          <span className="w-8 text-right text-[10px] tabular-nums text-gray-400 sm:w-9 sm:text-xs">
            {formatTime(currentTime)}
          </span>

          <button
            onClick={handleModeToggle}
            className="text-xs text-gray-400 transition hover:text-white sm:text-sm"
            title={modeLabels[playMode]}
          >
            {modeLabels[playMode]}
          </button>

          <button
            onClick={prev}
            className="text-gray-300 transition hover:text-white active:scale-90"
          >
            <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
            </svg>
          </button>

          <button
            onClick={togglePlay}
            disabled={!song}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-white transition hover:bg-purple-400 active:scale-90 disabled:opacity-40 sm:h-10 sm:w-10"
          >
            {loading ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent sm:h-4 sm:w-4" />
            ) : isPlaying ? (
              <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="ml-0.5 h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={next}
            className="text-gray-300 transition hover:text-white active:scale-90"
          >
            <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="m6 18 8.5-6L6 6v12zm10-12v12h2V6h-2z" />
            </svg>
          </button>

          <span className="w-8 text-[10px] tabular-nums text-gray-400 sm:w-9 sm:text-xs">
            {formatTime(duration)}
          </span>
        </div>

        {/* 音量（小屏隐藏） */}
        <div className="hidden items-center gap-2 md:flex">
          <svg className="h-4 w-4 flex-shrink-0 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-gray-600 accent-purple-500"
          />
        </div>
      </div>
    </div>
  )
}
