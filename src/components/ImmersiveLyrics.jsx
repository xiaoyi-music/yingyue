import { useRef, useCallback, useState } from 'react'
import LyricRenderer from './LyricRenderer'
import Particles from './Particles'

function formatTime(s) {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

/**
 * 沉浸式全屏歌词
 * - 背景：封面模糊 + 压暗 + 粒子
 * - 左右滑动调进度
 * - 双击跳转 / 长按复制
 * - 下滑退出
 */
export default function ImmersiveLyrics({
  timedLyrics,
  parsedTLyric,
  currentTime,
  duration,
  hue,
  coverUrl,
  isPlaying,
  onClose,
  onSeek,
}) {
  const [copiedIdx, setCopiedIdx] = useState(null)

  // ---- 左右滑动调进度 ----
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const seekStartTime = useRef(0)

  const handleTouchStart = useCallback(
    (e) => {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
      seekStartTime.current = currentTime
    },
    [currentTime],
  )

  const handleTouchMove = useCallback(
    (e) => {
      const dx = e.touches[0].clientX - touchStartX.current
      const ratio = dx / window.innerWidth
      const t = Math.max(0, Math.min(duration, seekStartTime.current + ratio * duration))
      onSeek(t)
    },
    [duration, onSeek],
  )

  const handleTouchEnd = useCallback(
    (e) => {
      const dy = e.changedTouches[0].clientY - touchStartY.current
      const dx = Math.abs(e.changedTouches[0].clientX - touchStartX.current)
      if (dy > 50 && dy > dx) onClose()
    },
    [onClose],
  )

  // ---- 双击跳转 ----
  const lastClick = useRef(0)
  const handleLineClick = useCallback(
    (time) => {
      const now = Date.now()
      if (now - lastClick.current < 300) onSeek(time)
      lastClick.current = now
    },
    [onSeek],
  )

  // ---- 长按复制 ----
  const longPressTimer = useRef(null)
  const handleLongPress = useCallback(
    (i) => {
      longPressTimer.current = setTimeout(() => {
        const line = timedLyrics[i]
        if (line) {
          navigator.clipboard?.writeText(line.text).catch(() => {})
          setCopiedIdx(i)
          setTimeout(() => setCopiedIdx(null), 1500)
        }
      }, 600)
    },
    [timedLyrics],
  )
  const cancelLongPress = useCallback(() => clearTimeout(longPressTimer.current), [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950/95">
      {/* 背景：模糊封面 */}
      {coverUrl && (
        <div className="absolute inset-0">
          <img src={coverUrl} alt="" className="h-full w-full scale-110 object-cover"
            style={{ filter: 'blur(40px) brightness(0.25)' }} />
        </div>
      )}

      {/* 粒子 */}
      <Particles hue={hue} isPlaying={isPlaying} />

      {/* 顶部栏 */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3">
        <span className="text-xs tabular-nums text-gray-500">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <span className="text-xs text-gray-600 tracking-wider">← 滑动调进度 →</span>
        <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:text-white">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* 歌词渲染器 — 复用 RAF 引擎 */}
      <div
        className="relative z-10 flex-1 min-h-0"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <LyricRenderer
          lyrics={timedLyrics}
          tLyrics={parsedTLyric}
          currentTime={currentTime}
          duration={duration}
          hue={hue}
          isPlaying={isPlaying}
          onSeek={handleLineClick}
          className="h-full"
        />
      </div>

      {/* 底部提示栏 */}
      <div className="relative z-10 flex justify-around border-t border-white/5 px-4 py-2 text-xs text-gray-600">
        <span>← 滑动调进度 →</span>
        <span>↓ 下滑退出</span>
      </div>
    </div>
  )
}
