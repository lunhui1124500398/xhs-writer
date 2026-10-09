import { DEEPSEEK_URL, requestBody, sseToText } from '../../lib/deepseek'

// 流式输出会让函数保持运行直到生成结束，放宽部署平台（如 Vercel）的默认时长限制
export const maxDuration = 60

// 公开部署后任何人都能调用这个接口，限制各项输入的长度，避免超长内容消耗 API 额度
const FIELDS = {
  topic: ['笔记主题', 100],
  style: ['文案风格', 20],
  content: ['想要表达的内容', 1000],
  other: ['其他要求', 500],
}

export async function POST(request) {
  const body = await request.json().catch(() => null)
  const input = {}
  for (const [key, [label, max]] of Object.entries(FIELDS)) {
    const value = typeof body?.[key] === 'string' ? body[key].trim() : ''
    if (value.length > max) {
      return Response.json({ error: `${label}最多 ${max} 字，精简一下再试试吧` }, { status: 400 })
    }
    input[key] = value
  }

  if (!input.topic) {
    return Response.json({ error: '请输入笔记主题' }, { status: 400 })
  }

  let res
  try {
    res = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: requestBody(input),
    })
  } catch (e) {
    return Response.json({ error: '网络错误，请检查连接后重试' }, { status: 500 })
  }

  if (!res.ok || !res.body) {
    console.error('DeepSeek API error:', res.status, await res.text())
    return Response.json({ error: 'AI 服务暂时不可用，请稍后重试' }, { status: 502 })
  }

  return new Response(sseToText(res.body), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
