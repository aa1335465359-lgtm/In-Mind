# In-Mind 更新日志

> 项目地址: https://github.com/aa1335465359-lgtm/In-Mind
> 部署地址: https://hush-mesh.vercel.app (Vercel)

---

## v2.5.0 - 2026-05-06

### 🔧 Bug 修复
- **AI 续写无感** — 修复 ghost text 竞态条件：插入 ghost `<span>` 后 `contentEditable.onInput` 事件立即将其删除，导致续写文字瞬间消失。加入 `skipGhostRemovalRef` 跳过插入后的首次 input 事件。
- **右侧面板不显示总结/诗** — `aiSummary`/`aiMood` 字段已标记 deprecated 但从未渲染。新增 `AiResultPanel` 组件挂在右侧 MemoryCard 上方。

### ✨ 体验改进
- AI 续写触发阈值从 20 字降到 10 字，等待时间从 2s 降到 1.5s
- 右键菜单 "顺着思绪往下写" 不再弹假 alert，改为直接调用 AI 续写
- AI 续写 ghost text 去掉了过强的 pulse 动画，改为淡色静默展示

### 🎨 卡片重设计
- 空状态插图从简陋的 3 个几何图形（圆+拱+方块）改为 rich SVG 渐变组合：
  - 三层渐变填充形状（circle 琥珀→粉、arch 薄荷→蓝、rect 紫→靛）
  - 三层装饰性圆环（实线+虚线+细线）
  - 散布 accent dots + 装饰线条 + 中心 glyph
- 新增三层 atmospheric blur orbs，始终可见，不再依赖 `shapeStyle` 条件渲染
- 10 套完整配色主题扩展：每套含 `cardGradient`（卡片底色渐变）、`glow`（外发光阴影）、`border`、`textMuted`、`moodBg`
- 背景大图标始终呈现（opacity 6%），不再条件隐藏
- 整体 glass morphism 层次感增强

### 📝 待续
- [ ] Vercel 环境变量 GEMINI_API_KEY 确认是否有效
- [ ] AI 续写在生产环境需确认 API 通路
- [ ] 卡片形状可选（organic/geometric/minimal）目前 UI 未暴露切换入口
- [ ] 移动端适配（当前 xl:flex 仅在宽屏显示右侧面板）
