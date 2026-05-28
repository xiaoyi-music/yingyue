import { useRef, useEffect, useMemo, useCallback } from 'react'

const LINE_HEIGHT = 52
const COMPACT_HEIGHT = 40
const LERP = 0.10

// ---- 逐字渐变色计算 ----
function charStyle(word, t, hue) {
  if (t >= word.end) {
    return {
      color: `hsl(${hue}, 80%, 65%)`,
      textShadow: `0 0 8px hsla(${hue}, 80%, 55%, 0.4)`,
      fontWeight: 700,
      transform: 'scale(1.05)',
    }
  }
  if (t <= word.start) {
    return {
      color: 'rgba(156,163,175,0.3)',
      fontWeight: 400,
      transform: 'scale(1)',
    }
  }
  // 正在过渡：linear-gradient 逐字填充
  const pct = ((t - word.start) / (word.end - word.start)) * 100
  return {
    background: `linear-gradient(to right, hsl(${hue}, 80%, 65%) ${pct}%, rgba(156,163,175,0.3) ${pct}%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontWeight: 700,
    textShadow: `0 0 6px hsla(${hue}, 80%, 55%, 0.3)`,
    transform: 'scale(1.05)',
  }
}

/**
 * 查找浮点行索引（行号 + 行内进度）
 * 跨行插值 → 滚动位置连续变化，无顿挫
 */
function findFloatIndex(lyrics, t) {
  if (!lyrics.length) return 0
  let idx = -1
  for (let i = 0; i < lyrics.length; i++) {
    if (t >= lyrics[i].time) idx = i
    else break
  }
  if (idx < 0) return 0
  const line = lyrics[idx]
  const dur = line.endTime - line.time
  const prog = dur > 0 ? Math.min(1, (t - line.time) / dur) : 0
  return idx + prog
}

// ===================== 组件 =====================

export default function LyricRenderer({
  lyrics,
  currentTime,
  duration,
  hue = 280,
  tLyrics = null,
  isPlaying = false,
  onSeek,
  compact = false,
  className = '',
}) {
  const containerRef = useRef(null)
  const wrapperRef = useRef(null)

  // 用 ref 存储最新值，避免 RAF 循环重建
  const timeRef = useRef(currentTime)
  const playingRef = useRef(isPlaying)
  const lyricsRef = useRef(lyrics)

  timeRef.current = currentTime
  playingRef.current = isPlaying
  lyricsRef.current = lyrics

  const lineH = compact ? COMPACT_HEIGHT : LINE_HEIGHT

  // 计算整数 activeIndex（用于渲染逐字染色）
  const activeIdx = useMemo(() => {
    if (!lyrics.length) return -1
    let idx = -1
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) idx = i
      else break
    }
    return idx < 0 ? 0 : idx
  }, [currentTime, lyrics])

  // ---- 核心：单一 RAF 滚动循环 ----
  useEffect(() => {
    const container = containerRef.current
    const wrapper = wrapperRef.current
    if (!container || !wrapper) return

    let displayY = 0
    let raf

    function tick() {
      const ly = lyricsRef.current
      if (!ly.length) { raf = requestAnimationFrame(tick); return }

      // 每帧计算容器尺寸（处理 resize）
      const containerH = container.clientHeight
      const centerOffset = (containerH - lineH) / 2

      const t = timeRef.current
      const floatIdx = findFloatIndex(ly, t)
      const targetY = -(floatIdx * lineH) + centerOffset

      // Lerp 平滑追踪
      const speed = playingRef.current ? LERP : 0.3
      displayY += (targetY - displayY) * speed

      if (Math.abs(targetY - displayY) < 0.15) displayY = targetY

      wrapper.style.transform = `translate3d(0,${displayY.toFixed(1)}px,0)`
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [lyrics, lineH])

  // ---- 渲染 ----
  if (!lyrics.length) {
    return (
      <div className={`flex items-center justify-center text-sm text-gray-500 ${className}`}>
        暂无歌词
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* 顶部渐变遮罩 */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16"
        style={{ background: 'linear-gradient(180deg, rgba(17,24,39,1) 0%, transparent 100%)' }}
      />

      {/* GPU 合成层 */}
      <div
        ref={wrapperRef}
        style={{
          willChange: 'transform',
          transform: 'translate3d(0,0,0)',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* 顶部留白 */}
        <div style={{ height: '45vh' }} />

        {lyrics.map((line, i) => {
          const dist = i - activeIdx
          const isActive = dist === 0
          const absDist = Math.abs(dist)

          const opacity = isActive ? 1 : Math.max(0.06, 1 - absDist * 0.15)
          const scale = isActive ? 1.04 : Math.max(0.7, 1 - absDist * 0.06)

          const tLine = tLyrics?.find(
            (tl) => Math.abs(tl.time - line.time) < 0.15
          )

          return (
            <div
              key={i}
              className="flex cursor-pointer flex-col items-center justify-center px-4"
              style={{
                height: lineH,
                opacity,
                transform: `scale(${scale})`,
                transition: 'opacity 0.35s, transform 0.35s',
              }}
              onClick={() => onSeek?.(line.time)}
            >
              {isActive ? (
                /* ---- 逐字卡拉 OK 染色 ---- */
                <p
                  className="whitespace-nowrap text-center"
                  style={{ fontSize: compact ? '1rem' : '1.2rem', lineHeight: 1.4 }}
                >
                  {line.words.map((w, wi) => {
                    if (!w.char.trim()) {
                      return (
                        <span key={wi} style={{ visibility: 'hidden' }}>
                          {w.char}
                        </span>
                      )
                    }
                    const style = charStyle(w, currentTime, hue)
                    return (
                      <span
                        key={wi}
                        className="inline-block"
                        style={{
                          ...style,
                          fontSize: style.fontWeight === 700 ? '1.05em' : '0.92em',
                          transition: 'none',
                        }}
                      >
                        {w.char}
                      </span>
                    )
                  })}
                </p>
              ) : (
                /* ---- 非当前行：半透明纯色 ---- */
                <p
                  className="truncate text-center"
                  style={{
                    fontSize: '0.88rem',
                    color:
                      absDist <= 3
                        ? `hsla(${(hue + absDist * 20) % 360}, ${45 - absDist * 8}%, ${60 - absDist * 10}%, ${opacity.toFixed(2)})`
                        : `rgba(130,138,155,${opacity.toFixed(2)})`,
                  }}
                >
                  {line.text}
                </p>
              )}

              {/* 翻译行 */}
              {tLine && isActive && (
                <p className="mt-0.5 text-xs text-gray-500">{tLine.text}</p>
              )}
            </div>
          )
        })}

        {/* 底部留白 */}
        <div style={{ height: '45vh' }} />
      </div>

      {/* 底部渐变遮罩 */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16"
        style={{ background: 'linear-gradient(0deg, rgba(17,24,39,1) 0%, transparent 100%)' }}
      />
    </div>
  )
}
