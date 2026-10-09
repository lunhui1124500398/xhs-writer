'use client'

import { useEffect, useState } from 'react'

// 输入框为空时，placeholder 会像打字一样轮播示例主题
export default function TypingInput({ examples, value, ...props }) {
  const [typed, setTyped] = useState(examples[0])
  const idle = !value

  useEffect(() => {
    if (!idle || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let index = 0
    let length = examples[0].length
    let deleting = true
    let timer

    function tick() {
      const word = examples[index]
      length += deleting ? -1 : 1
      setTyped(word.slice(0, length))

      if (deleting && length === 0) {
        deleting = false
        index = (index + 1) % examples.length
        timer = setTimeout(tick, 250)
      } else if (!deleting && length === word.length) {
        deleting = true
        timer = setTimeout(tick, 2400)
      } else {
        timer = setTimeout(tick, deleting ? 30 : 110)
      }
    }

    setTyped(examples[0])
    timer = setTimeout(tick, 4000)
    return () => clearTimeout(timer)
  }, [examples, idle])

  return <input {...props} value={value} placeholder={`例如：${typed}`} />
}
