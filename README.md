# 核衡智枢 · 核能协同智能决策 Demo

深蓝科技风的交互式演示，展示从机组监测、异常识别、智能体协同分析到方案比较、人工复核与证据审计的完整流程。

## 页面与功能

- **运行总览**：机组数字孪生、运行指标、专业智能体和决策时间线。
- **实时机组**：设备详情、动态趋势、主泵异常和关联告警。
- **智能体工作台**：安全分析、绿色增效、新能源协同、证据联动对话。
- **决策中心**：A/B/C 方案比较、权重调整、人工复核和记录保留。
- **仿真实验室**：前端热工水力场景、工艺流程、操作控件和趋势演示。
- **证据与审计**：证据链、实际 SHA-256 摘要、记录导出、归档和事件回放。

设备、管道、数值、曲线、智能体与审计节点支持动效；顶部提供约 **25 秒完整事故演示**，可暂停、单步、重置和退出。退出演示恢复原有审核记录。

## 本地运行

需要 Node.js **22.13 或以上**及 npm。

```sh
git clone https://github.com/Crystalxy123/nuclear-intelligent-copilot.git
cd nuclear-intelligent-copilot
npm ci
npm run dev -- --host 127.0.0.1 --port 3000
```

在浏览器打开 <http://localhost:3000/>。

```sh
# 检查与构建
npm run lint
npx tsc --noEmit
npm run build

# 构建后启动
npm run start
```

开发与构建依赖已锁定在 `package-lock.json`。页面素材包含在 `public/`，运行无需额外下载本地素材库或安装 PCTRAN 桌面软件。

## 操作说明

- [完整事故流程与动画操作指南](ANIMATION_GUIDE.md)
- [Event-021 手动交互演示指南](DEMO_GUIDE.md)

浏览器验收脚本位于 `scripts/`；先启动开发服务，再安装 Python Playwright 及 Chromium，即可按需运行脚本：

```sh
python3 -m pip install playwright
python3 -m playwright install chromium
python3 scripts/verify_motion_experience.py
python3 scripts/verify_event_flow.py
```

脚本会在独立浏览器上下文中验证交互，并在本地 `artifacts/` 生成结果，该目录不纳入版本控制。

## 技术结构

React 19、TypeScript、Vinext / Vite、CSS / SVG 动画，使用浏览器本地存储保存演示记录。

| 目录 | 内容 |
| --- | --- |
| `app/` | 页面入口与样式 |
| `components/` | 页面、图表、设备、智能体和演示控件 |
| `lib/` | 场景模型、共享状态、决策记录和审计逻辑 |
| `public/` | 页面图片与动画素材 |
| `scripts/` | 浏览器交互验收脚本 |
| `worker/`、`build/`、`.openai/hosting.json` | 当前运行及构建配置 |

## 演示数据说明

设备参数、风险判断、智能体回复、评分和收益均为本地演示数据，未连接真实电厂、LLM 或设备控制系统。人工确认只保存本地复核记录，不下发设备指令。SHA-256 由浏览器对本地内容实际计算，用于演示内容一致性校验，不代表生产审计认证。

仓库不包含本机依赖、构建缓存、验收截图、原始素材库及独立 PCTRAN 安装包。
