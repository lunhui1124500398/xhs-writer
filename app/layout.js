import './globals.css'

export const metadata = {
  title: '小红书文案助手',
  description: '输入主题，一键生成小红书爆款文案',
}

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fff6f3' },
    { media: '(prefers-color-scheme: dark)', color: '#130e10' },
  ],
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
