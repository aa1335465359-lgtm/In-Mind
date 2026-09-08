# 性能优化：登录卡顿与渲染掉帧

> 对应版本：v2.5.1 · 2026-09-08
> 原则与 `memory-planet-release.md` 一致：只动性能，不动数据格式、加密算法输出、API 路由与 Supabase 表结构。

## 范围

- 修复登录后长时间无响应、编辑时掉帧、后台持续跑流量三类问题。
- 着色器（Atmosphere 全屏 fbm / Planet 点阵）在弱设备上的成本降到可跑稳的档位。
- 输出一份按优先级排序的后续优化清单，供后续版本逐步落地。

## 诊断（本机实测数据）

登录卡顿的主因不是网络，而是**主线程同步加密**：

1. `simpleEncrypt` / `simpleDecrypt` 原实现对每个字符重新折叠一遍密码（每字符约 64 次 XOR），且经过 `split/map/join` 三次全量中间数组。实测 1MB 日记（约 3 张压缩照片）：加密 382ms、解密 378ms。登录要解 `data` + `base` 两份 ≈ **660ms 纯阻塞**；照片再多直接进入秒级。
2. `persist()` 在每次编辑后同步执行**两份**全量加密（data + base）。标题输入框每个按键都触发一次，1MB 日记即每键 ~760ms。
3. 密文体积 ≈ 明文的 2.1 倍（`encodeURIComponent` 膨胀 + hex 编码），checkpoint 又存 data+base 双份：**5～6 张照片就会顶满 localStorage 约 5MB 上限**，触发"本机保存失败"。
4. `useJournal` 每 30 秒、每次窗口聚焦、每次 online 事件都 `flush()` → 全量下载整个加密块再比对，干净会话也不例外。挂后台的标签页一天可产生上千次全量请求。
5. 着色器：Atmosphere 每像素多次求值 5 八度 fbm（模式过渡期还要双份求值），且桌面按 1.3× DPR 渲染；Planet 与 Atmosphere **两个 WebGL 上下文**在登录瞬间同时初始化编译；`typographyCanvas` 每个词最多 5×420 次螺旋探测，每次探测都 `measureText` + 重复设置 `ctx.font`。
6. 登录瞬间的时间线：three.js 代码块下载 → 两个上下文着色器编译 → 字段几何采样 → 全量解密 → 首次云同步，全部挤在同一秒内争主线程。

## 本次已落地

| # | 改动 | 文件 | 效果 |
| --- | --- | --- | --- |
| 1 | 加密热路径重写：掩码一次折叠 + 256 项查表 + 数组 join；解密十六进制快速路径 | `services/encryption.ts` | 1MB 实测加密 382→29ms、解密 378→36ms、登录双解 660→48ms（≈14×），输出逐字节不变 |
| 2 | 等价性回归：旧实现原样保留为参照，乱码/遗留数据/非 ASCII 暗号路径全部钉死 | `tests/encryptionParity.test.ts` | 新增 4 项测试 |
| 3 | 已同步 checkpoint 的 `data==base` 跳过第二份解密；base 密文按引用缓存 | `services/journalSession.ts` | 登录少解一份密文；按键不再重复加密基线 |
| 4 | 脏标记 + 5 分钟新鲜度窗口；`flush(force)` 保留手动全量语义 | `services/syncEngine.ts`、`hooks/useJournal.ts` | 干净会话周期/聚焦 flush 零网络；登录挂载与"重新同步"仍强制全量；跨设备更新 5 分钟内落地 |
| 5 | Atmosphere：内部分辨率移动端 0.66× / 桌面 1.0×（原 1× / 1.3×）；30fps 上限、编辑器打开时 12fps；移动端 fbm 5→3 八度 | `components/memory/Atmosphere.tsx` | 弱 GPU 每像素成本降约一半以上，软渐变背景视觉无感 |
| 6 | Planet：关闭 MSAA（点精灵无收益）；DPR 1.5/1.8→1.2/1.5；初始几何改 `requestIdleCallback` 构建 | `components/memory/Planet.tsx` | 首帧先画 UI；顺带消除挂载时的重复构建（原同步构建 + idle 重建各一次） |
| 7 | `measureText` 按（词， 字号）缓存、`ctx.font` 赋值去重 | `components/memory/memoryField.ts` | 词云探测阶段从上万次测量降为每词每档一次 |
| 8 | 锁屏输入暗号期间空闲预取四个代码块（含 three.js ~118KB gzip） | `App.tsx` | 登录后只剩挂载与编译，无网络等待 |

