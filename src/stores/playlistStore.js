import { create } from 'zustand'

const usePlaylistStore = create((set, get) => ({
  // 歌单列表: [{ id, name, songs: [], createdAt }]
  playlists: [],

  createPlaylist(name) {
    const playlist = {
      id: Date.now().toString(),
      name,
      songs: [],
      createdAt: new Date().toISOString(),
    }
    set((s) => ({ playlists: [...s.playlists, playlist] }))
    return playlist
  },

  deletePlaylist(id) {
    set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) }))
  },

  addSongToPlaylist(playlistId, song) {
    set((s) => ({
      playlists: s.playlists.map((p) => {
        if (p.id !== playlistId) return p
        const exists = p.songs.some(
          (s) => s.id === song.id && s.source === song.source
        )
        if (exists) return p
        return { ...p, songs: [...p.songs, song] }
      }),
    }))
  },

  removeSongFromPlaylist(playlistId, songId, songSource) {
    set((s) => ({
      playlists: s.playlists.map((p) => {
        if (p.id !== playlistId) return p
        return {
          ...p,
          songs: p.songs.filter(
            (s) => !(s.id === songId && s.source === songSource)
          ),
        }
      }),
    }))
  },
}))

export default usePlaylistStore
