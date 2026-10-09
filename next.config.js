/** @type {import('next').NextConfig} */
const nextConfig = {}

// 部署到 GitHub Pages 时导出为纯静态网站：没有服务端接口，访客在页面里填写自己的 DeepSeek Key，由浏览器直连 DeepSeek
if (process.env.GITHUB_PAGES === 'true') {
  nextConfig.output = 'export'
  nextConfig.basePath = process.env.PAGES_BASE_PATH || ''
  nextConfig.env = { NEXT_PUBLIC_DIRECT_MODE: '1' }
}

module.exports = nextConfig
