# Tarot Journal App 用户成长系统 V1.1（数值与范围修订）

> 状态：**PROPOSED — awaiting product owner approval**
> 基线：[USER_PROGRESSION_SYSTEM_V1.md](./USER_PROGRESSION_SYSTEM_V1.md)
> 本文是定向修订，不实施代码、UI 或数据库 migration。

## 1. 修订目标

V1.1 保留 V1 已建立的事件账本、幂等、离线 provisional、删除/编辑一致性、隐私伦理与 Personal/Community 分账，只修正两类风险：

1. 把同一 Reading/Follow-Up 的多个字段奖励合并为用户可理解的“基础完成 + 深度 milestone”。
2. 把等级世界观与实际 V1 交付解耦，避免 Future dependency 成为升级后的空壳承诺。

核心循环仍是：**记录 → 当下观察 → 现实回顾 → 周期总结 → 个人知识积累**。等级只表示记录历程，不表示准确率、灵性或权威。

## 2. 保留的系统架构

- 50 级、七阶段和 V1 公式不变：`cumulativeXP = 200n + 17.5n(n-1)`，Level 50 为 50,960 XP。
- 阶段：初见者（1–4）、倾听者（5–9）、记录者（10–16）、诠释者（17–24）、映照者（25–33）、同行者（34–42）、星辰旅者（43–50）。
- Personal Journey XP 与 Community Reputation Points 完全分离；不参加社区仍可满级。
- append-only ledger、唯一 idempotency key、source 服务端验证、reversal 纠错、配置版本和 grandfathering 不变。
- 正常删除保留 XP；编辑只允许首次达到新 milestone 时补发；删除重建不重复发。
- 离线 XP 为 provisional；云端 verified ledger 为多设备权威。
- 核心单张、三张、自由牌桌、基础记录/Follow-Up/统计、隐私、无障碍、同步/导出不锁定。
- 不设抽牌付费次数、公开全站榜单、streak 清零、Prestige 重生或改变随机性的奖励。

## 3. V1.1 Personal XP 总规则

### 3.1 简化上限

- Personal Journey XP **总上限 200 XP/可信服务端日**，包含 Reading、Follow-Up、Review 和 mission bonus。
- Achievement XP 是低频一次性事件，立即结算且不受每日 200 XP 上限；不再延迟到次日。
- 每日最多 3 条 Reading 获得 Reading package XP；之后仍可正常记录但获得 0 XP。
- Mission bonus 每日最多 20 XP、每周最多 60 XP，且仍受每日总上限 200 XP。
- 同一 normalized question 24 小时内只有第一条 Reading 获 package XP；后续记录不阻止，只温和提示并获得 0 XP。

客户端必须解释未加 XP 的稳定原因，例如“今天已有 3 条记录获得成长值”，而不是只显示无变化。

### 3.2 Reading package：最高 50 XP

| Event Code                             | Milestone        |  XP | 资格                                         | 每 source | 每日     |
| -------------------------------------- | ---------------- | --: | -------------------------------------------- | --------- | -------- |
| `READING_COMPLETED`                    | 有效保存         |  10 | completed；非空真实问题；≥1 有效牌；牌序合法 | 1 次      | 3 条共享 |
| `READING_INITIAL_REFLECTION_ADDED`     | 当下观察         | +10 | 达到语言友好阈值                             | 1 次      | 3 条共享 |
| `READING_OVERALL_INTERPRETATION_ADDED` | 完整总体解读     | +15 | 达到总体解读阈值且非重复                     | 1 次      | 3 条共享 |
| `READING_ALL_CARD_NOTES_ADDED`         | 全部单牌笔记     | +10 | 每张牌均达到单牌笔记阈值                     | 1 次      | 3 条共享 |
| `DAILY_FIRST_VALID_READING`            | 当日首条有效记录 |  +5 | 当日首条可获 XP 的 Reading                   | 每日 1 次 | 1        |

规则：

