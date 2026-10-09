'use client'

import { useEffect, useRef, useState } from 'react'
import NotePreview from './components/NotePreview'
import TypingInput from './components/TypingInput'
import {
  IconArrowUpRight,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconLightbulb,
  IconPlus,
  IconSparkles,
} from './components/Icons'
import { IDEAS, QUICK_REQUIREMENTS, STYLES, findStyle } from './lib/presets'
import { countChars } from './lib/note'
import { DEEPSEEK_URL, errorMessage, requestBody, sseToText } from './lib/deepseek'

const TOPIC_EXAMPLES = IDEAS.map(idea => idea.topic)
const SEPARATORS = /[，,、；;]/
// 部署到 GitHub Pages 这类纯静态托管时没有服务端接口：访客填写自己的 DeepSeek Key，由浏览器直连 DeepSeek
const DIRECT = process.env.NEXT_PUBLIC_DIRECT_MODE === '1'
const KEY_STORAGE = 'xhs-writer:deepseek-key'

class FriendlyError extends Error {}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 非 HTTPS（如手机通过局域网 IP 访问）时 clipboard API 不可用，退回旧方案
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
    document.body.appendChild(textarea)
    textarea.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {}
    textarea.remove()
    return ok
  }
}

export default function Home() {
  const [topic, setTopic] = useState('')
  const [style, setStyle] = useState(STYLES[0].name)
  const [content, setContent] = useState('')
  const [other, setOther] = useState('')
  const [result, setResult] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [usedStyle, setUsedStyle] = useState(STYLES[0].name)
  const [flash, setFlash] = useState(0)
  const [roll, setRoll] = useState(0)
  const [toast, setToast] = useState(null)
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [keyFlash, setKeyFlash] = useState(0)
  const abortRef = useRef(null)
  const previewRef = useRef(null)
  const keyRef = useRef(null)
  const toastTimer = useRef()

  const busy = status === 'loading' || status === 'streaming'
  const otherParts = other.split(SEPARATORS).map(part => part.trim())

  useEffect(() => {
    const root = document.documentElement
    let frame = 0

    function handleMove(e) {
      if (e.pointerType !== 'mouse') return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        root.style.setProperty('--mx', (e.clientX / window.innerWidth - 0.5).toFixed(3))
        root.style.setProperty('--my', (e.clientY / window.innerHeight - 0.5).toFixed(3))
      })
    }

    window.addEventListener('pointermove', handleMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', handleMove)
      cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(
    () => () => {
      abortRef.current?.abort()
      clearTimeout(toastTimer.current)
    },
    []
  )

  useEffect(() => {
    if (!DIRECT) return
    try {
      setApiKey(localStorage.getItem(KEY_STORAGE) || '')
    } catch {}
  }, [])

  function showToast(text, { icon = '✓', tone = 'ok' } = {}) {
    clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), text, icon, tone })
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }

  function applyIdea(idea) {
    setTopic(idea.topic)
    setStyle(idea.style)
    setContent(idea.content)
    setFlash(n => n + 1)
    showToast(`已填入灵感「${idea.topic}」`, { icon: idea.emoji, tone: 'plain' })
  }

  function rollIdea() {
    const pool = IDEAS.filter(idea => idea.topic !== topic)
    applyIdea(pool[Math.floor(Math.random() * pool.length)])
    setRoll(n => n + 1)
  }

  function toggleRequirement(text) {
    const parts = otherParts.filter(Boolean)
    setOther((parts.includes(text) ? parts.filter(part => part !== text) : [...parts, text]).join('，'))
  }

  function updateKey(value) {
    setApiKey(value)
    try {
      if (value.trim()) localStorage.setItem(KEY_STORAGE, value.trim())
      else localStorage.removeItem(KEY_STORAGE)
    } catch {}
  }

  async function generate() {
    const trimmedTopic = topic.trim()
    if (!trimmedTopic || busy) return

    if (DIRECT && !apiKey.trim()) {
      keyRef.current?.focus()
      setKeyFlash(n => n + 1)
      showToast('先填写你的 DeepSeek API Key 才能生成哦', { icon: '🔑', tone: 'plain' })
      return
    }

    const controller = new AbortController()
    abortRef.current?.abort()
    abortRef.current = controller
    setStatus('loading')
    setResult('')
    setError('')
    setUsedStyle(style)

    if (window.matchMedia('(max-width: 1023px)').matches) {
      previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    let text = ''
    try {
      const input = { topic: trimmedTopic, style, content: content.trim(), other: other.trim() }
      const res = DIRECT
        ? await fetch(DEEPSEEK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey.trim()}` },
            body: requestBody(input),
            signal: controller.signal,
          })
        : await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
            signal: controller.signal,
          })

      if (!res.ok) {
        if (DIRECT) throw new FriendlyError(errorMessage(res.status))
        const data = await res.json().catch(() => ({}))
        throw new FriendlyError(data.error || '生成失败，请重试')
      }

      const reader = (DIRECT ? sseToText(res.body) : res.body).getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value, { stream: true })
        setResult(text)
        setStatus('streaming')
      }
      text += decoder.decode()

      if (!text.trim()) throw new FriendlyError('生成失败，请重试')
      setResult(text)
      setStatus('done')
    } catch (e) {
      if (abortRef.current !== controller) return
      if (e.name === 'AbortError') {
        setStatus(text ? 'stopped' : 'idle')
      } else {
        setError(e instanceof FriendlyError ? e.message : text ? '生成中断了，请重试' : '网络错误，请检查连接后重试')
        setStatus('error')
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }

  function stop() {
    abortRef.current?.abort()
  }

  function handleSubmit(e) {
    e.preventDefault()
    generate()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      generate()
    }
  }

  async function handleCopy(text, label) {
    const ok = await copyText(text)
    if (ok) showToast(`${label}已复制，去小红书粘贴吧`)
    else showToast('复制失败，请手动选中文字复制', { icon: '!', tone: 'error' })
    return ok
  }

  return (
    <>
      <div className="bg" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
        <span className="blob b4" />
        <span className="bg-dots" />
      </div>

      <main className="page">
        <header className="hero">
          <div className="stickers" aria-hidden="true">
            <span className="sticker s1">
              <span className="sticker-inner">💖</span>
            </span>
            <span className="sticker s2">
              <span className="sticker-inner">✨</span>
            </span>
            <span className="sticker s3">
              <span className="sticker-inner">📝</span>
            </span>
            <span className="sticker s4">
              <span className="sticker-inner">🔥</span>
            </span>
          </div>

          <p className="badge reveal">
            <span className="badge-icon">
              <IconSparkles size={13} fill="currentColor" />
            </span>
            AI 爆款笔记生成器
            <span className="badge-sub">DeepSeek 驱动</span>
          </p>

          <h1 className="reveal" style={{ '--d': '80ms' }}>
            <span className="title-grad">
              小红书
              <svg className="squiggle" viewBox="0 0 200 24" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="squiggle-gradient" x1="0" x2="1">
                    <stop offset="0" stopColor="#FF2E4D" />
                    <stop offset="1" stopColor="#FFB13D" />
                  </linearGradient>
                </defs>
                <path d="M4 16 C 36 5, 66 5, 98 13 S 162 22, 196 8" />
              </svg>
            </span>
            文案助手
          </h1>

          <p className="subtitle reveal" style={{ '--d': '160ms' }}>
            输入主题、挑个风格，AI 一键帮你写出带标题、emoji 和话题标签的<mark>爆款</mark>小红书文案
          </p>

          <ul className="features reveal" style={{ '--d': '240ms' }}>
            <li>⚡ 实时流式生成</li>
            <li>🎨 6 种文案风格</li>
            <li>🏷️ 自动配话题</li>
          </ul>
        </header>

        <section className="ideas reveal" style={{ '--d': '320ms' }} aria-label="灵感示例">
          <span className="ideas-label">
            <IconLightbulb size={15} />
            灵感
          </span>
          <div className="marquee">
            <div className="marquee-track">
              {[0, 1].map(copy => (
                <div className="marquee-group" key={copy} aria-hidden={copy === 1 || undefined}>
                  {IDEAS.map(idea => (
                    <button
                      type="button"
                      key={idea.topic}
                      className="idea-chip"
                      tabIndex={copy === 1 ? -1 : undefined}
                      onClick={() => applyIdea(idea)}
                    >
                      <span aria-hidden="true">{idea.emoji}</span>
                      {idea.topic}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="workspace reveal" style={{ '--d': '400ms' }}>
          <form className="card form-card" onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
            <div className="card-head">
              <span className="card-icon" aria-hidden="true">
                ✍️
              </span>
              <div>
                <h2>告诉 AI 你想写什么</h2>
                <p>信息越具体，写出来的文案越像你</p>
              </div>
            </div>

            <div className="field">
              <div className="label-row">
                <label htmlFor="topic" className="label">
                  <span className="step">1</span>
                  笔记主题
                  <span className="required">*</span>
                </label>
                <button type="button" className="text-btn" onClick={rollIdea}>
                  <span key={roll} className={`dice${roll ? ' roll' : ''}`} aria-hidden="true">
                    🎲
                  </span>
                  随机灵感
                </button>
              </div>
              <div className="control-wrap">
                <TypingInput
                  id="topic"
                  type="text"
                  className="control control-lg"
                  examples={TOPIC_EXAMPLES}
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  autoComplete="off"
                  required
                />
                {flash > 0 && <span key={flash} className="flash-ring" aria-hidden="true" />}
              </div>
            </div>

            <div className="field">
              <div className="label-row">
                <span className="label" id="style-label">
                  <span className="step">2</span>
                  文案风格
                </span>
              </div>
              <div className="style-grid" role="radiogroup" aria-labelledby="style-label">
                {STYLES.map(s => (
                  <label
                    key={s.name}
                    className={`style-option${style === s.name ? ' active' : ''}`}
                    style={{ '--accent': s.accent, '--tint': s.tint, '--ring': s.ring }}
                  >
                    <input
                      type="radio"
                      name="style"
                      value={s.name}
                      checked={style === s.name}
                      onChange={() => setStyle(s.name)}
                    />
                    <span className="style-emoji" aria-hidden="true">
                      {s.emoji}
                    </span>
                    <span className="style-text">
                      <strong>{s.name}</strong>
                      <small>{s.desc}</small>
                    </span>
                    <span className="style-check" aria-hidden="true">
                      <IconCheck size={12} strokeWidth={3.2} />
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="field">
              <div className="label-row">
                <label htmlFor="content" className="label">
                  <span className="step">3</span>
                  想要表达的内容
                  <span className="optional">选填</span>
                </label>
                <span className="counter">{countChars(content)} 字</span>
              </div>
              <div className="control-wrap">
                <textarea
                  id="content"
                  className="control"
                  placeholder="你希望文案传达什么？比如：想分享这家店的招牌甜品特别惊艳"
                  rows={3}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                />
                {flash > 0 && <span key={flash} className="flash-ring" aria-hidden="true" />}
              </div>
            </div>

            <div className="field">
              <div className="label-row">
                <label htmlFor="other" className="label">
                  <span className="step">4</span>
                  其他要求
                  <span className="optional">选填</span>
                </label>
              </div>
              <input
                id="other"
                type="text"
                className="control"
                placeholder="例如：语气俏皮一点、加上价格信息、控制在 200 字以内"
                value={other}
                onChange={e => setOther(e.target.value)}
              />
              <div className="chips">
                {QUICK_REQUIREMENTS.map(text => {
                  const on = otherParts.includes(text)
                  return (
                    <button
                      type="button"
                      key={text}
                      className={`chip${on ? ' on' : ''}`}
                      aria-pressed={on}
                      onClick={() => toggleRequirement(text)}
                    >
                      {on ? <IconCheck size={13} strokeWidth={3} /> : <IconPlus size={13} strokeWidth={3} />}
                      {text}
                    </button>
                  )
                })}
              </div>
            </div>

            {DIRECT && (
              <div className="field">
                <div className="label-row">
                  <label htmlFor="api-key" className="label">
                    <span className="step">5</span>
                    DeepSeek API Key
                    <span className="required">*</span>
                  </label>
                  <a
                    className="text-btn"
                    href="https://platform.deepseek.com/api_keys"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    获取 Key
                    <IconArrowUpRight size={14} strokeWidth={2.4} />
                  </a>
                </div>
                <div className="control-wrap">
                  <input
                    ref={keyRef}
                    id="api-key"
                    type={showKey ? 'text' : 'password'}
                    className="control key-input"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={e => updateKey(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    className="key-toggle"
                    aria-label={showKey ? '隐藏 Key' : '显示 Key'}
                    onClick={() => setShowKey(v => !v)}
                  >
                    {showKey ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </button>
                  {keyFlash > 0 && <span key={keyFlash} className="flash-ring" aria-hidden="true" />}
                </div>
                <p className="key-note">🔒 Key 只保存在你的浏览器里，生成时直接发给 DeepSeek，不经过任何其他服务器</p>
              </div>
            )}

            <button type="submit" className={`generate${busy ? ' busy' : ''}`} disabled={busy || !topic.trim()}>
              {busy ? (
                <>
                  AI 正在创作
                  <span className="dots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                </>
              ) : (
                <>
                  <IconSparkles size={20} />
                  一键生成文案
                </>
              )}
            </button>
            <p className="kbd-hint">
              <kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>Enter</kbd> 快速生成
            </p>
          </form>

          <NotePreview
            ref={previewRef}
            status={status}
            result={result}
            error={error}
            topic={topic}
            styleMeta={findStyle(result ? usedStyle : style)}
            canRegenerate={Boolean(topic.trim())}
            onStop={stop}
            onRegenerate={generate}
            onCopy={handleCopy}
          />
        </div>

        <footer className="footer">
          <span>内容由 AI 生成，仅供参考，发布前请自行核对</span> · <span>Powered by DeepSeek</span>
        </footer>
      </main>

      <div className="toast-layer" aria-live="polite">
        {toast && (
          <div className={`toast ${toast.tone}`} key={toast.id}>
            <span className="toast-icon" aria-hidden="true">
              {toast.icon}
            </span>
            {toast.text}
          </div>
        )}
      </div>
    </>
  )
}
