# 核能安全—绿色—新能源协同智能决策平台 PRD v1.0

原始素材库位于本地 `素材库/`（不随仓库上传）；页面运行所需素材已整理至 `public/`。

## 1. 产品定义

### 1.1 产品名称

暂定名称：

**Nuclear Intelligent Copilot Platform**
**核能安全—绿色—新能源协同智能决策平台**

核心产品表达：

> **一个平台、三个专业智能体、一个始终由人确认的决策闭环。**

三个智能体分别为：

1. **Safety Copilot｜安全运行智能体**
2. **Green Efficiency Copilot｜绿色增效智能体**
3. **Energy Coordination Copilot｜新能源协同智能体**

平台并不直接替代操纵员、运行人员或安全系统进行自主决策，而是围绕核电运行过程建立：

**状态感知 → 问题理解 → 安全约束 → 多目标优化 → 决策卡 → 人工确认 → 执行反馈 → 证据留存**

的完整闭环。

---

# 2. 产品背景与痛点

现有核电运行辅助系统通常存在三个相互割裂的问题：

### 2.1 安全信息分散

报警、运行参数、规程、设备状态、历史事件以及风险信息分散在不同系统中。

运行人员需要自行完成：

* 参数识别；
* 报警关联；
* 规程查询；
* 风险判断；
* 信息交叉验证。

信息很多，但缺少统一的解释和决策支持。

### 2.2 安全、效率与绿色目标相互割裂

传统系统往往只回答：

> “系统是否安全？”

但实际运行决策还需要同时回答：

* 哪个方案安全性更高？
* 哪个方案设备损耗更小？
* 哪个方案辅机能耗更低？
* 是否存在更合理的检修窗口？
* 是否可以更好地适配风光出力？
* 是否能够减少弃风弃光？
* 对经济性和碳减排有什么影响？

因此需要从“单指标判断”升级到**安全约束下的多目标决策**。

### 2.3 智能系统缺乏责任边界

对于核电领域，系统不能简单输出一个：

> “建议执行方案 A。”

而应该明确：

* 为什么提出这个建议；
* 依据什么数据；
* 使用了什么规程；
* 风险在哪里；
* 哪些信息存在不确定性；
* 是否存在智能体之间的冲突；
* 谁最终确认了该决策。

因此，本平台的关键创新不是“AI自动操作核电站”，而是：

> **建立一个可解释、可追踪、可核查、人在回路的智能决策辅助体系。**

---

# 3. 产品目标

## 3.1 核心目标

平台需要实现四个核心目标：

### G1 状态统一

将核电运行参数、报警、操作记录、设备状态以及外部能源数据统一进入平台。

### G2 专业智能体协作

通过三个专业智能体分别从：

**安全、绿色效率、新能源协同**

三个维度分析同一运行场景。

### G3 决策统一

多个智能体最终不能各自输出三个互相独立的答案，而必须汇总形成：

**Decision Card｜统一决策卡**

### G4 人始终拥有最终决策权

任何涉及运行调整的建议均必须经过人工确认。

系统不得自动绕过人工授权执行操作。

---

# 4. 非目标

当前平台不定位为：

* 核安全级控制系统；
* 反应堆保护系统；
* 自动驾驶式无人核电站控制系统；
* 替代操纵员的自动操作平台；
* 正式核安全审评工具；
* 自动执行高风险操作的软件。

第一阶段产品定位为：

> **运行分析、风险解释、方案比较和决策辅助平台。**

---

# 5. 核心用户

## 5.1 主控室操纵员

关注：

* 当前发生了什么；
* 哪些参数异常；
* 哪些报警需要重点关注；
* 是否需要进入规程；
* 下一步应该核查什么。

---

## 5.2 值长 / 运行负责人

关注：

* 当前风险等级；
* 不同处置方案；
* 安全边界；
* 方案之间的收益和代价；
* 是否批准某项建议。

---

## 5.3 安全与技术人员

关注：

* 风险来源；
* 设备状态；
* 规程依据；
* 历史变化；
* 决策过程是否可追溯。

---

## 5.4 能源与生产管理人员

关注：

* 辅机能耗；
* 运行效率；
* 设备寿命；
* 风光负荷；
* 电网需求；
* 调峰能力；
* 绿色收益。

---

# 6. 产品总体架构

整体逻辑：

