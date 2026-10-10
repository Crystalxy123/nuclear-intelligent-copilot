# 核衡智枢 · 页面动画与完整事故演示

现有六页导航和深蓝界面保持不变。本轮让设备运行、趋势变化、智能体分析、方案形成和审计留痕连续呈现。事件回放仍位于「证据与审计」内部。

## 启动与操作

打开 [本地 Demo](http://localhost:3000/)。如服务未启动，在项目目录执行：

```sh
npm run dev -- --host 0.0.0.0 --port 3000
```

顶部事件栏下方有两个入口：

- **演示一次完整事故流程**：约 25 秒自动导航并推进 Event-021。
- **单步演示**：从正常状态开始，点击「下一步」逐个讲解；也可点击「继续演示」转为自动播放。

演示开始后，可随时「暂停演示」「继续演示」「重置演示」或「退出演示」。重置返回 T+0 的正常运行并保持暂停；退出回到运行总览并恢复演示前的记录。播放结束可「再演示一次」。

在页面中点击或使用键盘会先暂停自动流程，避免手动交互与自动导航相互冲突；演示控制条自身的操作除外。页面离开前台也会暂停。人工复核示例出现时，顶部控制条仍可操作。

右上角动效开关控制环境动画和数值表现；事故流程有独立的暂停按钮。审计内历史回放另有播放、暂停、重置与 1× / 2× / 5×，不会改写当前审核记录。

## 25 秒流程

| 时间 | 画面与状态 |
| --- | --- |
| 0–3 秒 | 运行总览进入实时机组，设备与管路运行，P101 开始下降 |
| 5 秒 | P-201 异常强调，A317 告警与顶部计数更新 |
| 7 / 9 / 11 秒 | 安全、绿色、设备智能体分别读取、检索、推理并形成结论 |
| 13.5 秒 | 三方连线汇入协同判断，显示中低风险 |
| 15–18 秒 | 进入决策中心，A/B/C 依次呈现，推荐方案 B |
| 21–24 秒 | 展示人工复核步骤示例，明确标记「非人工签名」 |
| 25 秒 | 进入证据与审计，链路节点依次点亮 |

自动流程中的确认仅是演示样例。真实手动复核仍须勾选两个核查项并填写至少 8 字理由，示例界面不会代替用户提交这一操作。

## 三类动画

| 类别 | 具体表现 | 触发与停止 |
| --- | --- | --- |
| 环境 Ambient | 轻微网格漂移、少量孪生粒子、局部扫描、小型在线圆点、管道介质、泵叶轮与汽轮机内部叶片、能源流 | 仅在相关可见区域运行；支持全局暂停、后台暂停与减少动态 |
| 状态 State | 压力数值平滑变化、转速减慢、液位下降、一次告警外环、Agent 阶段和完成标记、评分条、推荐徽标、风险仪表、收益计数、摘要计算反馈 | 数据状态变化驱动；动画不会反向决定业务状态 |
| 交互 Navigation | 共享导航高亮平移、短页面与卡片入场、设备视角平移缩放、抽屉、证据定位高亮、审计详情过渡、回放时间轴 | 用户操作或自动演示导航触发；保留同一 Event-021 上下文 |

首次 KPI 计数及曲线绘制使用身份标记，返回页面不反复从零播放。后续图表更新追加趋势，数值从当前显示值平滑过渡。推荐徽标和告警反馈执行一次，不让整张卡片持续闪烁。

审计历史回放对应 T+00 正常、T+30 压力下降、T+60 A317、T+90 协同分析、T+120 方案、T+180 人工复核节点；曲线、P-201、风险、三智能体和历史决策卡同步变化。

## 组件与文件

| 新增组件 / 状态工具 | 作用 |
| --- | --- |
| `components/TwinOperatingLayer.tsx` | 孪生管道、内部叶轮、液位、发电机和微粒子 |
| `lib/use-alarm-presentation.ts` | 同一时钟驱动压力下降、设备提示、告警与时间线 |
| `components/AnimatedNumber.tsx` | HTML / SVG 数值缓动、首次计数、收益依次呈现 |
| `components/DemoPlaybackControls.tsx` | 25 秒自动流程、单步、暂停、重置、退出与手动接管 |
| `components/MotionLifecycle.tsx` | 暂停循环动画，并收束入场动画以保持页面可读 |
| `components/EnergyFlow.tsx` | 核电、新能源与电网的局部 SVG 能源流 |
| `lib/demo-playback.ts` | 演示播放状态，使用 React 外部共享状态 |
| `lib/use-first-view-motion.ts` | 首次可见时绘制，返回时保留已展示状态 |

主要修改文件：

- 页面入口与全局控制：`app/page.tsx`、`app/layout.tsx`、`lib/use-demo-motion.ts`。
- 总览与机组：`components/OverviewDashboard.tsx`、`RealtimeUnits.tsx`、`EquipmentDrawer.tsx`、`UnitTrendChart.tsx`、`lib/unit-demo.ts`。
- 智能体与绿色工作台：`components/CommandCenter.tsx`、`AgentProgress.tsx`、`GreenWorkspace.tsx`、`GreenDispatchChart.tsx`、`EnergyWorkspace.tsx`。
- 决策与证据：`components/DecisionCenter.tsx`、`EvidenceDrawer.tsx`、`HumanReviewDialog.tsx`、`EvidenceAudit.tsx`、`ReplayController.tsx`、`EventTimeline.tsx`。
- 仿真：`components/PctranSimulator.tsx`、`SimulationMimic.tsx`。
- 事件与隔离：`lib/demo-event.ts`、`lib/decision-card.ts`、`lib/evidence-audit.ts`。
- 动画样式：`app/motion-enhanced.css`、`motion-twin-enhanced.css`、`motion-agents-enhanced.css`、`motion-decision-enhanced.css`，以及已有 `demo-motion.css` 等相关样式。
- 自动验收：`scripts/verify_motion_experience.py`、`scripts/verify_motion_performance.py`，结果位于 `artifacts/motion-experience/`。

## 实现与数据边界

没有引入大型动画库。主要使用 CSS transition / keyframes 的 transform、opacity，SVG stroke-dashoffset、clipPath，以及 `requestAnimationFrame` 数值缓动。Web Animations API 用于收束有限入场动画；持续动画在暂停时保留位置。

自动演示分别隔离事件、决策和审计的内存状态，演示期间不覆盖原 sessionStorage / localStorage 中的人工审核和归档记录。退出恢复原记录；演示确认明确标为自动样例，不是人工签名。

所有设备参数、压力趋势、智能体回复、风险、评分、置信度、收益与自动流程都来自本地模拟。未连接真实 DCS、LLM 或设备控制系统，不下发设备指令。**SHA-256 是浏览器对本地内容真实计算的摘要**，不是模拟散列，也不构成机构签章或生产审计认证。计算反馈不把尚未核验的数据标为已验证。

## 性能、暂停与清理

粒子限制在孪生区域；管道、叶轮和能源流采用少量 SVG 路径，避免大量模糊滤镜和整台设备旋转。环境监听共享注册；数值 RAF、流程 interval、阶段 timeout、观察器和事件监听均在停止或卸载时清理。

`prefers-reduced-motion: reduce` 关闭粒子、漂移、扫描、装饰旋转和显著位移动画。状态、报警、数据及必要交互继续生效。减少动态模式中的回放仍可推进时间，暂停后进度保持不变。

已完成本机 Chromium 1672×1000 短时采样：五个页面的运行 CSS 动画计数为 2–27，中位帧间隔约 8.3 ms，95 分位约 9.4–16.7 ms，样本中没有超过 50 ms 的帧。未观察到明显卡顿；这不是所有硬件与长时间运行的性能保证。原始结果见 `artifacts/motion-experience/performance.json`。

## 验证状态

`artifacts/motion-experience/validation.json` 已记录 6 组通过的浏览器验收：

1. 自动流程暂停 / 继续、手动接管、重置恢复监测。
2. 单步贯穿告警、三个智能体、方案、明确标记的复核示例及审计，原持久记录不变。
3. 自动演示结束后可播放历史回放；暂停、重置及退出恢复记录有效。
4. 完整约 25 秒自动流程到达审计，无原记录覆盖。
5. 319px 宽度控制条可用，无横向溢出。
6. 减少动态效果下装饰停止，数据、步骤与告警可继续。

该验收记录的 console / page error 列表为空。性能验收同时验证环境动画在原位置暂停 / 继续、已完成入场不会因暂停开关重播。

最终检查：`npm run build`、`npx tsc --noEmit` 通过；`npm run lint` 为 0 错误、6 条已有图片优化提示。原有事件主流程 9 组、跨页边界 4 项通过。补充的 `scripts/verify_motion_edges.py` 验证导航高亮、手动计时器接管、绿色标签进入演示及已批准方案 C 的恢复；`scripts/verify_demo_audit_scope.py` 的 6 项检查覆盖归档 / 校验期间开始、重置、退出演示及正常归档正对照，均通过。后者记录位于 `artifacts/event-experience/demo-audit-scope-validation.json`。

## 30 秒现场脚本

| 时间 | 操作与讲解 |
| --- | --- |
| 0–5 秒 | 点击「演示一次完整事故流程」。“先看机组正常运行，P-201 压力开始下降，随后形成关联告警。” |
| 5–13 秒 | 自动进入智能体工作台。“安全、绿色、设备三个智能体分别核查，分析阶段和证据流都可见。” |
| 13–20 秒 | 自动汇聚并进入决策中心。“系统形成中低风险判断，比较三个方案，推荐兼顾安全和收益的方案 B。” |
| 21–25 秒 | 保持播放。“这里展示复核步骤示例，明确不等于人工签名。随后进入可追溯审计。” |
| 25–30 秒 | 点击「事件回放」，选择 T+60 或 T+120。“每个判断可以追到来源，也可以沿历史时间轴复现；退出演示即可恢复原记录。” |

若要现场调整权重、展开证据或填写自己的确认意见，在相应页面直接操作即可自动暂停；讲解结束点击「继续演示」，或「退出演示」回到正常交互。
