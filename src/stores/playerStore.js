import { create } from 'zustand'
import { getSongUrl, getLyric } from '../services/api'

// 全局唯一的 Audio 实例，不参与 React 渲染
const audio = new Audio()

// 歌曲 URL 缓存，避免重复请求 API
const urlCache = new Map()

export const PlayMode = { LOOP: 'LOOP', SINGLE: 'SINGLE', SHUFFLE: 'SHUFFLE' }

// 播放历史：从 localStorage 读取
function loadHistory() {
  try { return JSON.parse(localStorage.getItem('playHistory') || '[]') }
  catch { return [] }
}

function saveHistory(history) {
  localStorage.setItem('playHistory', JSON.stringify(history.slice(0, 100)))
}

const usePlayerStore = create((set, get) => ({
  // ===== 播放列表 =====
  playlist: [],
  currentIndex: -1,
  isPlaying: false,
  playMode: PlayMode.LOOP,

  // ===== 当前歌曲信息 =====
  currentTime: 0,
  duration: 0,
  volume: 1,
  loading: false,
  error: '',

  // ===== 歌词 =====
  lyric: '',
  tlyric: '',

  // ===== 播放历史 =====
  playHistory: loadHistory(),

  // ===== 内部标记 =====
  _initialized: false,
  _pendingPlay: false,  // 等待 canplay 事件后自动播放

  initAudio() {
    if (get()._initialized) return
    set({ _initialized: true })

    audio.volume = get().volume
    audio.preload = 'auto'

    audio.addEventListener('timeupdate', () => {
      set({ currentTime: audio.currentTime })
    })

    audio.addEventListener('loadedmetadata', () => {
      const d = audio.duration
      if (isFinite(d) && d > 0) {
        set({ duration: d, error: '' })
      }
    })

    // canplay：音频缓冲足够，可以流畅播放
    audio.addEventListener('canplay', () => {
      set({ loading: false })
      if (get()._pendingPlay) {
        set({ _pendingPlay: false })
        audio.play().catch(() => set({ error: '播放失败' }))
        set({ isPlaying: true })
      }
    })

    audio.addEventListener('ended', () => {
      const { playMode } = get()
      if (playMode === PlayMode.SINGLE) {
        audio.currentTime = 0
        audio.play()
      } else {
        get().next()
      }
    })

    audio.addEventListener('waiting', () => set({ loading: true }))
    audio.addEventListener('error', () => set({ error: '音频加载失败', loading: false }))
  },

  // ===== 播放控制 =====
  play() {
    if (audio.src) {
      audio.play().catch(() => set({ error: '播放失败，请重试' }))
    }
    set({ isPlaying: true })
  },

  pause() {
    audio.pause()
    set({ isPlaying: false, _pendingPlay: false })
  },

  togglePlay() {
    const { isPlaying, playlist } = get()
    if (playlist.length === 0) return

    if (isPlaying) {
      get().pause()
    } else if (audio.src) {
      get().play()
    } else {
      set({ isPlaying: true })
    }
  },

  seek(time) {
    audio.currentTime = time
    set({ currentTime: time })
  },

  setVolume(v) {
    audio.volume = v
    set({ volume: v })
  },

  // ===== 切歌逻辑 =====
  prev() {
    const { playlist, currentIndex, playMode } = get()
    if (playlist.length === 0) return
    let idx
    if (playMode === PlayMode.SHUFFLE) {
      idx = Math.floor(Math.random() * playlist.length)
    } else {
      idx = currentIndex <= 0 ? playlist.length - 1 : currentIndex - 1
    }
    get().playIndex(idx)
  },

  next() {
    const { playlist, currentIndex, playMode } = get()
    if (playlist.length === 0) return
    let idx
    if (playMode === PlayMode.SHUFFLE) {
      idx = Math.floor(Math.random() * playlist.length)
    } else {
      idx = currentIndex >= playlist.length - 1 ? 0 : currentIndex + 1
    }
    get().playIndex(idx)
  },

  async playIndex(index) {
    const { playlist } = get()
    const song = playlist[index]
    if (!song) return

    set({ currentIndex: index, loading: true, error: '', currentTime: 0, duration: 0, _pendingPlay: true })

    // 记录到播放历史
    const history = get().playHistory
    const filtered = history.filter(
      (h) => !(h.id === song.id && h.source === song.source)
    )
    const newHistory = [song, ...filtered].slice(0, 100)
    set({ playHistory: newHistory })
    saveHistory(newHistory)

    const cacheKey = `${song.source}:${song.id}`

    // 优先使用缓存
    let url = urlCache.get(cacheKey)
    if (!url) {
      try {
        const urlData = await getSongUrl({ source: song.source, id: song.id, br: 320 })
        if (urlData.url) {
          url = urlData.url
          urlCache.set(cacheKey, url)
        }
      } catch { /* 继续兜底 */ }
    }

    // 缓存未命中，尝试 joox 源
    if (!url && song.source !== 'joox') {
      try {
        const fb = await getSongUrl({ source: 'joox', id: song.id, br: 320 })
        if (fb.url) {
          url = fb.url
          urlCache.set(cacheKey, fb.url)
        }
      } catch { /* ignore */ }
    }

    if (!url) {
      set({ error: '获取播放链接失败', loading: false, _pendingPlay: false })
      return
    }

    audio.src = url
    audio.load()

    // 预加载下一首歌曲 URL（后台静默获取）
    const nextIndex = index + 1 < playlist.length ? index + 1 : 0
    const nextSong = playlist[nextIndex]
    if (nextSong && nextSong !== song) {
      const nextKey = `${nextSong.source}:${nextSong.id}`
      if (!urlCache.has(nextKey)) {
        getSongUrl({ source: nextSong.source, id: nextSong.id, br: 320 })
          .then((d) => { if (d.url) urlCache.set(nextKey, d.url) })
          .catch(() => {})
      }
    }

    // 异步获取歌词
    const lyricId = song.lyric_id || song.id
    getLyric({ source: song.source, id: lyricId })
      .then((data) => set({ lyric: data.lyric || '', tlyric: data.tlyric || '' }))
      .catch(() => set({ lyric: '', tlyric: '' }))
  },

  // ===== 播放模式 =====
  setPlayMode(mode) {
    set({ playMode: mode })
  },

  setError(err) {
    set({ error: err })
  },

  // ===== 历史管理 =====
  clearHistory() {
    set({ playHistory: [] })
    saveHistory([])
  },
}))

export default usePlayerStore