```text
                   ┌───────────────────┐
                   │   Web交互平台     │
                   └────────┬──────────┘
                            │
                    ① INPUT 输入层
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
     核运行参数            报警/操作          风光/电网数据
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ↓
                    ② UNDERSTAND 理解
                            ↓
               状态识别 / 异常关联 / 情景匹配
                            ↓
                    ③ CONSTRAINT 约束
                            ↓
              规程 / 风险 / 安全边界 / 权限
                            ↓
                    ④ OPTIMIZE 优化
                            ↓
      ┌────────────────┬────────────────┬────────────────┐
      │ Safety Copilot │ Green Copilot  │ Energy Copilot │
      └────────────────┴────────────────┴────────────────┘
                            ↓
                     多智能体综合
                            ↓
                  ⑤ Decision Card
                            ↓
                    【人工确认】
                     ↙      ↓      ↘
                  批准     修改     拒绝
                    ↓
                  执行/模拟
                    ↓
                 状态重新输入
                    ↓
                  闭环更新
```

---

# 7. 五阶段智能决策流水线

## Stage 1｜输入 Input

平台统一接收：

### 核运行数据

* 功率；
* 温度；
* 压力；
* 流量；
* 水位；
* 泵阀状态；
* 设备状态；
* 控制系统状态。

### 事件信息

* 报警；
* 操作记录；
* 设备异常；
* 维修记录。

### 外部能源数据

* 风电预测；
* 光伏预测；
* 电网负荷；
* 调度需求；
* 峰谷情况。

---

# Stage 2｜理解 Understand

目标：

> 把“数据变化”转化成“发生了什么”。

功能包括：

* 当前运行模式识别；
* 参数趋势分析；
* 异常检测；
* 报警聚类；
* 报警因果关联；
* 情景匹配；
* 历史案例匹配。

输出示例：

> 过去180秒内，A设备出口压力持续下降，同时出现3条相关报警。当前变化模式与“设备效率下降”历史场景相似度为82%。

---

# Stage 3｜约束 Constraint

这一阶段回答：

> **哪些事情不能做？**

主要检查：

### 规程约束

相关运行规程、异常运行规程及操作限制。

### 风险约束

识别当前：

* 风险来源；
* 风险等级；
* 影响设备；
* 潜在后果。

### 安全边界

判断建议是否触及：

* 功率边界；
* 温度边界；
* 压力边界；
* 设备运行限制；
* 操作授权边界。

任何候选方案如果违反安全约束：

> **直接禁止进入推荐方案。**

---

# Stage 4｜优化 Optimize

系统比较多个候选方案。

评价维度包括：

| 指标          | 内容     |
| ----------- | ------ |
| Safety      | 安全风险   |
| Reliability | 设备可靠性  |
| Efficiency  | 运行效率   |
| Lifetime    | 设备寿命   |
| Green       | 绿色效益   |
| Economy     | 经济性    |
| Grid        | 电网协同价值 |
| Uncertainty | 方案不确定性 |

系统不简单寻找“综合得分最高”的方案，而是首先：

> **满足安全约束**

然后才进行：

> **效率—寿命—绿色—经济性的多目标比较。**

---

# Stage 5｜输出 Output

最终结果统一生成：

# Decision Card

Decision Card 不是一个简单回答，而是一份结构化决策对象。

---

# 8. 三个专业智能体

# 8.1 Safety Copilot｜安全运行智能体

视觉颜色：

**Cyan / Electric Blue**

图标：

**Shield + Check**

核心问题：

> **现在安全吗？发生了什么？应该核查什么？**

### 输入

* 实时运行参数；
* 报警；
* 操作记录；
* 设备状态；
* 运行规程；
* 风险模型；
* 历史事件。

### 核心能力

#### ① 状态识别

识别：

* 正常；
* 偏离；
* 异常；
* 风险上升；
* 未知状态。

#### ② 异常演化趋势

显示：

```text
NORMAL → DEVIATION → WARNING → RISK
```

而不是仅仅输出一个报警。

#### ③ 报警关联

将几十条报警聚合为：

> 3个可能的事件链。

#### ④ 规程匹配

显示：

> 推荐核查规程 XX-XX 第 X 节。

#### ⑤ 风险解释

回答：

* 风险是什么；
* 来源是什么；
* 哪些参数支持该判断；
* 是否存在不确定性。

### 输出

Safety Copilot Card：

```text
安全状态
中风险

主要异常
设备A效率下降趋势

关键证据
压力下降
流量波动
报警A17

风险来源
设备退化 / 工况变化

建议核查
设备A状态
相关运行规程
```

---

# 8.2 Green Efficiency Copilot｜绿色增效智能体

视觉颜色：

**Purple / Magenta**

图标：

**Leaf + Circular Arrow**

核心问题：

> **在安全前提下，怎样运行得更高效？**

### 输入

* 设备状态；
* 当前功率；
* 辅机功率；
* 非计划停机信息；
* 检修计划；
* 设备健康度；
* 能耗数据。

### 核心功能

#### ① 辅机能耗分析

识别：

* 异常能耗；
* 低效率设备；
* 潜在节能空间。

#### ② 非计划停机影响评估

预测：

* 潜在停机风险；
* 运行损失；
* 维修窗口。

#### ③ 安全—效率—寿命权衡

