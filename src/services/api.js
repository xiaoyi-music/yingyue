const BASE = 'https://music-api.gdstudio.xyz/api.php'

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/**
 * 搜索歌曲
 * @param {Object} params
 * @param {string} params.source - 音乐源: joox / netease / kuwo
 * @param {string} params.name   - 关键字（歌名/歌手/专辑）
 * @param {number} params.count  - 每页条数，默认 20
 * @param {number} params.pages  - 页码，默认 1
 */
export async function search({ source = 'joox', name, count = 20, pages = 1 }) {
  const params = new URLSearchParams({
    types: 'search', source, name,
    count: String(count), pages: String(pages),
  })
  return fetchJson(`${BASE}?${params}`)
}

/**
 * 获取歌曲播放链接
 * @param {Object} params
 * @param {string} params.source - 音乐源
 * @param {string} params.id     - 曲目 ID
 * @param {number} params.br     - 音质: 128 / 192 / 320，默认 320
 */
export async function getSongUrl({ source = 'joox', id, br = 320 }) {
  const params = new URLSearchParams({
    types: 'url', source, id, br: String(br),
  })
  return fetchJson(`${BASE}?${params}`)
}

/**
 * 获取专辑图片链接
 * @param {Object} params
 * @param {string} params.source - 音乐源
 * @param {string} params.id     - 专辑图 ID (pic_id)
 * @param {number} params.size   - 尺寸: 300 / 500，默认 300
 */
export async function getAlbumArt({ source = 'joox', id, size = 300 }) {
  const params = new URLSearchParams({
    types: 'pic', source, id, size: String(size),
  })
  return fetchJson(`${BASE}?${params}`)
}

/**
 * 获取歌词
 * @param {Object} params
 * @param {string} params.source - 音乐源
 * @param {string} params.id     - 歌词 ID (lyric_id)
 */
export async function getLyric({ source = 'joox', id }) {
  const params = new URLSearchParams({
    types: 'lyric', source, id,
  })
  return fetchJson(`${BASE}?${params}`)
}
