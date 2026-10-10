# 核衡智枢 · Event-021 交互演示说明

本轮在现有深蓝科技风界面中串联同一个异常事件。导航保留运行总览、实时机组、智能体工作台、决策中心、仿真实验室、证据与审计六项；事件回放放在证据与审计内部，系统设置与独立回放页不恢复。

最新页面动效、一键 25 秒演示、暂停与重置说明见 [动画演示指南](./ANIMATION_GUIDE.md)。

## 运行

当前开发地址：http://localhost:3000/ 。在本项目目录执行 `npm run dev -- --host 0.0.0.0 --port 3000` 可启动开发服务。需要 Node.js 22.13 或以上，依赖已安装。若服务已经启动，直接打开地址即可。

生产构建：`npm run build`；构建后预览：`npm run start`。

## 从头演示：17 步

首次打开即可从监测状态开始。浏览器保存本地审核记录；重复完整演示可使用顶部「演示一次完整事故流程」，该模式退出后恢复原记录。如需重新测试手动首次流程，可用新的无痕窗口打开地址。

1. 在左侧打开「实时机组」。
2. 点击数字孪生中的「主泵 P-201」，右侧打开设备详情。
3. 点击「模拟 P-201 异常」。
4. 关闭详情，查看 Event-021 异常提示：180 秒内下降 4.3%，顶部报警从 1 变为 2。点击 A317 可定位曲线报警点；支持 1h、6h、24h、悬停和键盘查看。
5. 点击「启动协同分析」，进入智能体工作台。
6. 等待约 3 秒，三方依次给出安全、绿色增效、设备判断，汇合为中低风险。
7. 点击快捷问题「为什么是中低风险？」；回答里的 P-201、4.3%、OP-12 §4.3 均可打开对应证据。
8. 在中间综合结论区域点击「生成方案 · 进入决策中心」。如区域较矮，可在中间面板内向下滚动。
9. 点击方案 A、B、C，比较选中态与预期结果。
10. 调整安全、经济、设备寿命、绿色效益四项权重。权重自动归一化，推荐方案实时变化，但不会覆盖人工选择。可将安全调至 100，其余调至 0，观察推荐变为 C，再恢复默认 40 / 25 / 20 / 15。
11. 点击「为什么推荐？」查看四条理由。
12. 点击理由或证据项，展开五类证据；查看来源、时间、版本、可信度、SHA-256 与判断作用。关闭抽屉后保留原选择。
13. 人工选择方案 B「调整策略并安排核查」。
14. 点击「确认决策」，勾选「已查看关键证据」「已核对安全约束」，填写至少 8 字的确认理由，再点击「确认并执行（演示）」。例如：已核对压力趋势及安全约束，同意方案 B 并安排设备核查。
15. 当前 DC-2026-00821 修订保存结构化审核记录，记录理由、权重、推荐方案和置信度。
16. 自动进入「证据与审计」。点击八个时间线节点更新下方内容；证据关联图支持路径高亮、图/列表切换与节点详情。可下载记录、导出报告、保存归档副本并核对摘要。
17. 点击该页右上方「事件回放」，拖动 T+00～T+180 时间轴，同步查看压力、A317、风险、智能体状态和方案；可播放、暂停及切换 1× / 2× / 5×。回放不覆盖当前人工审核记录。

## 另外两个演示入口

- 智能体工作台 → 绿色增效智能体：点击曲线 14:00–18:00 高亮区间或窗口按钮。方案 B 的收益随窗口切换为辅机能耗 −3.4%、新能源消纳 +18 MWh、综合收益 +4.8 万/日、减排 9.6 tCO₂e；可以加入决策卡。
- 仿真实验室：选择「小破口失水事故」，系统图淡出后依次点亮新工况线路并启动演算；观察泄漏、压力/稳压器液位、HPSI 和事件序列。支持暂停、重置与倍速。

## 简洁现场操作脚本

“我们从实时机组发现 P-201 异常：180 秒压力下降 4.3%。三个智能体分别核查安全、收益和设备状态，汇合为中低风险。每条判断都能展开证据。现在调整权重比较三个方案，由值长选择方案 B、核对证据并填写理由。确认后，整条链路进入审计，最后拖动回放时间轴复现事件全过程。”

## 组件与共享状态

