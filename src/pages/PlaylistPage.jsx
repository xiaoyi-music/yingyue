import { useState } from 'react'
import usePlaylistStore from '../stores/playlistStore'
import usePlayerStore from '../stores/playerStore'
import SongItem from '../components/SongItem'

export default function PlaylistPage() {
  const { playlists, createPlaylist, deletePlaylist, removeSongFromPlaylist } =
    usePlaylistStore()
  const playlist = usePlayerStore((s) => s.playlist)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const playIndex = usePlayerStore((s) => s.playIndex)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')

  const handleCreate = () => {
    if (!newName.trim()) return
    createPlaylist(newName.trim())
    setNewName('')
    setShowCreate(false)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">我的歌单</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium transition hover:bg-purple-500"
        >
          + 新建歌单
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="歌单名称..."
            className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-400 outline-none focus:border-purple-500"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button
            onClick={handleCreate}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm transition hover:bg-purple-500"
          >
            创建
          </button>
        </div>
      )}

      {/* 当前播放列表 */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-gray-400">
          当前播放队列 ({playlist.length})
        </h2>
        {playlist.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            播放队列为空，去搜索添加歌曲吧
          </p>
        ) : (
          <div className="space-y-0.5">
            {playlist.map((song, i) => (
              <SongItem
                key={`${song.source}:${song.id}:${i}`}
                song={song}
                index={i}
                isActive={i === currentIndex}
                onPlay={() => playIndex(i)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 用户歌单 */}
      {playlists.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-gray-400">收藏歌单</h2>
          {playlists.map((pl) => (
            <details key={pl.id} className="mb-3 rounded-lg border border-gray-700">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-white/5">
                <span className="text-sm font-medium">{pl.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{pl.songs.length} 首</span>
                  <button
                    onClick={(e) => { e.preventDefault(); deletePlaylist(pl.id) }}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    删除
                  </button>
                </div>
              </summary>
              {pl.songs.length === 0 ? (
                <p className="px-4 pb-3 text-xs text-gray-500">歌单为空</p>
              ) : (
                <div className="space-y-0.5 px-2 pb-2">
                  {pl.songs.map((song) => (
                    <SongItem
                      key={`${song.source}:${song.id}`}
                      song={song}
                      isActive={false}
                      onPlay={() => {
                        const store = usePlayerStore.getState()
                        const existing = store.playlist.findIndex(
                          (s) => s.id === song.id && s.source === song.source
                        )
                        if (existing >= 0) {
                          playIndex(existing)
                        } else {
                          store.playlist.push(song)
                          usePlayerStore.setState({ playlist: [...store.playlist] })
                          playIndex(store.playlist.length - 1)
                        }
                      }}
                      onAdd={() => removeSongFromPlaylist(pl.id, song.id, song.source)}
                    />
                  ))}
                </div>
              )}
            </details>
          ))}
        </section>
      )}
    </div>
  )
}
