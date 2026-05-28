import useAlbumArt from '../hooks/useAlbumArt'
import { simplify } from '../utils/simplify'

export default function SongItem({ song, index, isActive, onPlay, onAdd }) {
  const coverUrl = useAlbumArt(song.source, song.pic_id)

  const name = simplify(song.name)
  const artist = simplify(
    Array.isArray(song.artist) ? song.artist.join(', ') : song.artist
  )
  const album = song.album ? ` · ${simplify(song.album)}` : ''

  return (
    <div
      className={`group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-white/5 ${
        isActive ? 'bg-purple-500/10 border-l-2 border-purple-500' : 'border-l-2 border-transparent'
      }`}
      onClick={() => onPlay?.(index !== undefined ? index : song)}
    >
      {coverUrl ? (
        <img src={coverUrl} alt="" className="h-10 w-10 flex-shrink-0 rounded object-cover" />
      ) : (
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-gray-700 text-xs text-gray-500">
          {index !== undefined ? index + 1 : '♪'}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${isActive ? 'text-purple-300' : 'text-gray-200'}`}>
          {name}
        </p>
        <p className="truncate text-xs text-gray-500">
          {artist}{album}
        </p>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onAdd?.(song) }}
        className="flex-shrink-0 rounded-full p-1 text-gray-500 opacity-0 transition hover:text-purple-400 group-hover:opacity-100"
        title="添加到歌单"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
      </button>
    </div>
  )
}
