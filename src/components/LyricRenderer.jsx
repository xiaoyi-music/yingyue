import { useRef, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react'

const LINE_HEIGHT = 52
const COMPACT_HEIGHT = 40
const LERP = 0.10

function charStyle(word, t, hue) {
  if (t >= word.end) {
    return {
      color: `hsl(${hue}, 80%, 65%)`,
      textShadow: `0 0 8px hsla(${hue}, 80%, 55%, 0.4)`,
      fontWeight: 700,
    }
  }
  if (t <= word.start) {
    return { color: 'rgba(156,163,175,0.3)', fontWeight: 400 }
  }
  const pct = ((t - word.start) / (word.end - word.start)) * 100
  return {
    background: `linear-gradient(to right, hsl(${hue}, 80%, 65%) ${pct}%, rgba(156,163,175,0.3) ${pct}%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontWeight: 700,
    textShadow: `0 0 6px hsla(${hue}, 80%, 55%, 0.3)`,
  }
}

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

const LyricRenderer = forwardRef(function LyricRenderer({
  lyrics,
  currentTime,
  duration,
  hue = 280,
  tLyrics = null,
  isPlaying = false,
  onSeek,
  compact = false,
  className = '',
}, ref) {
  const containerRef = useRef(null)
  const wrapperRef = useRef(null)
  const isManualScroll = useRef(false)
  const manualTimer = useRef(null)
  const displayY = useRef(0)

  const timeRef = useRef(currentTime)
  const playingRef = useRef(isPlaying)
  const lyricsRef = useRef(lyrics)

  timeRef.current = currentTime
  playingRef.current = isPlaying
  lyricsRef.current = lyrics

  const lineH = compact ? COMPACT_HEIGHT : LINE_HEIGHT

  // O(1) 翻译查找
  const tMap = useMemo(() => {
    if (!tLyrics) return null
    const map = new Map()
    for (const tl of tLyrics) {
      map.set(Math.round(tl.time * 100) / 100, tl)
    }
    return map
  }, [tLyrics])

  const activeIdx = useMemo(() => {
    if (!lyrics.length) return -1
    let idx = -1
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) idx = i
      else break
    }
    return idx < 0 ? 0 : idx
  }, [currentTime, lyrics])

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    addScroll(deltaY) {
      isManualScroll.current = true
      if (manualTimer.current) clearTimeout(manualTimer.current)
      manualTimer.current = setTimeout(() => { isManualScroll.current = false }, 3000)
      displayY.current += deltaY
      const wrapper = wrapperRef.current
      if (wrapper) {
        wrapper.style.transform = `translate3d(0,${displayY.current.toFixed(1)}px,0)`
      }
    },
  }), [])

  // ---- 滚轮手动滚动 ----
  const handleWheel = useCallback((e) => {
    isManualScroll.current = true
    if (manualTimer.current) clearTimeout(manualTimer.current)
    manualTimer.current = setTimeout(() => { isManualScroll.current = false }, 3000)
    displayY.current += e.deltaY
    const wrapper = wrapperRef.current
    if (wrapper) {
      wrapper.style.transform = `translate3d(0,${displayY.current.toFixed(1)}px,0)`
    }
  }, [])

  const handleLineClick = useCallback((time) => {
    isManualScroll.current = false
    onSeek?.(time)
  }, [onSeek])

  // ---- RAF 自动滚动 ----
  useEffect(() => {
    const container = containerRef.current
    const wrapper = wrapperRef.current
    if (!container || !wrapper) return

    let raf

    function tick() {
      const ly = lyricsRef.current
      if (!ly.length) { raf = requestAnimationFrame(tick); return }

      if (!isManualScroll.current) {
        const containerH = container.clientHeight
        const centerOffset = (containerH - lineH) / 2
        const t = timeRef.current
        const floatIdx = findFloatIndex(ly, t)
        const targetY = -(floatIdx * lineH) + centerOffset
        const speed = playingRef.current ? LERP : 0.3
        displayY.current += (targetY - displayY.current) * speed
        if (Math.abs(targetY - displayY.current) < 0.15) displayY.current = targetY
        wrapper.style.transform = `translate3d(0,${displayY.current.toFixed(1)}px,0)`
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      if (manualTimer.current) clearTimeout(manualTimer.current)
    }
  }, [lyrics, lineH])

  // 初始化居中
  useEffect(() => {
    const container = containerRef.current
    if (!container || !lyrics.length) return
    displayY.current = (container.clientHeight - lineH) / 2
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      onWheel={handleWheel}
      style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20"
        style={{ background: 'linear-gradient(180deg, rgba(17,24,39,1) 0%, transparent 100%)' }}
      />

      <div
        ref={wrapperRef}
        className="will-change-transform"
        style={{ transform: 'translate3d(0,0,0)', backfaceVisibility: 'hidden' }}
      >
        <div style={{ height: '45vh' }} />

        {lyrics.map((line, i) => {
          const dist = i - activeIdx
          const isActive = dist === 0
          const absDist = Math.abs(dist)
          const opacity = isActive ? 1 : Math.max(0.06, 1 - absDist * 0.15)
          const scale = isActive ? 1.04 : Math.max(0.7, 1 - absDist * 0.06)
          const tLine = tMap?.get(Math.round(line.time * 100) / 100)

          return (
            <div
              key={i}
              className="flex cursor-pointer flex-col items-center justify-center px-4 select-none"
              style={{
                height: lineH,
                opacity,
                transform: `scale(${scale})`,
                transition: 'opacity 0.35s, transform 0.35s',
                willChange: isActive ? 'transform, opacity' : 'auto',
              }}
              onClick={() => handleLineClick(line.time)}
            >
              {isActive ? (
                <p className="whitespace-nowrap text-center font-bold"
                  style={{ fontSize: compact ? '1rem' : '1.2rem', lineHeight: 1.4 }}>
                  {line.words.map((w, wi) => {
                    if (!w.char.trim()) return <span key={wi} style={{ visibility: 'hidden' }}>{w.char}</span>
                    return <span key={wi} className="inline-block" style={charStyle(w, currentTime, hue)}>{w.char}</span>
                  })}
                </p>
              ) : (
                <p className="truncate text-center" style={{
                  fontSize: '0.88rem',
                  color: absDist <= 3
                    ? `hsla(${(hue + absDist * 20) % 360}, ${45 - absDist * 8}%, ${60 - absDist * 10}%, ${opacity.toFixed(2)})`
                    : `rgba(130,138,155,${opacity.toFixed(2)})`,
                }}>{line.text}</p>
              )}
              {tLine && isActive && <p className="mt-0.5 text-xs text-gray-500">{tLine.text}</p>}
            </div>
          )
        })}

        <div style={{ height: '45vh' }} />
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20"
        style={{ background: 'linear-gradient(0deg, rgba(17,24,39,1) 0%, transparent 100%)' }}
      />
    </div>
  )
})

export default LyricRenderer