Event Context 位于 `lib/demo-event.ts`，使用 React `useSyncExternalStore`，无新增状态管理或动画依赖。事件阶段与权重存于 sessionStorage；人工决策及审计沿用现有 localStorage 记录。动画使用 CSS、SVG 与数值 RAF，支持系统减少动态效果和页面动效开关；自动演示采用独立内存副本，退出后恢复原记录。

新增组件：

| 文件 | 用途 |
| --- | --- |
| `components/EventContextBar.tsx` | 跨页保留事件、设备、风险、推荐与修订状态 |
| `components/EquipmentDrawer.tsx` | 五类设备详情及异常触发 |
| `components/AgentProgress.tsx` | 三个智能体的分阶段结果 |
| `components/EvidenceDrawer.tsx` | 共享证据、摘要验证、下载 |
| `components/HumanReviewDialog.tsx` | 双勾选与确认理由校验 |
| `components/EventDrawer.tsx` | 审计节点与回放详情容器 |
| `components/EventTimeline.tsx` | 六个历史节点 |
| `components/ReplayController.tsx` | 历史播放、暂停、倍速与时间拖动 |

继续复用现有 DecisionCenter 决策卡、证据审计模型、图表及仿真引擎，没有另造整套组件库。

修改文件：

- 页面与样式入口：`app/page.tsx`、`app/layout.tsx`。
- 各工作空间：`components/OverviewDashboard.tsx`、`RealtimeUnits.tsx`、`CommandCenter.tsx`、`DecisionCenter.tsx`、`EvidenceAudit.tsx`、`GreenWorkspace.tsx`、`EnergyWorkspace.tsx`、`PctranSimulator.tsx`。
- 图表/仿真图：`components/UnitTrendChart.tsx`、`GreenDispatchChart.tsx`、`SimulationMimic.tsx`。
- 数据：`lib/unit-demo.ts`、`lib/decision-card.ts`、`lib/green-plans.ts`；新增 `lib/demo-event.ts`。
- 样式：修改 `app/unit-trend-chart.css`；新增 `app/event-experience.css`、`realtime-event.css`、`workbench-interaction.css`、`decision-interaction.css`、`evidence-drawer.css`。
- 验收：`scripts/verify_event_flow.py`，结果在 `artifacts/`。

## 数据边界

设备参数、场景风险、智能体回复、相似度、置信度、评分及收益均为本地前端演示数据。压力基线 4.50 MPa、下降后约 4.31 MPa，与独立的一回路压力参数区分。对话使用结构化预设回答，没有连接真实 LLM、DCS 或设备控制接口；未修改后端接口契约。

SHA-256 由浏览器对本地证据实际计算，归档可校验摘要；这不是第三方数字签名或生产审计认证。人工确认保存本地复核记录，页面明确显示“执行待验证”，不会下发设备指令。86% 是场景置信度，82% 是历史相似度，均不等于设备故障概率。

## 验证

以下保留交互版验收入口；动画增强版的最终项目检查结果见 [动画演示指南](./ANIMATION_GUIDE.md)。

- TypeScript：`npx tsc --noEmit`。
- Lint：`npm run lint`，0 错误，6 条现有 `<img>` 优化提示。
- 构建：`npm run build`；上一轮交互版已通过，动画增强版以本轮最终检查记录为准。Vinext 的静态路由分类提示不影响已有构建。
- 浏览器全流程：`python3 scripts/verify_event_flow.py`（需 Python Playwright 与 Chromium）。涵盖异常、分析、权重、证据、人工确认、归档、回放、仿真、319px 窄屏与减少动画。
- 跨页边界：`python3 scripts/verify_event_context_edges.py`，验证归档阶段不回退、新修订恢复送审、刷新及新标签恢复已确认的权重，4 项通过。
- 总览状态随事件联动验证通过：`artifacts/event-overview-validation.json`。
- 详细结果：`artifacts/event-experience/validation.json`、`artifacts/event-units-validation.json`、`artifacts/event-workbench-validation.json`、`artifacts/decision-interaction-validation.json`。

此前交互版的 TypeScript、生产构建和浏览器主流程 9 组验收已通过，跨页状态边界 4 项通过；本轮动画版的最终构建、类型、Lint 与回归结果见 [动画演示指南](./ANIMATION_GUIDE.md) 验证状态。Lint 图片提示清单现为 6 条，最终数量以本轮检查为准。319px 窄屏及减少动态模式已重新验证。本轮新增可暂停的克制环境动效，包括局部管道流动、叶轮、小型状态点与扫描；减少动态模式关闭装饰动画。