- 单条完整 Reading 常规最高 **50 XP**；单张、三张、情境和自由牌桌使用同一 package，不按牌数加价。
- `topic_id`、有效问题、Question Template 不再产生持续独立 XP。问题是基础资格；Topic/template 只用于任务、统计或一次性 achievement。
- `SPREAD_GUIDE_FIRST_USED` 可作为每个官方引导模板的一次性 achievement，10 XP，不计入 Reading package。
- 草稿、DrawSession、揭牌、移动牌、重复保存和纯导入历史不发 XP。
- milestone 可在创建时一起结算，也可在后续编辑首次达到资格时补发；之后修改不再发。

### 3.3 Follow-Up package：最高 65 XP

| Event Code                        | Milestone      |  XP | 资格                                 | 每 source |
| --------------------------------- | -------------- | --: | ------------------------------------ | --------- |
| `FOLLOW_UP_COMPLETED`             | 基础现实回顾   |  20 | scheduled→completed 且有合法 outcome | 1 次      |
| `FOLLOW_UP_REFLECTION_ADDED`      | 现实反思       | +20 | 达到 Follow-Up 文本阈值              | 1 次      |
| `FOLLOW_UP_7_DAY_MATURITY`        | 间隔至少 7 天  |  +5 | trusted `reviewedAt-readingAt ≥ 7d`  | 1 次      |
| `FOLLOW_UP_30_DAY_MATURITY`       | 间隔至少 30 天 | +10 | ≥30d；与 7 日奖励可叠加              | 1 次      |
| `FOLLOW_UP_UNDERSTANDING_CHANGED` | 明确理解变化   | +10 | 用户主动勾选且新增有效观察           | 1 次      |

Outcome 不再单独发 5 XP。30 日完整 Follow-Up 最高 **65 XP**，明确高于普通完整 Reading 的 50 XP。`happened`、`partly_happened`、`did_not_happen` 和 `still_unclear` 完全同值，不计算“准确率”。

### 3.4 Review、knowledge、system

| Event Code                                 |  XP | 规则                                        |
| ------------------------------------------ | --: | ------------------------------------------- |
| `WEEKLY_REVIEW_COMPLETED`                  |  40 | completed、周期唯一、summary 达语言阈值     |
| `MONTHLY_REVIEW_COMPLETED`                 |  80 | completed、周期唯一、summary 达语言阈值     |
| `ANNUAL_REVIEW_COMPLETED`                  | 150 | Future dependency；每年一次                 |
| `TAROT_CARD_FIRST_ENCOUNTER`               |   0 | 只计收藏/achievement，避免抽牌收集刷 XP     |
| `PERSONAL_CARD_MEANING_CREATED`            |  20 | Future dependency；每 card+orientation 一次 |
| `PERSONAL_CARD_MEANING_UPDATED`            |   0 | 更新用于知识沉淀，不作为重复 XP 来源        |
| `SUIT_REFLECTION_COMPLETED`                |  30 | Future dependency；每 suit 一次             |
| `DUAL_REVERSAL_NOTES_COMPLETED`            |  25 | Future dependency；每 card 一次             |
| `ONBOARDING_COMPLETED`                     |  30 | 账户一次性                                  |
| profile/privacy/sync/reminder/return login |   0 | 不用 XP 诱导资料、权限或通知                |

## 4. 语言友好的文本资格

V1 不用 AI 判定内容质量，也不判断观点是否正确。先做 Unicode normalization、trim、折叠重复空白、移除 UI placeholder；计算：

```text
effectiveUnits = 2 × CJK字符数 + Latin字母/数字数
```

| 内容                 | 最低规则（满足任一）                         |
| -------------------- | -------------------------------------------- |
| 当下观察             | ≥8 CJK；或 ≥20 Latin；或 effectiveUnits ≥20  |
| 单牌笔记             | ≥6 CJK；或 ≥15 Latin；或 effectiveUnits ≥15  |
| 总体解读             | ≥15 CJK；或 ≥40 Latin；或 effectiveUnits ≥40 |
| Follow-Up reflection | ≥12 CJK；或 ≥30 Latin；或 effectiveUnits ≥30 |
| 周 Review            | ≥20 CJK；或 ≥50 Latin；或 effectiveUnits ≥50 |
| 月 Review            | ≥35 CJK；或 ≥90 Latin；或 effectiveUnits ≥90 |