例如：

```text
方案 A
安全 ★★★★★
效率 ★★★
寿命 ★★★★★

方案 B
安全 ★★★★★
效率 ★★★★★
寿命 ★★★
```

#### ④ 绿色价值量化

输出：

* 节电量；
* 辅机能耗变化；
* 碳减排估计；
* 潜在经济收益。

---

# 8.3 Energy Coordination Copilot｜新能源协同智能体

视觉颜色：

**Lime Green / Cyan**

图标：

**Wind Turbine + Solar + Grid**

核心问题：

> **核能如何与风光和电网需求进行更好的协同？**

### 输入

* 风电预测；
* 光伏预测；
* 电网负荷；
* 峰谷负荷；
* 当前机组运行状态；
* 安全约束；
* 调度条件。

### 核心功能

#### ① 新能源预测接入

显示未来：

* 1h；
* 6h；
* 24h。

风光出力变化。

#### ② 电网需求匹配

识别：

```text
新能源高出力
+
电网低负荷
=
潜在消纳压力
```

#### ③ 协同建议

在满足核安全和运行约束下提出：

* 运行策略建议；
* 辅机优化；
* 储能协同；
* 调峰建议；
* 维护窗口建议。

#### ④ 绿色贡献计算

显示：

* 新能源消纳；
* 峰谷改善；
* 减碳贡献；
* 系统效率变化。

---

# 9. 多智能体协作机制

三个智能体不是三个独立聊天框。

系统采用：

# Shared Context｜共享运行上下文

三个智能体读取同一份：

**Plant State Object**

例如：

```json
{
  "plant_mode": "normal_operation",
  "power": 95,
  "risk_level": "medium",
  "active_alarms": 6,
  "equipment_health": {},
  "renewable_forecast": {},
  "grid_demand": {},
  "uncertainty": {}
}
```

---

Safety Copilot 首先确定安全边界。

Green Efficiency Copilot 和 Energy Coordination Copilot：

> **只能在 Safety Copilot 确认的安全空间内优化。**

即：

```text
Safety Constraint
       ↓
Feasible Solution Space
       ↓
Green Optimization
       +
Energy Coordination
       ↓
Decision Options
```

---

# 10. Safety Veto｜安全否决机制

平台需要设计一个明确的：

# SAFETY VETO

当出现以下情况：

* 安全状态未知；
* 风险超过阈值；
* 数据质量不足；
* 关键参数缺失；
* 智能体结论冲突严重；
* 推荐操作触及安全边界；
* 系统模型置信度过低；

平台停止自动推荐执行方案。

页面显示：

> ⚠ 当前条件不足以形成可靠决策建议
> 建议转人工处置。

---

# 11. Decision Card｜统一决策卡

三个智能体最终不直接控制设备。

所有分析汇总形成：

# Decision Card

---

## 11.1 基本信息

```text
Decision ID
DC-2026-00821

时间
14:32:18

状态
WAITING FOR HUMAN REVIEW
```

---

## 11.2 What happened?

### 发生了什么

显示：

* 当前状态；
* 异常事件；
* 关键参数；
* 时间演化。

---

## 11.3 Evidence

### 证据

每条判断必须能够查看来源。

例如：

```text
Evidence #01
Pressure P101 ↓ 4.3%

Evidence #02
Alarm A317 triggered

Evidence #03
Procedure OP-12 §4.3

Evidence #04
Historical Event #021
```

点击可展开来源。

---

## 11.4 Where is the risk?

显示：

**Risk Level**

```text
LOW
MEDIUM
HIGH
CRITICAL
```

并解释：

* 风险来源；
* 影响范围；
* 不确定性。

---

## 11.5 What can we do?

系统提供最多三个候选方案。

例如：

### OPTION A

继续运行并加强监测。

### OPTION B

调整运行策略并安排设备核查。

### OPTION C

进入保守运行模式。

---

## 11.6 Option Comparison

使用雷达图或横向指标。

```text
             A      B      C

Safety      95     98     100

Efficiency  82     91      68

Lifetime    80     90      97

Green       77     92      63
```

---

## 11.7 Expected Value

显示：

### 安全

风险变化：

```text
Medium → Low
```

### 效率

预计辅机能耗：

```text
-3.4%
```

### 绿色价值

新能源消纳：

```text
+18 MWh
```

### 经济价值

预计收益：

```text
+ ¥ XX
```

---

# 12. Human-in-the-Loop｜人工确认机制

页面底部固定显示：

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━

AI Recommendation

OPTION B

Confidence 86%

━━━━━━━━━━━━━━━━━━━━━━━━━━

[ Reject ]

[ Modify ]

[ Confirm Decision ]

━━━━━━━━━━━━━━━━━━━━━━━━━━
```

系统不得自动点击：

**Confirm Decision**

---

## 人工确认后

记录：

```text
Reviewer
Operator A

