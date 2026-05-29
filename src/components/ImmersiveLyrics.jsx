import { useRef, useCallback, useState } from 'react'
import LyricRenderer from './LyricRenderer'
import Particles from './Particles'

function formatTime(s) {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

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
  const lyricRef = useRef(null)

  // 手势：水平→调进度 / 垂直→滚歌词 / 向下划→退出
  const touchStart = useRef({ x: 0, y: 0, seekStartTime: 0 })
  const gesture = useRef(null)

  const handleTouchStart = useCallback((e) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      seekStartTime: currentTime,
    }
    gesture.current = null
  }, [currentTime])

  const handleTouchMove = useCallback((e) => {
    const dx = e.touches[0].clientX - touchStart.current.x
    const dy = e.touches[0].clientY - touchStart.current.y

    if (!gesture.current) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
        gesture.current = 'seek'
      } else if (Math.abs(dy) > 8) {
        gesture.current = 'scroll'
      }
    }

    if (gesture.current === 'seek') {
      const ratio = dx / window.innerWidth
      const t = Math.max(0, Math.min(duration, touchStart.current.seekStartTime + ratio * duration))
      onSeek(t)
    } else if (gesture.current === 'scroll') {
      // 通过 ref 控制 LyricRenderer 滚动
      lyricRef.current?.addScroll(-dy * 2)
      touchStart.current.y = e.touches[0].clientY
    }
  }, [duration, onSeek])

  const handleTouchEnd = useCallback((e) => {
    const dy = e.changedTouches[0].clientY - touchStart.current.y
    const dx = Math.abs(e.changedTouches[0].clientX - touchStart.current.x)
    if (dy > 50 && dy > dx) onClose()
  }, [onClose])

  // 双击跳转
  const lastClick = useRef(0)
  const handleLineClick = useCallback((time) => {
    const now = Date.now()
    if (now - lastClick.current < 300) onSeek(time)
    lastClick.current = now
  }, [onSeek])

  // 长按复制
  const longPressTimer = useRef(null)
  const handleLongPress = useCallback((i) => {
    longPressTimer.current = setTimeout(() => {
      const line = timedLyrics[i]
      if (line) {
        navigator.clipboard?.writeText(line.text).catch(() => {})
        setCopiedIdx(i)
        setTimeout(() => setCopiedIdx(null), 1500)
      }
    }, 600)
  }, [timedLyrics])
  const cancelLongPress = useCallback(() => clearTimeout(longPressTimer.current), [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950/95">
      {coverUrl && (
        <div className="absolute inset-0">
          <img src={coverUrl} alt="" className="h-full w-full scale-110 object-cover"
            style={{ filter: 'blur(40px) brightness(0.25)' }} />
        </div>
      )}

      <Particles hue={hue} isPlaying={isPlaying} />

      {/* 顶部栏 */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3">
        <span className="text-xs tabular-nums text-gray-500">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <span className="text-xs text-gray-600">← 调进度 · 上下滑歌词 →</span>
        <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:text-white">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* 歌词区 — 手势在此层处理 */}
      <div
        className="relative z-10 flex-1 min-h-0"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <LyricRenderer
          ref={lyricRef}
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

      <div className="relative z-10 flex justify-around border-t border-white/5 px-4 py-2 text-xs text-gray-600">
        <span>← 滑动调进度 →</span>
        <span>↑↓ 滚动歌词</span>
        <span>↓ 下滑退出</span>
      </div>
    </div>
  )
}