同时必须：不是纯牌名/标点/重复字符，不等于模板提示，不与同 source 已奖励文本完全相同，normalized hash 不与用户近期奖励内容完全重复。相似但不完全相同只监控，不用语义模型强制拒绝。

## 5. XP 事件与幂等

Reading package 是五个可审计 milestone，而不是一个不可解释的总数；UI 只显示“记录 10 + 深度 35 + 今日首次 5”，不把 Topic 等数据库字段呈现为任务清单。

```text
idempotencyKey = v1.1:{userId}:{eventCode}:{sourceType}:{sourceId}:{milestone}
```

- 客户端只提交 candidate event，不提交 XP 数值。
- 服务端读取 source、按 rule version 计算、在同一事务检查 source milestone、日上限和幂等键。
- profile 是 ledger aggregate 缓存；多设备不能以本地 total 做加法合并。
- 正常删除保留 ledger；作弊用引用原 event 的负数 reversal；管理员纠错也必须写 adjustment event。
- 导入 Reading 为历史事实，0 XP；可计入 Insights 和收藏 achievement，但必须标注 `source=import`。

## 6. 修订后数值模拟

曲线仍为 Level 50 / 50,960 XP。包式奖励降低了“填字段叠加”，采用更保守周均值：Casual 220、Regular 490、Highly Engaged 800 XP；均含 onboarding 30 XP，不含 Community。

| 模型                                       | 7 天     | 30 天       | 90 天        | 180 天       | 365 天       | 满级时间     |
| ------------------------------------------ | -------- | ----------- | ------------ | ------------ | ------------ | ------------ |
| Casual（2–3 日/周，偶尔 Follow-Up）        | 250 / L2 | 973 / L4    | 2,859 / L9   | 5,687 / L14  | 11,501 / L21 | 约 4.45 年   |
| Regular（5 日/周，定期 Follow-Up/Review）  | 520 / L3 | 2,130 / L7  | 6,330 / L15  | 12,630 / L23 | 25,580 / L34 | 约 2.0 年    |
| Highly Engaged（几乎每日、深度记录与回顾） | 830 / L4 | 3,459 / L10 | 10,316 / L20 | 20,601 / L30 | 41,744 / L44 | 约 14.7 个月 |

| 阶段起点      |     XP | Regular 预计 | Highly Engaged 预计 |
| ------------- | -----: | -----------: | ------------------: |
| Lv5 倾听者    |  1,010 |     约 14 天 |             约 9 天 |
| Lv10 记录者   |  3,060 |     约 44 天 |            约 27 天 |
| Lv17 诠释者   |  7,400 |    约 106 天 |            约 65 天 |
| Lv25 映照者   | 14,460 |    约 207 天 |           约 127 天 |
| Lv34 同行者   | 25,080 |    约 358 天 |           约 219 天 |
| Lv43 星辰旅者 | 38,535 |    约 550 天 |           约 337 天 |
| Lv50          | 50,960 |    约 728 天 |           约 446 天 |

验证结论：Follow-Up 单次价值更高；高活跃用户不会数周满级；不参加社区不受罚。上线 8 周后只调整未来 rule version，不追溯扣级。

## 7. V1 Deliverable Reward Table

V1.1 不承诺 50 个独立美术资产。每 5 级为主要奖励节点；其余等级只显示阶段进度、已有 badge/title 或收藏里程碑。表中的所有资产都属于 Phase 1B 明确预算：**2 个新增主题、3 个牌背、2 个 reveal、8 个 title、10 个 badge、3 个 profile decoration**。Moonlight 默认主题不计入新增资产。