Decision
OPTION B

Timestamp
14:35:21

Comment
Confirmed after checking equipment status.
```

---

# 13. Decision State Machine

每一个 Decision Card 都必须经历明确状态：

```text
DRAFT
  ↓
ANALYZING
  ↓
READY_FOR_REVIEW
  ↓
WAITING_FOR_HUMAN
  ↓
 ┌─────────┬─────────┐
 ↓         ↓         ↓
APPROVED  REJECTED  REVISION
 ↓
EXECUTING
 ↓
VERIFYING
 ↓
CLOSED
 ↓
ARCHIVED
```

任何 Decision Card 不允许：

```text
READY_FOR_REVIEW
        ↓
    EXECUTING
```

必须经过：

```text
WAITING_FOR_HUMAN
```

---

# 14. Web 信息架构

建议整个网页采用：

# Control Center

而不是传统聊天机器人网页。

主导航：

```text
Overview

Live Plant

Copilots

Decision Center

Simulation

Evidence

Replay

Settings
```

---

# 15. 页面一：首页 / Operations Cockpit

这是整个产品最重要的一页。

建议采用：

# 20% + 50% + 30%

三栏布局。

```text
┌─────────────────────────────────────────────────────────┐
│ LOGO   Plant 01       NORMAL       14:32       USER     │
├──────────────┬────────────────────────────┬─────────────┤
│              │                            │             │
│ PLANT        │      DIGITAL TWIN          │  COPILOTS   │
│ STATUS       │                            │             │
│              │     Reactor / System       │ Safety      │
│ Power        │       Visualization        │ ● Active    │
│ 95%          │                            │             │
│              │                            │ Green       │
│ Risk         │                            │ ● Active    │
│ LOW          │                            │             │
│              │                            │ Energy      │
│ Alarms 03    │                            │ ● Active    │
│              │                            │             │
├──────────────┴────────────────────────────┴─────────────┤
│  Decision Timeline                                     │
│  ● Event → Analysis → Constraints → Options → Human    │
└─────────────────────────────────────────────────────────┘
```

---

# 16. 中央 Digital Twin 区域

参考 PCTRAN / 核电仿真器的系统结构，但视觉上不直接复刻传统工业软件界面。

应该升级为：

> **Web Digital Twin**

中央显示：

* 反应堆；
* 蒸汽发生器；
* 泵；
* 阀门；
* 管路；
* 发电机；
* 电网。

正常状态：

**Cyan Flow**

警告：

**Amber**

风险：

**Red**

用户点击某个设备后右侧展开：

```text
Equipment A

Status
Warning

Pressure
15.2 MPa

Trend
↓ 2.8%

Related Alarms
3

Related Decisions
DC-0812
```

---

# 17. 页面二｜Copilot Workspace

页面顶部：

```text
Safety Copilot

Green Efficiency Copilot

Energy Coordination Copilot
```

三个 Tab。

---

## Safety 页面

左侧：

### Situation

当前状态。

中央：

### Evidence Graph

异常 → 报警 → 设备 → 规程 → 风险。

右侧：

### Risk Explanation

---

## Green Efficiency 页面

核心区域：

### OPTION COMPARISON

横轴：

方案 A / B / C。

纵轴：

* Safety；
* Efficiency；
* Lifetime；
* Green；
* Economy。

---

## Energy Coordination 页面

中央展示：

### 24H ENERGY FORECAST

```text
Load
────────

Solar
     /\

Wind
  ~~~~~~~

Nuclear
────────
```

下面显示：

### Coordination Opportunity

```text
13:00 – 16:00

Renewable surplus expected

Potential coordination window
```

---

# 18. 页面三｜Decision Center

Decision Center 是整个平台最具有辨识度的页面。

布局建议：

```text
┌────────────────────────────────────────────────────────┐
│ DECISION CENTER                                        │
├───────────────────────────────────┬────────────────────┤
│                                   │                    │
│       DECISION CARD               │ EVIDENCE           │
│                                   │                    │
│ What happened                     │ Source 01          │
│                                   │ Source 02          │
│ Risk                              │ Procedure          │
│                                   │ Model              │
│ Options A / B / C                 │ History            │
│                                   │                    │
│ Expected Value                    │                    │
├───────────────────────────────────┴────────────────────┤
│                                                       │
│ REJECT        MODIFY             CONFIRM DECISION     │
└────────────────────────────────────────────────────────┘
```

---

# 19. 页面四｜Simulation Lab

将用户上传材料中的：

**PC-based Nuclear Power Plant Simulator**

概念升级为：

# Simulation Lab

用户可以选择：

```text
Scenario 01
Normal Operation

Scenario 02
Pump Degradation

Scenario 03
Abnormal Temperature

