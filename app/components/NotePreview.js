'use client'

import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import {
  IconAlert,
  IconChat,
  IconCheck,
  IconCopy,
  IconHeart,
  IconPen,
  IconPhone,
  IconRefresh,
  IconStar,
  IconStop,
} from './Icons'
import { countChars, parseNote, splitTags } from '../lib/note'

const STATUS_TEXT = {
  idle: '等待创作',
  loading: 'AI 构思中',
  streaming: '正在落笔',
  done: '创作完成',
  stopped: '已停止',
  error: '生成失败',
}

const LOADING_TIPS = ['正在理解你的主题', '正在构思吸睛标题', '正在打磨正文节奏', '正在挑选合适的 emoji', '正在匹配热门话题']

const CONFETTI_COLORS = ['#FF2E4D', '#FFB13D', '#8B5CF6', '#22C08A', '#3BA7FF']
const CONFETTI = Array.from({ length: 16 }, (_, i) => ({
  '--x': `${(i * 37 + 7) % 100}%`,
  '--dx': `${((i * 23) % 50) - 25}px`,
  '--r': `${(i * 53) % 360}deg`,
  '--delay': `${(i % 4) * 70}ms`,
  '--c': CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}))

function coverFontSize(lines) {
  const length = Math.max(...lines.map(countChars))
  if (length <= 6) return 34
  if (length <= 10) return 30
  if (length <= 16) return 26
  if (length <= 24) return 22
  return 19
}

function Caret() {
  return <span className="caret" aria-hidden="true" />
}

function TagText({ text }) {
  return splitTags(text).map((part, i) =>
    i % 2 ? (
      <span className="note-tag" key={i}>
        {part}
      </span>
    ) : (
      part
    )
  )
}