|  Lv | V1 可交付奖励                                          | 类型/成本                   |
| --: | ------------------------------------------------------ | --------------------------- |
|   1 | Moonlight 默认体验 + `first_page` 进度                 | existing                    |
|   2 | Badge 1：第一束光                                      | badge                       |
|   3 | Title 1：初次记录                                      | title                       |
|   4 | 阶段进度标记                                           | no new asset                |
|   5 | Theme 1：静谧星空                                      | **major**                   |
|   6 | Badge 2：安静观察                                      | badge                       |
|   7 | Profile 1：月点                                        | decoration                  |
|   8 | Title 2：月下倾听者                                    | title                       |
|   9 | 阶段完成标记                                           | no new asset                |
|  10 | Card Back 1：星点                                      | **major**                   |
|  11 | Badge 3：十页记录                                      | badge                       |
|  12 | 收藏进度样式 1                                         | existing UI style           |
|  13 | Title 3：稳定记录者                                    | title                       |
|  14 | 阶段进度标记                                           | no new asset                |
|  15 | Reveal 1：柔和流光                                     | **major**                   |
|  16 | Badge 4：现实来信                                      | badge                       |
|  17 | Profile 2：月相环                                      | decoration                  |
|  18 | Title 4：多重视角                                      | title                       |
|  19 | 阶段进度标记                                           | no new asset                |
|  20 | Theme 2：古典书房                                      | **major**                   |
|  21 | Badge 5：周期回望                                      | badge                       |
|  22 | Card Back 2：二十二道门                                | card back                   |
|  23 | Title 5：映照者                                        | title                       |
|  24 | 阶段完成标记                                           | no new asset                |
|  25 | Profile 3：四花色框                                    | **major**                   |
|  26 | Badge 6：四种声音                                      | badge                       |
|  27 | 收藏进度样式 2                                         | existing UI style           |
|  28 | Title 6：长期同行者                                    | title                       |
|  29 | 阶段进度标记                                           | no new asset                |
|  30 | Card Back 3：留白星图                                  | **major**                   |
|  31 | Badge 7：五十页记录                                    | badge                       |
|  32 | 徽章展示槽扩展（数据槽，不新增美术）                   | UI configuration            |
|  33 | 阶段完成标记                                           | no new asset                |
|  34 | Title 7：历史整理者                                    | title                       |
|  35 | Reveal 2：月光揭示                                     | **major**                   |
|  36 | Badge 8：十次回望                                      | badge                       |
|  37 | 收藏进度样式 3                                         | existing UI style           |
|  38 | 阶段进度标记                                           | no new asset                |
|  39 | Title 展示槽扩展（不新增称号）                         | UI configuration            |
|  40 | Moonlight 完整配色组合预设                             | **major**, token preset     |
|  41 | Badge 9：长期线索                                      | badge                       |
|  42 | 阶段完成标记                                           | no new asset                |
|  43 | Title 8：星辰旅者                                      | title                       |
|  44 | 个人收藏封面预设                                       | existing assets composition |
|  45 | 纪念组合效果：星点 + 月光揭示                          | **major**, composition only |
|  46 | 年度进度占位不展示；仅阶段进度                         | no promise                  |
|  47 | Badge 10：完整牌途（条件未完成则保持成就进度）         | badge                       |
|  48 | 已解锁外观收藏页排序能力                               | UI behavior                 |
|  49 | 满级前纪念状态                                         | no new asset                |
|  50 | Level 50 纪念套装（复用 Theme 1 + Back 3 + Profile 3） | **major**, composition      |

等级到达但条件 badge（如完整牌途）未完成时，只显示 achievement 进度，不直接授予；level 奖励与 achievement 奖励不能混淆。

## 8. Long-Term Reward Roadmap（不绑定已发布等级）

| 能力/奖励                        | 未来解锁原则                         | 依赖                     | 不构成的承诺             |
| -------------------------------- | ------------------------------------ | ------------------------ | ------------------------ |
| 更多主题/背景/effects            | catalog version 上线后分配到新 track | 完整跨页面 QA、资源预算  | V1 达级不自动承诺        |
| Personal Card Meaning Dictionary | achievement 或长期 journey           | 新 domain/repository/UI  | 不作为 V1 level 空壳     |
| Reading collections              | 基础功能或订阅边界另审               | collection model         | 不限制历史访问           |
| 自定义牌阵槽位                   | 私人创建由产品能力开放；槽位策略另审 | spread editor/repository | 不与“塔罗能力”等级绑定   |
| 年度 Journey                     | 年度事实轨道                         | annual review            | 不采用断签或过期损失     |
| Seasonal decorations             | 活动获得后永久                       | asset delivery/catalog   | 无倒计时焦虑/奖励箱      |
| Advanced Insights presentation   | 只解锁展示方式                       | statistics UX            | 不锁基础统计，不生成预测 |
| Community/Creator decoration     | CRP/审核资格                         | Community Phase          | 不增加 Personal XP       |