Scenario 04
Grid Load Change

Scenario 05
Renewable Surge
```

点击：

**RUN SCENARIO**

启动仿真。

---

## 时间控制

```text
◀

▶ Play

Ⅱ Pause

2×

5×

10×

Reset
```

---

## Event Injection

用于演示：

```text
Inject Event

□ Pump Failure

□ Sensor Drift

□ Alarm Burst

□ Renewable Surge

□ Grid Load Drop
```

---

# 20. 页面五｜Evidence & Audit

系统所有 AI 输出都必须可追踪。

每次决策生成：

# Evidence Chain

```text
DATA
 ↓
EVENT
 ↓
AI ANALYSIS
 ↓
PROCEDURE
 ↓
RISK
 ↓
OPTION
 ↓
HUMAN DECISION
 ↓
RESULT
```

每个节点可以点击。

---

# 21. 页面六｜Replay

支持整个事件全过程回放。

类似视频时间轴：

```text
14:21

Parameter drift

↓

14:23

Alarm generated

↓

14:24

Safety Copilot analysis

↓

14:26

Green Copilot analysis

↓

14:28

Decision Card generated

↓

14:30

Human approved Option B

↓

14:36

Plant state stabilized
```

可用于：

* 操纵员培训；
* 事故复盘；
* 工程分析；
* 风险评价。

---

# 22. 首页顶部关键指标

建议只展示5个核心 KPI：

### Reactor Power

`95.3%`

### Safety Status

`NORMAL`

### Active Risk

`LOW`

### Active Alarms

`03`

### AI Decisions

`01 Waiting`

其中：

**01 Waiting**

使用高亮动画提醒人工确认。

---

# 23. 全局 Agent 状态

三个智能体顶部始终显示状态。

```text
● Safety
Analyzing

● Green
Ready

● Energy
Ready
```

状态包括：

```text
IDLE

OBSERVING

ANALYZING

WAITING

CONFLICT

READY

BLOCKED
```

---

# 24. Agent Conflict 机制

如果三个智能体出现意见冲突：

例如：

```text
Safety Copilot
Recommend A

Green Copilot
Recommend B

Energy Copilot
Recommend B
```

系统不得简单采用多数投票。

页面显示：

# CONFLICT DETECTED

同时解释：

```text
Safety concern

Option B increases equipment stress.

Green benefit

Option B reduces auxiliary power consumption.

Energy benefit

Option B improves renewable integration.
```

最终交由人工判断。

---

# 25. 对话功能

平台可以保留 Copilot Chat，但聊天框不是主界面。

右侧提供：

```text
Ask Copilot
```

用户可以输入：

> 为什么风险等级是 Medium？

系统回答：

> 风险主要来自设备A压力下降趋势及报警A17。当前变化仍处于运行边界内，但模型显示持续下降概率较高，因此风险暂定为Medium。

下面必须有：

```text
Evidence

[Parameter P101]

[Alarm A17]

[Procedure OP-12]
```

---

# 26. 数据接入设计

平台数据统一转化成：

# Plant State Object

建议字段：

```text
timestamp

plant_mode

power

temperature

pressure

flow

equipment_status

alarms

operator_actions

risk_state

renewable_forecast

grid_demand

maintenance_state
```

第一阶段可以通过：

* JSON；
* CSV；
* API；
* 仿真数据；

进行接入。

---

# 27. 仿真器接入层

建议不要让前端直接依赖某一种核电仿真软件。

建立：

# Simulator Adapter

架构：

```text
PCTRAN / Simulator
        ↓
Simulator Adapter
        ↓
Normalized Plant Data
        ↓
Web Platform
```

这样未来可以接入其他仿真平台。

---

# 28. 知识库

建议建立五类知识库。

### KB01 运行规程库

SOP / AOP / EOP 等。

### KB02 设备知识库

设备：

* 功能；
* 参数；
* 限值；
* 故障模式。

### KB03 报警知识库

报警：

```text
Alarm
→ Equipment
→ Cause
→ Consequence
→ Procedure
```

### KB04 风险知识库

风险模型及风险关系。

### KB05 Green & Energy Knowledge

包括：

* 能耗；
* 碳排；
* 风光预测；
* 电网需求；
* 调峰策略。

---

# 29. 证据引用机制

AI输出中关键判断后显示：

```text
[1]

[2]

[3]
```

点击：

`[2]`

弹出：

```text
Source

Operation Procedure OP-12

Section

4.3 Equipment Degradation

Version

2026.01

Relevant Content
...
```

---

# 30. 权限体系

至少设计三类权限。

## Viewer

只能查看。

## Analyst

可以：

* 运行分析；
* 创建方案；
* 运行仿真。

## Decision Maker

可以：

* Confirm；
* Reject；
* Modify Decision。

系统记录每一次授权。

---

# 31. 首页视觉体系

基于现有三智能体设计继续发展。

背景：

**Dark Teal / Nuclear Control Room Dark**

建议视觉 Token：

```text
Background
#002F31