const NotePreview = forwardRef(function NotePreview(
  { status, result, error, topic, styleMeta, canRegenerate, onStop, onRegenerate, onCopy },
  ref
) {
  const note = useMemo(() => parseNote(result), [result])
  const [tip, setTip] = useState(0)
  const [liked, setLiked] = useState(false)
  const [collected, setCollected] = useState(false)
  const [copied, setCopied] = useState('')
  const copyTimer = useRef()

  const busy = status === 'loading' || status === 'streaming'
  const hasNote = Boolean(note.title)
  const titleReady = hasNote && (note.titleDone || !busy)
  const draftTitle = topic.trim()
  const coverText = titleReady ? note.title : draftTitle || '你的笔记标题'
  // 小红书标题常用「｜」分段，封面上按段换行更好看
  const coverLines = coverText.split(/\s*[｜|]\s*/).filter(Boolean)
  const caretAt = !busy ? null : !note.titleDone ? 'title' : note.tags.length ? 'tags' : 'body'
  const tagLine = note.tags.join(' ')
  const titleLength = countChars(note.title)

  useEffect(() => {
    if (status !== 'loading') return
    setTip(0)
    const timer = setInterval(() => setTip(i => (i + 1) % LOADING_TIPS.length), 1800)
    return () => clearInterval(timer)
  }, [status])

  useEffect(() => () => clearTimeout(copyTimer.current), [])

  async function copy(kind, text, label) {
    if (!(await onCopy(text, label))) return
    setCopied(kind)
    clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(''), 1600)
  }

  function copyIcon(kind, size = 16) {
    return copied === kind ? <IconCheck size={size} strokeWidth={2.6} /> : <IconCopy size={size} />
  }

  return (
    <section className="preview" ref={ref} aria-labelledby="preview-heading">
      <div className="preview-head">
        <h2 id="preview-heading">
          <IconPhone size={18} />
          笔记预览
        </h2>
        <span className={`status is-${status}`} aria-hidden="true">
          <i />
          {STATUS_TEXT[status]}
          {status === 'streaming' && ` · ${countChars(result)} 字`}
        </span>
        <span className="sr-only" aria-live="polite">
          {STATUS_TEXT[status]}
        </span>
        {busy && (
          <button type="button" className="stop-btn" onClick={onStop}>
            <IconStop size={14} />
            停止
          </button>
        )}
      </div>

      <article className={`note is-${status}`}>
        {status === 'done' && (
          <div className="confetti" aria-hidden="true">
            {CONFETTI.map((style, i) => (
              <i key={i} style={style} />
            ))}
          </div>
        )}

        <header className="note-author">
          <span className="avatar" aria-hidden="true">
            🍠
          </span>
          <span className="author-name">小红薯本薯</span>
          <span className="follow" aria-hidden="true">
            关注
          </span>
        </header>

        <div
          className="cover"
          style={{
            '--c1': styleMeta.cover[0],
            '--c2': styleMeta.cover[1],
            '--accent': styleMeta.accent,
            '--marker': styleMeta.marker,
          }}
        >
          <span className="cover-label" key={`label-${styleMeta.name}`}>
            {styleMeta.emoji} {styleMeta.name}
          </span>
          <span className="cover-spark sp1" aria-hidden="true">
            ✦
          </span>
          <span className="cover-spark sp2" aria-hidden="true">
            ✦
          </span>
          <p
            key={titleReady ? 'ai' : 'draft'}
            className={`cover-title${!titleReady && !draftTitle ? ' empty' : ''}`}
            style={{ fontSize: coverFontSize(coverLines) }}
          >
            {coverLines.map((line, i) => (
              <span className="cover-line" key={i}>
                <span className="marker">{line}</span>
              </span>
            ))}
          </p>
          <span className="cover-sticker" key={`sticker-${styleMeta.name}`} aria-hidden="true">
            {styleMeta.emoji}
          </span>
          {status === 'loading' && <span className="cover-shimmer" aria-hidden="true" />}
        </div>

        <div className="note-content">
          {hasNote ? (
            <>
              <h3 className="note-title">
                {note.title}
                {caretAt === 'title' && <Caret />}
              </h3>
              {(note.body || caretAt === 'body') && (
                <p className="note-text">
                  <TagText text={note.body} />
                  {caretAt === 'body' && <Caret />}
                </p>
              )}
              {note.tags.length > 0 && (
                <p className="note-tags">
                  {note.tags.map((tag, i) => (
                    <span className="note-tag" key={i}>
                      {tag}
                    </span>
                  ))}
                  {caretAt === 'tags' && <Caret />}
                </p>
              )}
              {!busy && (
                <p className="note-meta">
                  刚刚<span className="ai-label">AI 生成</span>
                </p>
              )}
            </>
          ) : (
            <>
              <div className={`skeleton${status === 'loading' ? ' shimmer' : ''}`} aria-hidden="true">
                <span className="sk-title" />
                <span />
                <span />
                <span className="sk-86" />
                <span className="sk-60" />
              </div>
              <p className="preview-hint">
                {status === 'loading' ? (
                  <>
                    <span className="hint-pen">
                      <IconPen size={15} />
                    </span>
                    <span className="hint-tip" key={tip}>
                      {LOADING_TIPS[tip]}…
                    </span>
                  </>
                ) : (
                  <span>
                    填好创作信息，点击「一键生成文案」
                    <br />
                    AI 会在这里写出完整笔记 ✨
                  </span>
                )}
              </p>
            </>
          )}
        </div>

        <footer className="note-bar">
          <span className="comment-box">说点什么…</span>
          <button
            type="button"
            className={`bar-btn like${liked ? ' on' : ''}`}
            aria-pressed={liked}
            onClick={() => setLiked(v => !v)}
          >
            <span className="bar-icon">
              <IconHeart size={20} />
              {liked && (
                <span className="burst" aria-hidden="true">
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <i key={i} style={{ '--i': i }} />
                  ))}
                </span>
              )}
            </span>
            {liked ? 1 : '赞'}
          </button>
          <button
            type="button"
            className={`bar-btn collect${collected ? ' on' : ''}`}
            aria-pressed={collected}
            onClick={() => setCollected(v => !v)}
          >
            <span className="bar-icon">
              <IconStar size={20} />
            </span>
            {collected ? 1 : '收藏'}
          </button>
          <span className="bar-btn">
            <span className="bar-icon">
              <IconChat size={20} />
            </span>
            评论
          </span>
        </footer>
      </article>

      {error && (
        <div className="error-banner" role="alert">
          <IconAlert size={18} />
          <span>{error}</span>
          {canRegenerate && (
            <button type="button" onClick={onRegenerate}>
              重试
            </button>
          )}
        </div>
      )}

      {hasNote && !busy && (
        <div className="tools">
          <div className="stats">
            <span className={`stat${titleLength > 20 ? ' warn' : ''}`} title="小红书标题最多 20 字">
              标题 <b>{titleLength}</b>/20
            </span>
            <span className="stat">
              正文 <b>{countChars(note.body)}</b> 字
            </span>
            <span className="stat">
              话题 <b>{note.tags.length}</b> 个
            </span>
          </div>
          <div className="actions">
            <button
              type="button"
              className="btn primary"
              onClick={() => copy('all', [note.title, note.body, tagLine].filter(Boolean).join('\n\n'), '全文')}
            >
              {copyIcon('all', 17)}
              复制全文
            </button>
            <button type="button" className="btn" onClick={() => copy('title', note.title, '标题')}>
              {copyIcon('title')}
              复制标题
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => copy('body', [note.body, tagLine].filter(Boolean).join('\n\n'), '正文')}
            >
              {copyIcon('body')}
              复制正文
            </button>
            <button type="button" className="btn regen" onClick={onRegenerate} disabled={!canRegenerate}>
              <IconRefresh size={16} />
              重新生成
            </button>
          </div>
        </div>
      )}
    </section>
  )
})

export default NotePreview