## 9. Spread Guide Unlock 冻结原则

“牌阵解锁”统一改名为 **Spread Guide Unlock / 牌阵引导模板解锁**，只解锁：官方模板、自动布局、牌位标题/说明、引导问题和对应结构化回顾。它永远不限制用户在自由牌桌自行摆放任意数量和位置，也不限制手动记录相同结构。

V1/Phase 1B 不新增付费或等级牌阵。未来首批 guide 可按完成相关 reflection achievement 解锁，而不是高等级才能“有资格”使用。

## 10. Revised Mission Rules

Missions 属于 Phase 2，不进入 Phase 1A/1B。V1 的候选池保留为研究资产，但以下规则覆盖 V1：

- “打开旧 Reading”“停留”“标记已阅”“查看上次记录”本身均为 0 XP，也不能完成 mission。
- 回顾 mission 必须产生新的现实 feedback、Follow-Up reflection、理解变化或至少一条语言合格的新观察。
- Topic/tag/template 只可作为多样性条件，不单独发 XP。
- 每天展示 3 个候选，其中至少 1 个不要求新抽牌；每日 mission bonus 合计最多 20 XP。
- 同一 source 行为最多同时结算 1 个 daily、1 个 weekly milestone；mission bonus 与基础 event 分开显示。

### 10.1 Daily candidate pool（12）

| Mission ID            | 条件                                                        | Bonus XP | 防形式操作               |
| --------------------- | ----------------------------------------------------------- | -------: | ------------------------ |
| `D_REFLECT_ONE`       | 完成 1 条语言合格的当下观察                                 |        4 | source milestone         |
| `D_FOLLOWUP_ONE`      | 完成 1 个 Follow-Up                                         |        6 | completed transition     |
| `D_OLD_NEW_NOTE`      | 给 ≥7 天旧 Reading 新增现实观察                             |        5 | 新文本 hash              |
| `D_CARD_NOTE`         | 完成一条单牌笔记                                            |        4 | 文本资格                 |
| `D_FULL_READING`      | 完成一条含总体解读的 Reading                                |        5 | 同 source 一次           |
| `D_COMPARE_TWO`       | 对同一模板两条 Reading 写一条新对照观察                     |        5 | 需要新文本，不是打开页面 |
| `D_REALITY_OUTCOME`   | 完成含 outcome 的现实回顾                                   |        4 | Follow-Up source         |
| `D_REFRAME`           | 主动记录一次理解变化                                        |        5 | checkbox + 新观察        |
| `D_TWO_TOPICS`        | 在两个既有 Topic 各完成一次合格反思（可跨日累计至当日完成） |        4 | Topic 只是条件           |
| `D_SPREAD_REFLECTION` | 完成任一位置化 Reading 且有总体观察                         |        4 | 不按牌数                 |
| `D_QUESTION_RETURN`   | 固定问题的新 Reading，并写与上次不同的新观察                |        5 | exact duplicate 0        |
| `D_REST_OPTION`       | 主动选择“今天保留余白”                                      |        0 | 只结束提醒，不制造断签   |

### 10.2 Weekly candidate pool（12）