Panel
#073C3E

Border
#15747A

Primary Cyan
#38E8F5

Safety Blue
#35DDF5

Green Purple
#B95EFF

Energy Lime
#A9F04D

Text Primary
#ECFFFF

Text Secondary
#A9CFD0
```

---

# 32. UI设计关键词

整体风格建议：

> **Scientific + Industrial + Futuristic + Trustworthy**

而不是：

> Cyberpunk / Hacker / Sci-Fi Game

设计原则：

* 暗色；
* 高信息密度；
* 清晰层级；
* 极少装饰；
* 轻微发光；
* 边框明确；
* 数据优先；
* 风险信息优先；
* 可解释性优先。

---

# 33. 核心组件库

前端至少建立以下组件：

```text
PlantStatusCard

MetricCard

RiskBadge

AlarmItem

AgentCard

AgentStatus

EvidenceTag

ProcedureReference

OptionCard

ComparisonChart

DecisionCard

ApprovalBar

Timeline

TrendChart

DigitalTwinNode

EnergyForecastChart

AuditNode
```

---

# 34. 最重要的 UI 元件：Approval Bar

建议固定在 Decision Center 底部。

```text
┌────────────────────────────────────────────────┐
│ AI RECOMMENDATION                              │
│                                                │
│ OPTION B              Confidence 86%           │
│                                                │
│ [Reject]       [Modify]       [Confirm]        │
│                                                │
│              Human approval required           │
└────────────────────────────────────────────────┘
```

这句话：

# Human approval required

应该成为整个平台最重要的视觉符号之一。

---

# 35. 首页推荐最终布局

```text
┌──────────────────────────────────────────────────────────────┐
│ NUCLEAR COPILOT    Unit 01 ●ONLINE    14:32    Operator A   │
├──────────────┬───────────────────────────────┬───────────────┤
│ PLANT STATE  │                               │ COPILOTS      │
│              │                               │               │
│ NORMAL       │       DIGITAL TWIN            │ 🛡 SAFETY     │
│              │                               │ ANALYZING     │
│ Power        │                               │               │
│ 95.3%        │                               │ ♻ GREEN      │
│              │                               │ READY         │
│ Risk         │                               │               │
│ LOW          │                               │ ⚡ ENERGY     │
│              │                               │ READY         │
│ Alarm 03     │                               │               │
├──────────────┴───────────────────────────────┴───────────────┤
│ EVENT TIMELINE                                               │
├──────────────────────────────────────────────────────────────┤
│ ⚠ Decision DC-0812 waiting for human confirmation           │
│                                             [Review Decision]│
└──────────────────────────────────────────────────────────────┘
```

---

# 36. MVP功能范围

第一版重点不是连接真实核电站，而是完整跑通故事。

## P0

必须实现：

* Web Dashboard；
* Plant Status；
* 仿真场景加载；
* 三智能体页面；
* 五阶段分析流程；
* Decision Card；
* Safety Veto；
* Human Confirmation；
* Event Timeline；
* Evidence展示；
* 状态更新；
* 决策历史记录。

---

## P1

第二阶段：

* 知识库检索；
* 智能体对话；
* 方案自动生成；
* 多智能体冲突检测；
* PDF分析报告导出；
* 24h新能源预测；
* 碳减排计算。

---

## P2

后续：

* 实时仿真器接入；
* 多用户协同；
* 权限体系；
* 操作员培训模式；
* 自动生成复盘报告；
* Digital Twin；
* 实际运行数据库接入。

---

# 37. MVP 推荐技术路线

前端建议：

```text
React / Next.js

Tailwind CSS

ECharts / Recharts

Framer Motion
```

核心架构：

```text
Frontend
     ↓
API Layer
     ↓
Decision Orchestrator
 ↓       ↓       ↓
Safety Green Energy
     ↓
Decision Engine
     ↓
Evidence Store
```

智能体第一版不必依赖复杂实时模型。

可以采用：

```text
Scenario JSON
+
Rule Engine
+
Preset Agent Output
+
Optional AI
```

先完整实现产品体验，再逐步替换底层能力。

---

# 38. Demo 数据结构

建议每一个演示场景一个 JSON。

例如：

```json
{
  "scenario_id": "SC-003",
  "name": "Equipment Efficiency Degradation",
  "initial_state": {},
  "events": [],
  "alarms": [],
  "renewable_forecast": [],
  "grid_load": [],
  "expected_agent_outputs": {},
  "decision_options": [],
  "recommended_option": "B"
}
```

---

# 39. 推荐重点 Demo

建议设计一个能够同时激活三个智能体的场景。

# Scenario：设备效率下降 + 风光出力快速增加

### T0

机组正常运行。

```text
Power
95%

