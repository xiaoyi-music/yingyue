import { useMemo, useRef, useEffect } from 'react'
import usePlayerStore from '../stores/playerStore'

function parseLRC(lrc) {
  if (!lrc) return []
  const lines = lrc.split('\n')
  const result = []
  const re = /^\[(\d{2}):(\d{2})(?:[.:](\d{2,3}))?\]/

  for (const line of lines) {
    const match = line.match(re)
    if (!match) continue
    const min = parseInt(match[1], 10)
    const sec = parseInt(match[2], 10)
    let ms = 0
    if (match[3]) {
      ms = parseInt(match[3], 10)
      if (match[3].length === 2) ms *= 10
    }
    const time = min * 60 + sec + ms / 1000
    const text = line.replace(re, '').trim()
    if (text) result.push({ time, text })
  }
  return result.sort((a, b) => a.time - b.time)
}

/**
 * 根据播放进度计算动态色相（0-360 度色环循环）
 * 每首歌播放完色相走一圈
 */
function useDynamicHue(currentTime, duration) {
  const progress = duration > 0 ? (currentTime / duration) : 0
  // 色相在 250-360 + 0-110 之间循环（紫→红→橙→黄），避开绿/青色（不够醒目）
  const hue = (250 + progress * 220) % 360
  return hue
}

export default function LyricsPanel() {
  const lyric = usePlayerStore((s) => s.lyric)
  const tlyric = usePlayerStore((s) => s.tlyric)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const containerRef = useRef(null)

  const parsedLyric = useMemo(() => parseLRC(lyric), [lyric])
  const parsedTLyric = useMemo(() => parseLRC(tlyric), [tlyric])
  const hue = useDynamicHue(currentTime, duration)

  const activeIndex = useMemo(() => {
    let idx = -1
    for (let i = 0; i < parsedLyric.length; i++) {
      if (currentTime >= parsedLyric[i].time) idx = i
      else break
    }
    return idx
  }, [currentTime, parsedLyric])

  // 自动滚动
  useEffect(() => {
    if (activeIndex < 0 || !containerRef.current) return
    const activeEl = containerRef.current.querySelector('[data-active="true"]')
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeIndex])

  if (parsedLyric.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-gray-500">
        暂无歌词
      </div>
    )
  }

  // 动态渐变颜色
  const primaryColor = `hsl(${hue}, 85%, 65%)`
  const secondaryColor = `hsl(${(hue + 40) % 360}, 75%, 60%)`
  const glowColor = `hsla(${hue}, 80%, 55%, 0.25)`

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto overscroll-contain"
      style={{ scrollBehavior: 'smooth' }}
    >
      {/* 动态背景渐变 */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-colors duration-1000"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${glowColor} 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 flex min-h-full flex-col justify-center px-4 py-6">
        {parsedLyric.map((line, i) => {
          const dist = Math.abs(i - activeIndex)
          const isActive = dist === 0
          const tLine = parsedTLyric.find(
            (tl) => Math.abs(tl.time - line.time) < 0.1
          )

          // 根据距离梯度缩放：当前行最大，渐远变小变淡
          const scale = isActive ? 1.15 : Math.max(0.75, 1 - dist * 0.08)
          const opacity = isActive ? 1 : Math.max(0.2, 1 - dist * 0.15)

          // 颜色渐变：当前行用动态渐变，附近行逐渐过渡到灰色
          let textStyle = {}
          if (isActive) {
            textStyle = {
              background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: `drop-shadow(0 0 8px ${glowColor})`,
              fontWeight: 600,
            }
          } else if (dist <= 3) {
            const blendRatio = dist / 3
            const fadedHue = (hue + dist * 30) % 360
            textStyle = {
              color: `hsla(${fadedHue}, ${70 - blendRatio * 60}%, ${80 - blendRatio * 40}%, ${1 - blendRatio * 0.6})`,
            }
          } else {
            textStyle = { color: `rgba(156, 163, 175, ${opacity})` }
          }

          return (
            <div
              key={i}
              data-active={isActive}
              className="cursor-pointer rounded-lg px-3 py-2 transition-all duration-500"
              style={{
                transform: `scale(${scale})`,
                opacity,
                backgroundColor: isActive
                  ? `hsla(${hue}, 60%, 50%, 0.08)`
                  : 'transparent',
              }}
              onClick={() => usePlayerStore.getState().seek(line.time)}
            >
              <p
                className="leading-relaxed transition-all duration-500"
                style={{
                  ...textStyle,
                  fontSize: isActive ? '1.35rem' : '0.875rem',
                  letterSpacing: isActive ? '0.02em' : 'normal',
                }}
              >
                {line.text}
              </p>
              {tLine && isActive && (
                <p
                  className="mt-0.5 text-xs transition-all duration-500"
                  style={{ color: `hsla(${hue}, 50%, 70%, 0.7)` }}
                >
                  {tLine.text}
                </p>
              )}
            </div>
          )
        })}

        <div className="h-[40vh]" />
      </div>
    </div>
  )
}