| Mission ID                    | 条件                                     | Bonus XP | 防刷                 |
| ----------------------------- | ---------------------------------------- | -------: | -------------------- |
| `W_THREE_REFLECTION_DAYS`     | 不同 3 天各有合格反思                    |       10 | trusted date         |
| `W_TWO_FOLLOWUPS`             | 2 个不同 Follow-Up                       |       14 | unique source        |
| `W_WEEKLY_REVIEW`             | completed weekly Review                  |       12 | period unique        |
| `W_TWO_TOPICS_REFLECTED`      | 2 Topic 各有合格 Reading reflection      |        7 | 不奖励建 Topic       |
| `W_TWO_SPREAD_GUIDES`         | 使用 2 个官方 guide 且各有观察           |        7 | stable IDs           |
| `W_DEEP_READING`              | 1 条 Reading 获得全部 4 个深度 milestone |       10 | source unique        |
| `W_30_DAY_FOLLOWUP`           | 完成 ≥30 天 Follow-Up                    |       12 | trusted timestamps   |
| `W_FOUR_DISTINCT_CARDS_NOTED` | 4 张不同牌各有新单牌笔记                 |        8 | distinct card IDs    |
| `W_TEMPLATE_COMPARISON`       | 同模板历史对照 + 新观察                  |        8 | 新文本 hash          |
| `W_DUAL_NOTE`                 | 实际出现 left/right 时写对应观察         |        8 | 不要求为了任务反复抽 |
| `W_THREE_OLD_NOTES`           | 给 3 条旧 Reading 新增现实注释           |       10 | 每 source 30 日一次  |
| `W_GENTLE_WEEK`               | 1 条 Reading + 1 个 Follow-Up reflection |        8 | 两个 source          |

Long-term、Community 和 Seasonal mission 候选继续保留在 V1 研究目录，但正式数值在 Phase 2/3 各自冻结。Seasonal mission 只能奖励永久纪念品，不要求每日连续、无过期损失提示，错过不影响 Personal Level。

## 11. Achievement 与 Community 修订状态

- V1 的 achievement 结构、一次性幂等和“同一事实不与 long-term mission 双倍发放”保留。
- Phase 1B 只交付上述 10 个 badge 和 8 个 title；其余 achievement definitions 延至 Phase 2。
- Community CRP 的独立账本、无公开榜单、无负分展示和违规 reversal 原则保留。
- Community 具体 CRP 数值、新账号 7 天 hold、同账户互动 cap 暂不冻结，必须在社区 domain、moderation 和隐私模型存在后重新模拟。

## 12. Phase 1 Scope（拆分）

### Phase 1A — Progression Infrastructure

| 范围        | 明确内容                                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| Domain      | stable event codes、candidate/verified event、profile、level calculator、rule version                                     |
| Persistence | append-only XP ledger、profile aggregate、local pending queue、Supabase RLS/RPC、idempotency/reversal                     |
| Sources     | Reading package、Follow-Up package、weekly/monthly Review、onboarding                                                     |
| Repository  | `ProgressionRepository` local/Supabase parity；application coordinator 监听 source 保存成功，不改 Reading domain          |
| UI          | 一个基础 Progress 页面：level、verified/provisional XP、最近 ledger；设置中显示/隐藏成长 UI                               |
| Tests       | 50 级曲线、package max、语言阈值、每日 cap、source validation、编辑补发、删除保留、offline sync、多设备幂等、two-user RLS |
| 不包含      | reward inventory/equip、missions、完整 achievements、Community、Creator、Seasonal、AI、自定义牌阵                         |

Phase 1A 必须先稳定一个发布周期；XP 规则错误只能通过新 rule version 和 adjustment event 修复。

### Phase 1B — First Unlock Rewards

| 范围          | 明确内容                                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| Catalog       | 2 themes、3 card backs、2 reveals、3 profile decorations、8 titles、10 badges                              |
| Persistence   | reward definitions、user unlocks、equipped slots；已解锁永久保留                                           |
| UI            | inventory、preview、equip；无资产时绝不显示空壳 reward                                                     |
| Accessibility | Reduced Motion fallback、contrast、screen-reader labels、asset load fallback                               |
| Tests         | catalog/version、unlock idempotency、equip ownership、archive/grandfathering、Web/iOS/Android visual smoke |
| 不包含        | Future roadmap、Spread Guide 新模板、missions、seasonal expiry、community reward                           |

## 13. Frozen Decisions

以下为 **RECOMMENDED TO FREEZE — awaiting product owner ratification**。只有产品负责人逐项批准后才进入 migration/implementation specification：