Risk
LOW
```

---

### T+20s

设备A效率下降。

Safety Copilot：

> 检测到异常趋势。

---

### T+30s

出现相关报警。

Safety Copilot：

> 风险提升至 Medium。

---

### T+40s

Green Efficiency Copilot：

> 当前异常可能导致辅机能耗上升约4%。

---

### T+50s

Energy Coordination Copilot：

> 未来2小时风光出力预计增加，电网负荷下降。

---

### T+60s

平台生成3个方案。

---

### OPTION A

维持当前运行并加强监测。

---

### OPTION B

调整运行策略并安排设备核查，同时利用新能源高出力窗口优化系统运行。

---

### OPTION C

采取更保守运行方案。

---

平台综合推荐：

# OPTION B

但显示：

> Human Approval Required

---

用户点击：

# Confirm

系统执行模拟。

---

运行状态：

```text
Risk
MEDIUM → LOW

Auxiliary Consumption
-3.2%

Renewable Utilization
+11%

Green Benefit
+XX
```

形成完整的故事闭环。

---

# 40. 演示模式

为了比赛、汇报和产品演示，建议设计：

# DEMO MODE

右上角：

`Start Demo`

自动依次出现：

```text
01 Event detected

02 Safety Copilot activated

03 Green Copilot activated

04 Energy Copilot activated

05 Decision generated

06 Waiting for human

07 Human confirms

08 State improves
```

总时长建议：

**60–90 秒。**

---

# 41. 动效

动效不要过于游戏化。

建议：

### 数据流

淡蓝色光点沿管路流动。

### Agent Working

Agent 图标周围出现轻微 pulse。

### Risk Rising

Risk Badge 从：

```text
LOW → MEDIUM
```

渐变，而不是闪烁。

### Decision Generated

Decision Card 从下方缓慢展开。

### Human Confirm

确认后出现：

```text
Decision Confirmed
```

随后状态重新计算。

---

# 42. Midjourney 素材体系

Midjourney 不负责生成网页文字。

只生成：

* 图标；
* 背景；
* 核电数字孪生；
* 能源流；
* 空状态插画；
* Hero Visual。

网页中的：

* 字体；
* 卡片；
* 图表；
* 按钮；
* 数值；
* Decision Card；

全部由前端真实绘制。

---

# 43. Midjourney统一视觉 Style Prompt

所有素材建议加入：

```text
premium scientific industrial interface illustration,
advanced nuclear energy digital twin aesthetic,
dark deep teal background,
cyan blue luminous technical lines,
subtle neon glow,
clean vector-like geometry,
minimal futuristic control center style,
high precision engineering visualization,
trustworthy and professional,
soft volumetric light,
no cyberpunk clutter,
no humans,
no logos,
no readable text,
no watermark
```

---

# 44. Safety Copilot 图标 Prompt

```text
futuristic safety shield icon with a precise check mark,
representing nuclear operational safety and verified decision making,
electric cyan and blue luminous outlines,
subtle layered technical geometry,
dark deep teal background,
premium scientific industrial UI icon,
minimal symmetrical composition,
clean vector-like appearance,
soft neon edge glow,
high precision,
isolated centered symbol,
no text,
no letters,
no logo,
no watermark
--ar 1:1
```

---

# 45. Green Efficiency Copilot 图标 Prompt

```text
futuristic circular efficiency symbol surrounding an elegant leaf,
representing green efficiency, equipment optimization, energy saving and lifecycle management,
purple magenta and cyan luminous gradient,
dark deep teal background,
premium scientific industrial UI icon,
clean vector-like geometry,
minimal symmetrical design,
subtle neon edge glow,
isolated centered symbol,
no readable text,
no letters,
no watermark
--ar 1:1
```

---

# 46. Energy Coordination Copilot 图标 Prompt

```text
integrated clean energy coordination icon,
wind turbine, solar panel and abstract electrical grid connected into one unified symbol,
cyan and lime green luminous technical lines,
dark deep teal background,
premium advanced energy system interface icon,
minimal vector-like engineering illustration,
balanced geometry,
subtle neon glow,
isolated centered symbol,
no text,
no letters,
no logo,
no watermark
--ar 1:1
```

---

# 47. Digital Twin 核电站主视觉 Prompt

```text
advanced nuclear power plant digital twin visualization,
central nuclear reactor vessel connected to steam generator, turbine, pumps, pipes and electrical grid,
clean engineering system topology,
transparent layered technical structures,
flowing cyan energy lines,
dark deep teal command center background,
high precision scientific visualization,
futuristic but realistic industrial design,
premium digital control center aesthetic,
large empty margins for web interface overlay,
no people,
no labels,
no readable text,
no logo,
no watermark
--ar 16:9
```

---

# 48. Nuclear + Wind + Solar 协同背景 Prompt

```text
integrated low carbon energy system visualization,
nuclear power plant connected with wind turbines, solar arrays, energy storage and electrical grid,
flowing luminous energy network showing coordinated power exchange,
dark teal scientific background,
cyan, electric blue and subtle lime green highlights,
clean advanced engineering visualization,
professional energy control center aesthetic,
minimal futuristic composition,
wide panoramic scene,
no people,
no text,
no logos,
no watermark
--ar 21:9
```

---

# 49. Human-in-the-Loop 素材 Prompt

```text
abstract human in the loop decision system visualization,
three intelligent AI nodes converging into one central decision card,
final decision passing through a clear human approval checkpoint before reaching an industrial system,
circular closed-loop architecture,
cyan blue purple and lime luminous technical lines,
dark deep teal background,
premium scientific infographic aesthetic,
minimal geometry,
clean engineering logic,
no readable text,
no logos,
no watermark
--ar 16:9
```

---

# 50. Decision Intelligence 主视觉 Prompt

```text
advanced AI decision intelligence visualization for nuclear energy operations,
multiple streams of plant sensor data, risk evidence, safety constraints and renewable energy forecasts converging into a transparent central decision object,
three colored intelligence streams: cyan safety, purple efficiency, lime energy coordination,
dark deep teal scientific background,
precise engineering visual language,
minimal futuristic control center style,
subtle volumetric glow,
large clean composition,
no readable text,
no humans,
no logos,
no watermark
--ar 16:9
```

---

# 51. 网页背景纹理 Prompt

```text
minimal dark teal scientific technology background,
extremely subtle engineering grid,
faint nuclear system topology lines,
tiny cyan technical nodes,
low contrast,
premium enterprise software background,
clean elegant industrial aesthetic,
large negative space,
no objects in foreground,
no text,
no logo,
no watermark
--ar 16:9
```

---

# 52. Simulator 空状态插画 Prompt

```text
modern nuclear power plant simulation laboratory visualization,
simplified digital reactor system suspended in a dark scientific interface environment,
subtle cyan wireframe components,
precision industrial engineering aesthetic,
minimal premium enterprise software illustration,
large empty space around the central system,
dark deep teal background,
no people,
no text,
no logos,
no watermark
--ar 16:9
```

---

# 53. 推荐素材清单

建议最终准备以下素材：

```text
01 safety-copilot-icon.png