## 后续优化建议（按优先级）

### P0 · 根因级

1. **照片迁出加密块**。dataURL 照片存 IndexedDB（键 = entryId），加密数组只存引用；云端已有 `journal-photos` bucket，本地模式目前照片永远嵌在密文里——这是登录卡顿、每键加密成本、localStorage 5MB 上限三件事的共同根因。需要一次读时迁移（读到旧格式就搬运），不改变加密算法本身。
2. **云端按条目同步**。`encrypted_journals` 目前整包一行，同步流量恒为 O(全量)。改为按 entry 分行（或 JSONB 按 id 合并）后，增量同步只传改动条目。改动大，建议先出表结构设计再动手，并保留整包回退读取兼容旧客户端。

### P1 · 渲染

3. **双 WebGL 上下文合一**。一个 renderer 用 viewport/scissor 分两次渲染背景与点阵，移动端省一半上下文内存与切换成本；`webglcontextlost` 的处理也能简化成一处。
4. **着色器运行时 LOD**。当前分辨率档位是静态的；按实测帧时间自动升降内部分辨率，弱设备也能稳 30fps，强设备不再浪费。
5. `MemoryWorkspace` 每次渲染都拼接全文 `keywordSignature` 并重跑分词；可按 `entry.id + content.length` 缓存，编辑长文时省一轮全文扫描。

### P2 · 工程卫生

6. **删除死代码**。`ThemeBackground` 与 20 余个 `*Layer` 组件、`JournalUI` / `CalendarView` / `TodoItem` / `TaskInput` / `AiAssistant` / `DevConsole` / `IntroModal` / `ScriptMatcher` / `usePanicMode` / `components/journal/*` / `services/storage.ts` / `src/` 脚手架残留，均不在当前入口引用图内。tree-shaking 已保证不影响产物，但维护时极易误改、误测。
7. 入口 bundle 154KB（gzip 50KB，React+DOM+lucide）。可选 `preact/compat`（约 -40KB gzip，需回归测试）；lucide 已按图标 tree-shake，收益有限。
8. `sw.js` 目前只清旧缓存。可选对带 hash 的 `assets/*` 开 cache-first，二次访问零网络；注意保持"数据永不经 SW 缓存"的现有约定。
9. **已知怪癖（建议尽快处理）**：非 ASCII 暗号（如中文）时 v2.1 算法的掩码折叠超过 255，旧实现本身就无法还原明文（`encryptionParity.test.ts` 已钉死该行为以保证兼容）。建议注册处限制暗号为 ASCII 可打印字符，或输入框旁明确提示，避免用户用中文暗号写入后读不回。

## 风险与兼容

- 加密：SALT、`hashPasscode`、`encodeURIComponent` 步骤、输出格式全部未动；新旧实现输出逐字节一致（含乱码密文、遗留非 URI 数据、空暗号路径），由 parity 测试长期保证。
- flush 跳过：仅影响"干净且 5 分钟内刚全量同步"的会话；离线、出错、有未同步编辑的会话行为与之前完全一致。手动"重新同步"按钮与登录挂载仍是强制全量。
- 渲染：分辨率、DPR、八度数只影响成本档位；`prefers-reduced-motion`、天气/氛围模式切换、色调过渡逻辑未动。

## 验证

- `npm test`：26 项通过（新增 4 项加密等价性 + 1 项 flush 语义回归）。
- `npm run build`：tsc + vite 生产构建通过，chunk 划分不变。
- 未覆盖：真实 Supabase 环境、真机 WebGL 帧率（建议 iPhone/中端安卓各过一遍登录 → 编辑 → 切换回忆 → 归档路径）。

## 回滚

单 commit revert 即可；本次无数据迁移、无格式变更、无环境变量改动。
