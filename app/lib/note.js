const TAG = '#[^\\s#，,。！!？?、；;：:\\uFE0F\\u20E3]+'
const TAG_RE = new RegExp(TAG, 'g')
const HAS_TAG_RE = new RegExp(TAG)
const TAG_SPLIT_RE = new RegExp(`(${TAG})`)
const TAG_LINE_PREFIX_RE = /^(话题标签|相关话题|话题|标签)\s*[:：]?/

const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('zh', { granularity: 'grapheme' }) : null

export function countChars(text) {
  if (!text) return 0
  return segmenter ? [...segmenter.segment(text)].length : Array.from(text).length
}

function isTagLine(line) {
  return (
    HAS_TAG_RE.test(line) &&
    line.replace(TAG_RE, '').replace(TAG_LINE_PREFIX_RE, '').replace(/[\s#,，、|·]/g, '') === ''
  )
}

// 把 AI 返回的原文拆成「标题 / 正文 / 话题标签」，顺便去掉小红书不支持的 Markdown 符号
export function parseNote(raw) {
  const lines = raw
    .replace(/\r/g, '')
    .replace(/\*\*/g, '')
    .split('\n')
    .map(line => line.replace(/^\s*#{1,6}\s+/, '').trimEnd())

  let start = 0
  while (start < lines.length && !lines[start].trim()) start++
  if (start === lines.length) return { title: '', body: '', tags: [], titleDone: false }

  let end = lines.length
  while (end > start + 1 && (!lines[end - 1].trim() || isTagLine(lines[end - 1].trim()))) end--

  return {
    title: lines[start].trim().replace(/^(标题|题目)\s*[:：]\s*/, ''),
    body: lines.slice(start + 1, end).join('\n').replace(/^\s*正文\s*[:：]\s*/, '').trim(),
    tags: lines.slice(end).flatMap(line => line.match(TAG_RE) || []),
    titleDone: lines.length > start + 1,
  }
}

// 返回的数组中，奇数下标是话题标签
export function splitTags(text) {
  return text.split(TAG_SPLIT_RE)
}
