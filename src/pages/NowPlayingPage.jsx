import { useState, useMemo, useRef } from 'react'
import usePlayerStore, { PlayMode } from '../stores/playerStore'
import useAlbumArt from '../hooks/useAlbumArt'
import { simplify } from '../utils/simplify'
import { parseLyrics, fillWordTiming } from '../utils/lyricsParser'
import LyricRenderer from '../components/LyricRenderer'
import Particles from '../components/Particles'

function formatTime(s) {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

const modeLabels = { LOOP: '🔁', SINGLE: '🔂', SHUFFLE: '🔀' }

export default function NowPlayingPage() {
  const playlist = usePlayerStore((s) => s.playlist)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const volume = usePlayerStore((s) => s.volume)
  const loading = usePlayerStore((s) => s.loading)
  const lyric = usePlayerStore((s) => s.lyric)
  const tlyric = usePlayerStore((s) => s.tlyric)
  const playMode = usePlayerStore((s) => s.playMode)

  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const prev = usePlayerStore((s) => s.prev)
  const next = usePlayerStore((s) => s.next)
  const seek = usePlayerStore((s) => s.seek)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const setPlayMode = usePlayerStore((s) => s.setPlayMode)

  const song = playlist[currentIndex] ?? null
  const coverUrl = useAlbumArt(song?.source, song?.pic_id, 500)

  // 歌词弹窗状态
  const [showLyrics, setShowLyrics] = useState(false)
  const lyricRef = useRef(null)

  const timedLyrics = useMemo(() => fillWordTiming(parseLyrics(lyric)), [lyric])
  const parsedTLyric = useMemo(() => parseLyrics(tlyric), [tlyric])

  const progress = duration > 0 ? currentTime / duration : 0
  const hue = (250 + progress * 220) % 360

  return (
    <div className="relative flex h-full flex-col bg-gray-900 overflow-hidden">
      {/* ===== 歌词弹窗 ===== */}
      {showLyrics && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-950/95">
          {/* 模糊背景 */}
          {coverUrl && (
            <div className="absolute inset-0">
              <img src={coverUrl} alt="" className="h-full w-full scale-110 object-cover"
                style={{ filter: 'blur(40px) brightness(0.25)' }} />
            </div>
          )}

          <Particles hue={hue} isPlaying={isPlaying} />

          {/* 顶部 */}
          <div className="relative z-10 flex items-center justify-between px-4 py-3">
            <span className="text-xs tabular-nums text-gray-500">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <span className="text-xs text-gray-500">{song ? simplify(song.name) : ''}</span>
            <button
              onClick={() => setShowLyrics(false)}
              className="rounded-full bg-white/10 px-4 py-1.5 text-sm text-white hover:bg-white/20 transition"
            >
              关闭
            </button>
          </div>

          {/* 歌词 */}
          <div className="relative z-10 flex-1 min-h-0">
            <LyricRenderer
              ref={lyricRef}
              lyrics={timedLyrics}
              tLyrics={parsedTLyric}
              currentTime={currentTime}
              duration={duration}
              hue={hue}
              isPlaying={isPlaying}
              onSeek={seek}
              className="h-full"
            />
          </div>
        </div>
      )}

      {/* ===== 封面 + 歌曲信息 ===== */}
      <div className="relative flex flex-shrink-0 flex-col items-center justify-center px-6 pt-10 pb-4">
        <div
          className="absolute inset-0 transition-colors duration-1000"
          style={{ background: `linear-gradient(180deg, hsla(${hue},50%,30%,0.35) 0%, transparent 100%)` }}
        />
        <Particles hue={hue} isPlaying={isPlaying} />

        <div className="relative z-10 mb-6 w-56 overflow-hidden rounded-2xl shadow-2xl sm:w-64">
          {coverUrl ? (
            <img
              src={coverUrl} alt=""
              className={`aspect-square w-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-105' : 'scale-100'}`}
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center bg-gray-800">
              <svg className="h-16 w-16 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v9.28a4.39 4.39 0 0 0-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z" />
              </svg>
            </div>
          )}
        </div>

        <div className="relative z-10 text-center">
          <h1 className="text-lg font-bold text-white">{song ? simplify(song.name) : '未选择'}</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            {song ? simplify(Array.isArray(song.artist) ? song.artist.join(', ') : song.artist) : ''}
            {song?.album ? ` · ${simplify(song.album)}` : ''}
          </p>
        </div>
      </div>

      {/* ===== 歌词按钮 + 空间 ===== */}
      <div className="flex flex-1 items-start justify-center">
        <button
          onClick={() => setShowLyrics(true)}
          disabled={!song || timedLyrics.length === 0}
          className="rounded-full border border-purple-500/50 px-5 py-1.5 text-sm text-purple-400
            hover:bg-purple-500/20 hover:border-purple-400 hover:text-purple-300
            active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          词
        </button>
      </div>

      {/* ===== 底部控件 ===== */}
      <div className="flex-shrink-0 border-t border-gray-800 bg-gray-900/95 px-4 pb-3 pt-2 backdrop-blur">
        {/* 进度条 */}
        <div className="mb-2">
          <div
            className="group relative h-2 cursor-pointer rounded-full bg-gray-700"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const r = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
              seek(r * duration)
            }}
          >
            <div
              className="h-full rounded-full transition-colors duration-300"
              style={{
                width: `${progress * 100}%`,
                background: `linear-gradient(90deg, hsl(${hue},80%,55%), hsl(${(hue+30)%360},70%,50%))`,
              }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
              style={{ left: `${progress * 100}%` }}
            >
              <div className="h-3.5 w-3.5 rounded-full bg-white shadow-lg ring-2 ring-purple-500" />
            </div>
          </div>
          <div className="mt-1 flex justify-between text-xs tabular-nums text-gray-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              const modes = [PlayMode.LOOP, PlayMode.SINGLE, PlayMode.SHUFFLE]
              setPlayMode(modes[(modes.indexOf(playMode) + 1) % modes.length])
            }}
            className="w-10 text-center text-sm text-gray-400"
          >
            {modeLabels[playMode]}
          </button>

          <div className="flex items-center gap-5">
            <button onClick={prev} className="text-gray-300 active:scale-90">
              <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z" />
              </svg>
            </button>

            <button
              onClick={togglePlay}
              className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition active:scale-90"
              style={{ background: `linear-gradient(135deg, hsl(${hue},70%,50%), hsl(${(hue+30)%360},60%,45%))` }}
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : isPlaying ? (
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="ml-0.5 h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button onClick={next} className="text-gray-300 active:scale-90">
              <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="m6 18 8.5-6L6 6v12zm10-12v12h2V6h-2z" />
              </svg>
            </button>
          </div>

          <button
            onClick={() => setShowLyrics(true)}
            disabled={!song || timedLyrics.length === 0}
            className="w-10 text-center text-sm text-purple-400 hover:text-purple-300
              disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="查看歌词"
          >
            词
          </button>
        </div>

        {/* 音量 */}
        <div className="mt-2 flex items-center justify-center gap-2">
          <svg className="h-3 w-3 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3z" />
          </svg>
          <input
            type="range" min="0" max="1" step="0.05" value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-gray-700 accent-purple-500"
          />
        </div>

        <p className="mt-1.5 text-center text-xs text-gray-600">
          {timedLyrics.length > 0 ? '点击「词」查看歌词' : '暂无歌词'}
        </p>
      </div>
    </div>
  )
}
