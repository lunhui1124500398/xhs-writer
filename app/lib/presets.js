function rgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

export const STYLES = [
  { name: '种草推荐', emoji: '🌱', desc: '安利心头好物', accent: '#FF3D6E', cover: ['#FFE1E9', '#FFF3EA'] },
  { name: '探店打卡', emoji: '📍', desc: '真实到店体验', accent: '#FF8A00', cover: ['#FFEACF', '#FFF8EA'] },
  { name: '日常分享', emoji: '☀️', desc: '记录生活碎片', accent: '#1E9BE9', cover: ['#DAF0FF', '#F1FAFF'] },
  { name: '好物分享', emoji: '🛍️', desc: '实用清单合集', accent: '#A855F7', cover: ['#F0E3FF', '#FFEFF7'] },
  { name: '教程干货', emoji: '📚', desc: '步骤清晰易学', accent: '#10B981', cover: ['#D8F5E8', '#F0FBF5'] },
  { name: '心得体会', emoji: '💭', desc: '经验感悟共鸣', accent: '#6366F1', cover: ['#E3E6FF', '#F4EFFF'] },
].map(style => ({
  ...style,
  tint: rgba(style.accent, 0.1),
  ring: rgba(style.accent, 0.35),
  marker: rgba(style.accent, 0.3),
}))

export function findStyle(name) {
  return STYLES.find(style => style.name === name) || STYLES[0]
}

export const IDEAS = [
  { emoji: '🧋', topic: '秋天第一杯奶茶', style: '种草推荐', content: '新开的这家桂花乌龙超级香，奶盖绵密不腻，忍不住想安利' },
  { emoji: '⛺', topic: '周末露营攻略', style: '教程干货', content: '新手第一次露营要准备什么、怎么选营地、有哪些坑要避开' },
  { emoji: '☕', topic: '藏在巷子里的宝藏咖啡店', style: '探店打卡', content: '环境安静适合办公，手冲很有水准，人均 40 左右' },
  { emoji: '📖', topic: '考研上岸经验分享', style: '心得体会', content: '二战上岸，想聊聊心态调整和每天的时间规划' },
  { emoji: '💄', topic: '学生党平价彩妆', style: '好物分享', content: '百元以内也能化出精致妆容的几样宝藏单品' },
  { emoji: '🌿', topic: '独居女生的周末', style: '日常分享', content: '一个人做饭、看书、养花，慢慢过的治愈日常' },
  { emoji: '🏃', topic: '30 天跑步打卡', style: '心得体会', content: '从跑 1 公里就喘，到能轻松跑完 5 公里的变化' },
  { emoji: '🍜', topic: '本地人才知道的苍蝇馆子', style: '探店打卡', content: '开了二十年的老店，招牌牛肉面汤头浓郁，十几块吃到饱' },
  { emoji: '🧳', topic: '三天两晚城市漫游', style: '教程干货', content: '小众路线、交通方式和预算安排，一篇就够' },
  { emoji: '🪴', topic: '出租屋爆改小技巧', style: '好物分享', content: '花 500 块让出租屋焕然一新，好用的小物件分享' },
]

export const QUICK_REQUIREMENTS = ['语气俏皮一点', '像闺蜜聊天', '200 字以内', '加上价格信息', '分点列清单', '结尾引导互动']