1. Level cap = 50；七阶段命名与范围。
2. Personal XP 与 Community CRP 完全分离，社区不是个人满级条件。
3. 核心记录、基础统计、隐私、无障碍、同步/导出不锁定。
4. 普通个人抽牌次数不限制，只限制可获 XP 的 Reading 数。
5. 正常删除 Reading 保留 verified XP；作弊使用 append-only reversal。
6. 编辑不重复发；仅 milestone 首次从不合格变合格时补发。
7. 客户端不能提交 XP amount；服务端验证 source 和 rule version。
8. append-only ledger、唯一 idempotency key、profile 可重建。
9. 离线 XP 为 provisional；云端 ledger 为多设备权威。
10. 已解锁奖励不因规则调整、catalog archive 或 curve 调整被收回。
11. 不采用 Prestige 重生，不清零历史。
12. 不设公开全站排行榜；等级/徽章/称号默认可隐藏。
13. 等级不表示准确率、权威或超自然能力；视觉奖励不影响随机性。
14. Spread Guide Unlock 只解锁官方模板/布局/说明，不限制自由摆牌。
15. 私密 Reading 的 Personal XP 不低于公开内容。
16. Phase 1 拆分为 1A infrastructure 与 1B first rewards。

## 14. Decisions Still Requiring Product Owner Approval

以下仍为 **PROPOSED — awaiting product owner approval**：

1. Reading package 的 `10 + 10 + 15 + 10 + 5 = 50 XP`。
2. Follow-Up package 的最高 65 XP。
3. Personal XP 每日总上限 200，achievement exempt 且立即结算。
4. 每日最多 3 条 Reading 获 XP；同一问题 24 小时只奖励第一条。
5. 周/月 Review 调整为 40/80 XP。
6. CJK/Latin weighted `effectiveUnits` 阈值。
7. 修订后周均模型 220/490/800 XP 与满级 4.45 年/2 年/14.7 月。
8. Phase 1B 的精确资产预算与美术名称。
9. Level 40/45/50 使用组合预设而非新增独立资产。
10. Mission pool 的 bonus XP、daily 20/weekly 60 cap。
11. Achievement XP 免 daily cap 是否需要单周保护。
12. Community CRP 所有具体数值、新账号 hold 和互动 cap。
13. local-only 历史在首次登录时哪些 provisional event 可验证/补记。
14. 是否在 Phase 1A 纳入 Review XP，或先只做 Reading/Follow-Up。

## 15. Differences from V1

| 主题            | V1                                       | V1.1                                                    |
| --------------- | ---------------------------------------- | ------------------------------------------------------- |
| Reading XP      | 多字段可叠加，首次极值可达 77–92         | package 结构，常规最高 50；Topic/question/template 为 0 |
| Follow-Up XP    | 多事件最高 80                            | 五个清晰 milestone，最高 65                             |
| Daily cap       | 基础 180 + mission 25 + achievement 延迟 | 总计 200；achievement 立即结算且 exempt                 |
| 文本资格        | 统一字符阈值为主                         | CJK/Latin 加权、组合资格                                |
| 等级奖励        | 50 级含大量 Future placeholder           | 只承诺 28 个 Phase 1B 资产；每 5 级 major，其余轻量进度 |
| Future features | 绑定具体 level                           | 进入 roadmap，不在达到 level 时承诺                     |
| Spread unlock   | 牌阵解锁说明存在歧义                     | 正式命名 Spread Guide Unlock，不限制自由摆牌            |
| 回顾任务        | 部分只需打开/标记已阅                    | 必须产生新 feedback/观察/对照                           |
| Phase 1         | infrastructure + rewards 同期            | 1A 基础设施，稳定后再做 1B 奖励                         |
| 模拟            | 240/700/1,150 XP/周；10.2 月–4.1 年      | 220/490/800；14.7 月–4.45 年                            |

## 16. Implementation Gate

V1.1 完成后仍只进入人工产品评审。实施前必须另外批准：Phase 1A event matrix、migration/RLS/RPC 设计、local queue 数据保留、用户可见 XP 解释文案和 telemetry privacy。没有批准不得创建 migration，也不得在 Reading/Follow-Up repository 中直接加入 XP side effect。
