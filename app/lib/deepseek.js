// 服务端接口和浏览器直连（GitHub Pages 静态部署）共用的 DeepSeek 调用逻辑

export const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

function buildPrompt({ topic, style, content, other }) {
  return `你是一个资深小红书文案创作者，擅长写出高互动、高收藏的爆款笔记。请根据以下信息创作一篇小红书文案。

【笔记主题】${topic}
【文案风格】${style}
${content ? `【想要表达的内容】${content}` : ''}
${other ? `【其他要求】${other}` : ''}

创作要求：
1. 先写一个吸引人的标题（可用数字、提问、反差、感叹等技巧，标题单独一行）
2. 正文生动有趣，符合小红书用户的阅读习惯，有节奏感
3. 适当使用 emoji 让文案更活泼，但不要堆砌
4. 文末添加 3-5 个相关话题标签（用 # 开头）
5. 正文控制在 200-400 字左右
6. 直接输出文案，不要加任何解释说明`
}

export function requestBody(input) {
  return JSON.stringify({
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: buildPrompt(input) }],
    temperature: 0.8,
    max_tokens: 1024,
    stream: true,
  })
}

// 把 DeepSeek 的 SSE 事件流转换成纯文本流，前端边收边显示
export function sseToText(body) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read()
      if (done) {
        controller.close()
        return
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (data === '[DONE]') continue
        try {
          const text = JSON.parse(data).choices?.[0]?.delta?.content
          if (text) controller.enqueue(encoder.encode(text))
        } catch {}
      }
    },
    cancel() {
      reader.cancel()
    },
  })
}

// 浏览器直连时，把 DeepSeek 返回的错误状态码翻译成看得懂的提示
export function errorMessage(status) {
  if (status === 401) return 'API Key 无效，请检查后重新填写'
  if (status === 402) return 'DeepSeek 账户余额不足，充值后再试'
  if (status === 429) return '请求太频繁了，稍等一会儿再试'
  if (status >= 500) return 'AI 服务暂时不可用，请稍后重试'
  return '生成失败，请重试'
}
