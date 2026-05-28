/**
 * 歌词解析器 — 支持 LRC 整行格式 & QRC 逐字格式
 *
 * LRC:  [mm:ss.xx]歌词文本
 * QRC:  [mm:ss.xx]<start_ms,end_ms>字<start_ms,end_ms>字...
 *
 * 输出统一为:
 * [{ time, endTime, text, words: [{ char, start, end }] }]
 */

// ===================== LRC 解析 =====================

const TIME_RE = /^\[(\d{2}):(\d{2})(?:[.:](\d{2,3}))?\]/

function parseTimeTag(line) {
  const m = line.match(TIME_RE)
  if (!m) return null
  const min = parseInt(m[1], 10)
  const sec = parseInt(m[2], 10)
  let ms = 0
  if (m[3]) {
    ms = parseInt(m[3], 10)
    if (m[3].length === 2) ms *= 10 // [mm:ss.xx] 两位毫秒 → *10
  }
  return min * 60 + sec + ms / 1000
}

// ===================== QRC 逐字标签解析 =====================

// QRC 逐字标签: <start_ms,end_ms>字
const QRC_WORD_RE = /<(\d+),(\d+)>/g

function parseQRCWords(text) {
  const words = []
  let lastIdx = 0
  let match

  while ((match = QRC_WORD_RE.exec(text)) !== null) {
    // 标签前的普通文字
    if (match.index > lastIdx) {
      const plain = text.slice(lastIdx, match.index)
      if (plain.trim()) {
        // 没有时间标签的文字，均分行时间
        words.push(...plain.split('').map((c) => ({ char: c, start: -1, end: -1 })))
      }
    }
    const start = parseInt(match[1], 10) / 1000 // ms → s
    const end = parseInt(match[2], 10) / 1000
    lastIdx = QRC_WORD_RE.lastIndex
    // 下一个字符
    if (lastIdx < text.length) {
      const c = text[lastIdx]
      words.push({ char: c, start, end })
      lastIdx++
    }
  }

  // 剩余文字
  if (lastIdx < text.length) {
    const rest = text.slice(lastIdx)
    words.push(...rest.split('').map((c) => ({ char: c, start: -1, end: -1 })))
  }

  return words
}

// ===================== 主解析函数 =====================

export function parseLyrics(raw) {
  if (!raw) return []
  const lines = raw.split('\n')
  const result = []

  for (const line of lines) {
    const time = parseTimeTag(line)
    if (time === null) continue

    // 去除时间标签
    const textAfterTag = line.replace(TIME_RE, '').trim()
    if (!textAfterTag) continue

    // 检测是否有 QRC 逐字标签
    const hasQRC = QRC_WORD_RE.test(textAfterTag)
    QRC_WORD_RE.lastIndex = 0 // reset

    let words
    if (hasQRC) {
      words = parseQRCWords(textAfterTag)
    } else {
      // LRC 无逐字标签 → 后续由 fillWordTiming 均分
      words = [...textAfterTag].map((c) => ({ char: c, start: -1, end: -1 }))
    }

    result.push({
      time,                // 行开始时间（秒）
      endTime: 0,          // 行结束时间（后续计算）
      text: textAfterTag.replace(QRC_WORD_RE, ''),
      words,
    })
    QRC_WORD_RE.lastIndex = 0
  }

  return result.sort((a, b) => a.time - b.time)
}

// ===================== 填充 LRC 逐字时间（均分算法） =====================

/**
 * 为没有逐字时间标签的行（LRC）生成近似逐字时间
 * 字符均匀分配行的时间跨度
 */
export function fillWordTiming(parsed) {
  for (let i = 0; i < parsed.length; i++) {
    const line = parsed[i]
    const nextTime = i + 1 < parsed.length ? parsed[i + 1].time : line.time + 5
    line.endTime = nextTime

    const hasTiming = line.words.some((w) => w.start >= 0)
    if (hasTiming) {
      // QRC: 修正负数时间
      let lastEnd = line.time
      for (const w of line.words) {
        if (w.start < 0) { w.start = lastEnd; w.end = lastEnd + 0.15 }
        else { w.start += line.time; w.end += line.time }
        lastEnd = w.end
      }
    } else {
      // LRC: 均分时间
      const chars = line.words.filter((w) => w.char.trim() !== '')
      if (chars.length === 0) continue

      const duration = nextTime - line.time
      const perChar = duration / chars.length
      let charIdx = 0
      let accTime = line.time

      for (const w of line.words) {
        if (w.char.trim() === '') {
          w.start = accTime
          w.end = accTime
        } else {
          w.start = accTime
          w.end = accTime + perChar
          accTime += perChar
          charIdx++
        }
      }
    }
  }
  return parsed
}

// ===================== 工具函数 =====================

/**
 * 根据 currentTime 查找当前行索引及行内进度 (0-1)
 */
export function findActiveLine(lyrics, currentTime) {
  if (!lyrics.length) return { index: -1, progress: 0 }

  let index = -1
  for (let i = 0; i < lyrics.length; i++) {
    if (currentTime >= lyrics[i].time) index = i
    else break
  }

  if (index < 0) return { index: 0, progress: 0 }

  const line = lyrics[index]
  const duration = line.endTime - line.time
  const progress = duration > 0 ? Math.min(1, (currentTime - line.time) / duration) : 0

  return { index, progress }
}

// ===================== QRC 示例数据（用于测试） =====================

export const QRC_SAMPLE = `[ti:晴天]
[ar:周杰伦]
[00:12.00]<0,359>颳<359,566>風<566,797>這<797,1007>天<1007,1216>我<1216,1466>試<1466,1683>過<1683,1945>握<1945,2152>著<2152,2334>妳<2334,2556>手
[00:15.00]<0,242>但<242,501>偏<501,725>偏<725,1003>雨<1003,1316>漸<1316,1589>漸<1589,1890>大<1890,2123>到<2123,2417>我<2417,2624>看<2624,2836>妳<2836,3038>不<3038,3178>見
[00:18.00]<0,420>還<420,686>要<686,945>多<945,1093>久<1093,1367>我<1367,1591>才<1591,1844>能<1844,2125>在<2125,2320>妳<2320,2548>身<2548,2776>邊
[00:21.00]<0,345>等<345,630>到<630,907>放<907,1128>晴<1128,1422>的<1422,1631>那<1631,1852>天<1852,2088>也<2088,2292>許<2292,2573>我<2573,2804>會<2804,3054>比<3054,3311>較<3311,3599>好<3599,3876>一<3876,4137>點
`

export const LRC_SAMPLE = `[ti:晴天]
[ar:周杰伦]
[00:12.00]刮风这天我试过握着你手
[00:15.00]但偏偏雨渐渐大到我看你不见
[00:18.00]还要多久我才能在你身边
[00:21.00]等到放晴的那天也许我会比较好一点
[00:25.90]从前从前有个人爱你很久
[00:29.03]但偏偏风渐渐把距离吹得好远
[00:33.33]好不容易又能再多爱一天
[00:37.24]但故事的最后你好像还是说了拜拜
`