02 green-copilot-icon.png

03 energy-copilot-icon.png

04 nuclear-digital-twin.png

05 nuclear-renewable-network.png

06 human-in-loop.png

07 decision-intelligence.png

08 dashboard-background.png

09 simulator-empty-state.png
```

不需要为每一个页面生成整张背景。

网站主体仍然应由 CSS + SVG + 图表组件构成。

---

# 54. 产品最核心的视觉逻辑

整个产品需要让用户一眼看懂三个层次：

第一层：

# NOW

**现在发生了什么？**

第二层：

# THINK

**三个智能体分别怎么看？**

第三层：

# DECIDE

**人最终决定做什么。**

因此首页推荐始终保持：

```text
LIVE PLANT
    ↓
COPILOTS
    ↓
DECISION CARD
    ↓
HUMAN CONFIRM
```

---

# 55. 验收标准

MVP完成时应满足：

* [ ] 可以进入统一 Dashboard
* [ ] 可以加载至少3个核电仿真场景
* [ ] 页面展示实时参数变化
* [ ] 可以产生报警事件
* [ ] Safety Copilot 可以响应异常
* [ ] Green Copilot 可以产生效率分析
* [ ] Energy Copilot 可以读取新能源/负荷信息
* [ ] 三智能体可以形成统一 Decision Card
* [ ] Decision Card 至少包含3个候选方案
* [ ] 能够展示风险等级
* [ ] 能够展示证据来源
* [ ] 能够展示方案价值比较
* [ ] 必须人工 Confirm 才能继续
* [ ] 可以 Reject
* [ ] 可以 Modify
* [ ] Confirm 后平台状态发生变化
* [ ] 全过程进入 Timeline
* [ ] 可以查看历史 Decision
* [ ] 可以 Replay 事件过程
* [ ] AI 不允许绕过人工授权执行

---

# 56. 一句话产品介绍

建议最终统一使用：

> **面向核能安全、绿色增效与新能源协同运行的多智能体决策支持平台，通过 Safety、Green Efficiency 与 Energy Coordination 三个专业智能体协同分析运行状态，并将所有建议汇聚为可解释、可追溯的 Decision Card，在人工最终确认后形成闭环决策。**

更适合首页的短版本：

> **Three Copilots. One Decision. Human in Control.**

中文：

> **三个专业智能体，一个统一决策，人始终掌握最终控制权。**
