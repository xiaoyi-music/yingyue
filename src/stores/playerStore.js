import { create } from 'zustand'
import { getSongUrl, getLyric } from '../services/api'

const audio = new Audio()

// URL 缓存: key → { url320, url999 } 分别存两个音质
const urlCache = new Map()

export const PlayMode = { LOOP: 'LOOP', SINGLE: 'SINGLE', SHUFFLE: 'SHUFFLE' }

function loadHistory() {
  try { return JSON.parse(localStorage.getItem('playHistory') || '[]') }
  catch { return [] }
}

function saveHistory(history) {
  localStorage.setItem('playHistory', JSON.stringify(history.slice(0, 100)))
}

/**
 * 后台预加载一组歌曲的播放 URL。
 * 搜索结果一到就调用，这样用户点播放时 URL 已在缓存中。
 */
export function prefetchUrls(songs, count = 5) {
  const targets = songs.slice(0, count)
  for (const song of targets) {
    if (!song?.id) continue
    const key = `${song.source}:${song.id}`
    if (urlCache.has(key)) continue

    // 先快速拿到 320kbps URL
    getSongUrl({ source: song.source, id: song.id, br: 320 })
      .then((d) => {
        if (d.url) {
          const entry = urlCache.get(key) || {}
          entry.url320 = d.url
          urlCache.set(key, entry)
        }
      })
      .catch(() => {})

    // 后台慢速获取无损音质 URL（不阻塞）
    getSongUrl({ source: song.source, id: song.id, br: 999 })
      .then((d) => {
        if (d.url) {
          const entry = urlCache.get(key) || {}
          entry.url999 = d.url
          urlCache.set(key, entry)
        }
      })
      .catch(() => {})
  }
}

/**
 * 并行请求多个音源/音质，返回第一个成功的 URL
 */
async function fetchBestUrl(song) {
  const candidates = [
    // 无损音质（当前源）
    getSongUrl({ source: song.source, id: song.id, br: 999 })
      .then((d) => d.url || null)
      .catch(() => null),
    // 320kbps（当前源）
    getSongUrl({ source: song.source, id: song.id, br: 320 })
      .then((d) => d.url || null)
      .catch(() => null),
  ]

  // 如果不是 joox，额外尝试 joox 320kbps
  if (song.source !== 'joox') {
    candidates.push(
      getSongUrl({ source: 'joox', id: song.id, br: 320 })
        .then((d) => d.url || null)
        .catch(() => null)
    )
  }

  // 并行全部发出，取第一个非空结果
  const results = await Promise.allSettled(candidates)
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) return r.value
  }
  return null
}

const usePlayerStore = create((set, get) => ({
  playlist: [],
  currentIndex: -1,
  isPlaying: false,
  playMode: PlayMode.LOOP,

  currentTime: 0,
  duration: 0,
  volume: 1,
  loading: false,
  error: '',

  lyric: '',
  tlyric: '',

  playHistory: loadHistory(),

  _initialized: false,
  _pendingPlay: false,

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

    const history = get().playHistory
    const filtered = history.filter(
      (h) => !(h.id === song.id && h.source === song.source)
    )
    const newHistory = [song, ...filtered].slice(0, 100)
    set({ playHistory: newHistory })
    saveHistory(newHistory)

    const cacheKey = `${song.source}:${song.id}`
    let url = null

    // 优先使用缓存（无损 > 320）
    const cached = urlCache.get(cacheKey)
    if (cached) {
      url = cached.url999 || cached.url320
    }

    // 缓存未命中，并行请求所有音源
    if (!url) {
      url = await fetchBestUrl(song)
      if (url) {
        urlCache.set(cacheKey, { url320: url })
      }
    }

    if (!url) {
      set({ error: '获取播放链接失败', loading: false, _pendingPlay: false })
      return
    }

    audio.src = url
    audio.load()

    // 预加载下一首
    const nextIndex = index + 1 < playlist.length ? index + 1 : 0
    const nextSong = playlist[nextIndex]
    if (nextSong && nextSong.id !== song.id) {
      const nextKey = `${nextSong.source}:${nextSong.id}`
      if (!urlCache.has(nextKey)) {
        prefetchUrls([nextSong], 1)
      }
    }

    // 歌词
    const lyricId = song.lyric_id || song.id
    getLyric({ source: song.source, id: lyricId })
      .then((data) => set({ lyric: data.lyric || '', tlyric: data.tlyric || '' }))
      .catch(() => set({ lyric: '', tlyric: '' }))
  },

  setPlayMode(mode) {
    set({ playMode: mode })
  },

  setError(err) {
    set({ error: err })
  },

  clearHistory() {
    set({ playHistory: [] })
    saveHistory([])
  },
}))

export default usePlayerStore
