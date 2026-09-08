# In-Mind 更新日志

> 项目地址: https://github.com/aa1335465359-lgtm/In-Mind
> 部署地址: https://hush-mesh.vercel.app (Vercel)

---

## v2.5.1 - 2026-09-08

### ⚡ 性能（详见 docs/performance-optimization.md）
- **登录卡半天** — 根因是主线程同步加密：旧实现对每字符重新折叠密码并三次全量建数组，1MB 日记（约 3 张照片）登录要阻塞 ~660ms，照片更多即秒级。热路径重写为掩码一次折叠 + 查表 + 数组 join，实测 660ms→48ms（≈14×），输出与旧实现逐字节一致（新增 parity 回归钉死，含乱码/遗留数据路径）。
- **编辑掉帧** — 每次按键的持久化要同步加密 data + base 两份全量；已同步 checkpoint 跳过第二份解密，base 密文按引用缓存，不再重复加密基线。
- **后台空跑流量** — 干净会话每 30 秒/每次聚焦都全量重读云端加密块。引入脏标记 + 5 分钟新鲜度窗口：干净且新鲜的 flush 直接跳过；登录挂载与"重新同步"按钮仍强制全量，跨设备更新 5 分钟内照常落地。
- **着色器卡顿** — Atmosphere 全屏 fbm 移动端降到 0.66× 内部分辨率、3 八度（桌面 1.0×、5 八度不变视觉），30fps 上限、编辑器打开时 12fps；Planet 关闭点精灵无收益的 MSAA、DPR 1.5/1.8→1.2/1.5，初始几何改 requestIdleCallback 空闲构建（顺带消除挂载时的重复构建）。
- **词云显影** — typographyCanvas 每词最多 2100 次螺旋探测、每次都 measureText；改为按（词， 字号）缓存 + ctx.font 去重。
- **登录等待** — 锁屏输入暗号期间空闲预取工作区、两个 WebGL 层与 session 代码块（含 three.js ~118KB gzip），登录后只剩挂载与编译。

### 🧪 测试
- 新增 `tests/encryptionParity.test.ts`：旧加密实现原样保留为参照，输出逐字节比对（中文/emoji/base64/乱码密文/非 ASCII 暗号怪癖全覆盖）
- 新增 flush 语义回归：干净会话跳过冗余全量、强制 flush 仍全量

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
