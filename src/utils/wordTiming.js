/**
 * 为 LRC 歌词行计算逐字时间
 * 在没有逐字时间戳的情况下，按字符数均分行的时间跨度
 */

export function parseLRC(lrc) {
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
 * 将歌词行拆分为逐字时间序列
 * 每个字按字符占比分配时间（中文 ~1 字符 = ~200ms，英文单词 ~1 词 = ~400ms）
 */
export function splitWords(line, startTime, nextLineTime, totalDuration) {
  if (!line) return []

  const chars = [...line] // 正确处理 emoji 等多字节字符
  // 过滤空格得到有效字符
  const meaningful = chars.filter((c) => c.trim() !== '')

  if (meaningful.length === 0) return []

  // 用下一行时间或估算值
  const endTime = nextLineTime || startTime + chars.length * 0.25

  // 逐字时间
  const perChar = (endTime - startTime) / meaningful.length
  const words = []
  let charIdx = 0

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]
    if (c.trim() === '') {
      words.push({ char: c, time: words.length > 0 ? words[words.length - 1].time : startTime })
    } else {
      words.push({ char: c, time: startTime + charIdx * perChar })
      charIdx++
    }
  }

  return words
}

/**
 * 构建带逐字时间的完整歌词数组
 */
export function buildTimedLyrics(parsedLrc) {
  return parsedLrc.map((line, i) => {
    const nextTime = i + 1 < parsedLrc.length ? parsedLrc[i + 1].time : null
    const words = splitWords(line.text, line.time, nextTime)
    return { ...line, words, endTime: nextTime || line.time + line.text.length * 0.25 }
  })
}
