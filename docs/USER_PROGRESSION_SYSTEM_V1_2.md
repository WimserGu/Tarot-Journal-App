# Tarot Journal App 用户成长系统 V1.2（双向逆位探索整合）

> 状态：**PROPOSED — awaiting product owner approval**
> 基线：[USER_PROGRESSION_SYSTEM_V1_1.md](./USER_PROGRESSION_SYSTEM_V1_1.md)
> 本文只定义产品、数值、权限与未来技术方案；不代表已实现或已冻结。

## 1. V1.2 定位与不变原则

V1.2 保留 V1.1 的 50 级、七阶段、Reading/Follow-Up 包式 XP、Personal XP 与 Community CRP 分账、append-only ledger、离线 provisional、正常删除保留 XP、Future 奖励不作空壳承诺等完整结构，并把双向逆位作为一条可选的长期研究路径融入其中。

核心理念：

> 左右旋提供新的观察维度；用户通过记录、现实回顾与长期比较，形成属于自己的个人定义。

不可改变的边界：

- `left`/`right` 没有 App 规定的标准牌义、固定吉凶或准确率排序。
- 随机抽到某方向、打开档案、旋转牌面、查看统计均不产生常规 XP。
- 奖励比较、记录、现实回顾和基于新证据的修订，而不是抽牌运气。
- 用户可关闭双向逆位、按抽牌模式单独启用，并继续使用传统 `reversed + null`。
- 关闭后保留历史、知识档案和定义版本；重新开启不重置。
- Dual Track 不取代 Personal Level，不影响随机概率，也不是 Level 50 的必要条件。
- 私密探索与公开分享的 Personal XP 相同；社区热度不进入 Personal XP。

## 2. 当前实现约束

| 当前事实                                                                                       | V1.2 设计约束                                                          |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Domain 使用 `orientation: upright\|reversed` + `reversalVariant: left\|right\|null`            | 知识档案必须沿用两层结构，不能压成 `upright\|left\|right`              |
| Draw `ReversalMode = disabled\|standard\|dual`，每个 DrawSession 保存 mode 和概率              | 新的 `DualReversalMode` 是用户探索偏好，不替代每次抽牌的不可变配置快照 |
| 普通逆位为 `reversed + null`；双向为 `reversed + left/right`                                   | 统计和档案必须保留普通逆位，不能误归入 left/right                      |
| 视觉映射为 upright 0°、ordinary reversed 180°、left −30°、right +30°                           | Reward/Lab 可改变外观，但不得改变 canonical orientation 或旋转含义     |
| ReadingCard、DrawSessionCard、Import、Statistics 已支持 left/right                             | Phase 1A 可从现有 Reading 识别事实，不需要改抽牌结果模型               |
| Supabase 当前列名仍为 `reversal_expression`，mapper 兼容旧 `underexpressed/overexpressed` 存储 | 未来 migration 需另行评审；本设计不能假设存储已经原生使用 left/right   |
| 当前没有 Direction Lab、个人方向定义、progression 或 community 表                              | 全部标为 Future dependency，并按 Phase 分批实现                        |

## 3. 保留的 Personal Journey 体系

- Level cap 50；Level 50 为累计 50,960 XP。
- 公式：`cumulativeXP(level)=200n+17.5n(n-1)`，`n=level-1`。
- 阶段：初见者 1–4、倾听者 5–9、记录者 10–16、诠释者 17–24、映照者 25–33、同行者 34–42、星辰旅者 43–50。
- Personal XP 总上限 200/可信服务端日；Achievement XP 一次性、即时、免日上限。
- 每日最多 3 条 Reading 获 package XP；同一 normalized question 24 小时只奖励第一条。
- Reading 常规最高 50 XP；30 日完整 Follow-Up 常规最高 65 XP。
- Topic、Question Template、随机牌面和单纯打开页面不单独发 XP。

双向逆位 XP 计入 Personal XP 总上限，并另设 **40 XP/周、100 XP/月的可重复 Dual Track XP 上限**；一次性 achievement 与 tutorial 不计该子上限。这样不探索左右旋的用户不会升级更慢，深度探索也不能成为刷级捷径。

## 4. Dual Reversal Exploration Track / 双向逆位探索路径

该路径独立展示 stage、覆盖度、定义与证据，不另设竞争等级。它可以发少量 Personal XP、Achievement、Badge、Title 和纯视觉奖励，但不提供概率、抽牌次数、核心统计或隐私能力。

```ts
type DualReversalMode = 'disabled' | 'tutorial' | 'enabled';

type DualReversalCardKnowledgeStatus =
  | 'unexplored'
  | 'observed'
  | 'provisional_definition'
  | 'reality_reflected'
  | 'revised'
  | 'stable_definition';
```

### 4.1 偏好模式

| Mode       | 产品含义                                                    | 新 Draw 默认行为                                               | 历史                                           |
| ---------- | ----------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------- |
| `disabled` | 不参与探索；可继续传统正逆位                                | 所有新 Draw 默认 `standard`；重新启用前不设 dual 默认值        | left/right 历史仍可查看，不发新的 Dual mission |
| `tutorial` | 在非占卜教学沙盒体验四状态                                  | 真实 Draw 仍保持 `standard`；正式 enabled 后才能设 dual 默认值 | 教学数据不算自然遇见                           |
| `enabled`  | 启用探索，可按 `single/three/table/open` 保存 mode override | 启用的抽牌模式默认 `dual`，其他保持 `standard`                 | 完整保留                                       |

偏好与 `DrawSession.configuration.reversalMode` 分离：前者决定下一次 UI 默认值，后者是该次抽牌的历史事实。关闭偏好不能改写既有 Reading/DrawSession。

### 4.2 每张牌的双侧知识状态

该 enum 描述“同一张牌 left/right 这一对”的总体探索状态；四个 orientation profile 仍分别保存自己的 `definitionStatus`。状态回退只改变当前展示，不删除证据、version、milestone 或已验证 XP。

| Status                   | 产品含义                                                                                     | 进入条件                                     | 可回退                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------- |
| `unexplored`             | 没有自然 left/right，也未在 Lab 研究                                                         | 默认                                         | 否；一旦有证据即保留历史                                |
| `observed`               | 至少自然遇见一个方向，或在 Lab 完成一次有效 study                                            | `Experienced OR Studied`                     | 不因正常删除 Reading 回退；可隐藏                       |
| `provisional_definition` | left/right 均有暂定定义，并保存首组比较                                                      | 两侧定义 + comparison                        | 编辑不会退回 observed                                   |
| `reality_reflected`      | 至少一个自然 left/right Reading 完成相关 Follow-Up                                           | 真实 source + Follow-Up                      | 不回退                                                  |
| `revised`                | 用户基于新 Reading/Follow-Up/Topic 证据创建后续定义版本                                      | 有 previous version + change reason + source | 不回退；继续修订仍为 revised                            |
| `stable_definition`      | 两侧各≥2 次自然遇见、合计≥2 次相关 Follow-Up、两侧均有定义且至少一侧修订，当前版本保持 30 天 | 派生条件全部满足                             | **可以**：任何新修订后回到 `revised`；30 天后可再次稳定 |

`stable_definition` 只表示“当前足够稳定，便于使用”，绝不表示最终答案。状态由事实派生，用户不能手动把自己标为“正确”。

### 4.3 五个探索阶段

Stage 计算使用多路径条件；未开启/隐藏不影响 Personal Level。

| Stage | 中文名   | English                  | 条件（全部满足，除注明多路径）                                                                                                                                                                   | Reward                      | 影响 Level          | 可隐藏 |
| ----: | -------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- | ------------------- | ------ |
|     1 | 发现方向 | Discovering Direction    | 完成 tutorial；写 1 条方向观察；并满足“自然记录已覆盖 left 与 right”或“在 Lab 研究同牌两侧”之一                                                                                                  | Badge“打开另一侧”           | 仅事件少量 XP       | 是     |
|     2 | 形成对照 | Forming Contrast         | 3 组差异笔记 + 3 次相关现实回顾；另满足 A：3 个自然 pair，或 B：6 个 Studied pair 且至少 3 条真实 directional Reading 覆盖 left/right                                                            | Title“左右记录者”+ 对照封面 | 少量 XP/achievement | 是     |
|     3 | 建立语言 | Building a Language      | 10 张牌有左右定义；其中 5 张发生有效修订；1 次方向月 Review                                                                                                                                      | 左右分流光                  | 少量 XP/achievement | 是     |
|     4 | 形成体系 | Shaping a Framework      | 22 张大阿卡那有双侧定义和 comparison；≥10 次相关 Follow-Up、覆盖≥7 张大牌；完成个人方法总结                                                                                                      | 大牌双向星图装饰            | achievement only    | 是     |
|     5 | 完整星图 | A Personal Constellation | Stage 4；启用跨度≥180 天；40 组 comparison；20 次 Follow-Up、覆盖≥12 张牌；再从五项任选三项：60/156 natural states；60 张 Studied pair；四花色总结；60 张双侧定义；20 次 evidence-based revision | Badge/Title“两侧星图”       | achievement only    | 是     |

Stage 5 不要求自然抽齐 156 个方向状态，也不要求 78 张全部定义。Direction Lab 可补足研究覆盖，但不能冒充自然遇见或现实回顾。

## 5. 非强制开启与教学

入口出现在双逆位设置、第一次选择 dual 时和 Direction Lab 预览中；不弹强制 modal。流程：

1. 选择“暂不开启”“体验教学”或“正式开启”。
2. 教学用一张固定示例牌说明：`reversed` 是传统 180°；`left/right` 是双向逆位的两个观察角度。
3. 明示没有统一标准答案、不会改变 `reversedProbability` 或 `rightProbabilityWhenReversed`、可随时关闭。
4. 用户用开放式提示写可选观察；不要求认可任何内置解释。
5. 完成后可保持 `tutorial`，或选择哪些 draw modes 默认启用 dual。

完成教学一次发 10 XP 与 tutorial badge；跳过不损失功能、等级或奖励。再次教学 0 XP。教学中的示例旋转不创建 Reading、DrawSession 或 encounter。

## 6. Direction Lab / 方向实验室（Phase 2 Future dependency）

Direction Lab 是个人研究工具，不是抽牌或 AI 解牌页面。用户主动选择任意牌并并排查看 upright、ordinary reversed、left、right，可旋转观察人物视线、动作和构图，记录第一反应、暂定定义、比较与修订历史。

它必须满足：

- 不随机抽牌、不创建 Reading/DrawSession、不计每日抽牌或 Reading XP。
- 不增加 natural encounter；选择 78 张逐个打开不产生 XP。
- 手动旋转、查看、搜索、重复编辑均为 0 XP。
- 只有首次达到合格 definition/comparison/revision milestone 才可能发少量 XP，并受 Dual 子上限与幂等约束。

| Evidence      | 含义                                                                                                     | 来源                                                |
| ------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `Experienced` | 在真实 completed Reading 中自然出现；要求 `source=drawn`、linked DrawSession 为 dual、variant 与快照一致 | Reading/DrawSession；手动录入和 import 不算 natural |
| `Studied`     | 在 Direction Lab 完成有实质观察的 study                                                                  | Lab artifact；不进入 encounterCount                 |
| `Reflected`   | 对含该状态的真实 Reading 完成 Follow-Up，并产生合格 reflection                                           | Follow-Up                                           |
| `Defined`     | 为该 card+orientation 建立当前暂定 personal definition                                                   | Definition version                                  |

四项是可同时存在的正交事实，不是必须按顺序升级的等级。例如一张牌可以同时是 Experienced、Studied、Reflected 和 Defined。

## 7. 四状态个人知识档案

每张牌必须分别保留：

```text
upright                = orientation upright + variant null
ordinary reversed      = orientation reversed + variant null
reversed left          = orientation reversed + variant left
reversed right         = orientation reversed + variant right
```

每个方向的派生档案包含 `encounterCount`、`firstEncounterAt`、`lastEncounterAt`、可查询的 `readingIds`、`followUpCount`、`personalDefinition`、`definitionStatus`、`definitionVersion`、`lastRevisedAt`、`topicDistribution`，另加 `studiedCount` 与 `lastStudiedAt` 以防混淆自然经验。

模块：

1. **我的即时感受**：来自 Reading card interpretation；按时间排列。
2. **我的现实回顾**：只列 linked Follow-Up，outcome 仅为用户记录，不计算准确率。
3. **我的重复模式**：出现次数、Topic/QuestionTag、时间和位置事实。
4. **我的当前定义**：用户当前选择的 definition version；允许标为 provisional。
5. **定义版本历史**：不可覆盖历史版本；展示 change reason 和 source。
6. **不同 Topic 下的差异**：至少各 Topic 2 条 evidence 才展示比例，避免单例误导。
7. **左右旋并排对照**：left/right 证据与定义并列，不自动选“更正确”的一侧。

`readingIds` 和 `topicDistribution` 优先查询/派生，不把不断增长的 ID 数组复制进 profile aggregate。系统可总结“你在关系 Topic 中记录左旋 4 次”，不能输出“左旋代表关系阻滞”。

## 8. Dual Reversal Comparison / 左右旋对照

满足以下任一条件后开放某张牌的并排对照：自然 left/right 各至少 1 次；或两侧均有合格 Definition/Study。UI 必须标明 evidence 来源，不能把 Lab study 显示为自然经历。

| 左旋                 | 右旋                 |
| -------------------- | -------------------- |
| 自然出现次数与日期   | 自然出现次数与日期   |
| 相关问题（可隐藏）   | 相关问题（可隐藏）   |
| 初始解读             | 初始解读             |
| Follow-Up 与 outcome | Follow-Up 与 outcome |
| 理解变化             | 理解变化             |
| Topic 分布           | Topic 分布           |
| 当前暂定定义         | 当前暂定定义         |

可选 reflection prompts：

- 哪一侧更像能量不足？哪一侧更像能量过高？还是这种区分不适合这张牌？
- 是否存在向内与向外、靠近与离开、压抑与扩张等方向差异？
- 它们是否在不同 Topic 中呈现不同含义？
- 最初定义有没有被现实经验改变？
- 左右旋是否更像两个方向，而不是正负程度？

这些问题只由用户选择回答；系统不预填结论、不用答案训练统一牌义，也不根据 outcome 计算“哪一侧更准”。

## 9. Dual Reversal XP integration

### 9.1 稳定事件与数值

| Event Code                                   |  XP | 资格与频率                                                                               | Direction Lab 可完成                               | 自然遇见要求                    |
| -------------------------------------------- | --: | ---------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------- |
| `DUAL_REVERSAL_TUTORIAL_COMPLETED`           |  10 | 账户一次；完成全部伦理/模式说明                                                          | 是                                                 | 否                              |
| `DUAL_REVERSAL_FIRST_LEFT_ENCOUNTER`         |   0 | 首次真实 Reading 自然 left；只发 badge progress                                          | 否                                                 | 是                              |
| `DUAL_REVERSAL_FIRST_RIGHT_ENCOUNTER`        |   0 | 首次真实 Reading 自然 right；只发 badge progress                                         | 否                                                 | 是                              |
| `DUAL_REVERSAL_FIRST_PAIR_COMPLETED`         |  10 | 首张牌自然 left/right 各≥1，并保存首组 comparison；账户一次                              | 否                                                 | 是                              |
| `DUAL_REVERSAL_COMPARISON_NOTE_COMPLETED`    |  15 | 每 card 首组双侧比较；最多 2/周                                                          | 是                                                 | 否                              |
| `DUAL_REVERSAL_REALITY_REFLECTION_COMPLETED` |  10 | 真实 dual Reading 的合格 Follow-Up 中有独立方向观察；每 card+variant 一次，最多 2/周     | 否                                                 | 是                              |
| `DUAL_REVERSAL_DEFINITION_CREATED`           |   8 | 每 card+`left/right` 首个合格 definition；最多 2 definitions/周                          | 是                                                 | 否                              |
| `DUAL_REVERSAL_DEFINITION_REVISED`           |  10 | 每 card+variant 首次基于新 source 的实质修订；以后修订 0 XP；最多 2/周                   | 是，但须关联 Reading/Follow-Up 或新 Topic evidence | 作为 XP 时须至少一个真实 source |
| `DUAL_REVERSAL_MONTHLY_REVIEW_COMPLETED`     |  25 | 每 calendar month 最多一次；≥3 个 dual evidence + 合格 summary                           | 是                                                 | 至少 1 个真实 source            |
| `DUAL_REVERSAL_THREE_PAIRS_COMPLETED`        |  15 | 一次性 achievement；3 个自然 pairs                                                       | 否                                                 | 是                              |
| `DUAL_REVERSAL_TEN_COMPARISONS_COMPLETED`    |  30 | 一次性 achievement；10 个合格 comparisons，其中≥3 个自然 pair                            | 是                                                 | 部分                            |
| `DUAL_REVERSAL_MAJOR_ARCANA_MAP_COMPLETED`   |  60 | 一次性；22 张大牌均有双侧定义/比较，≥10 次 Follow-Up 覆盖≥7 张大牌，并有方法总结         | 部分                                               | 部分                            |
| `DUAL_REVERSAL_FULL_LEXICON_COMPLETED`       | 100 | 一次性 long-term；78 张均有双侧定义、四花色总结、≥30 Follow-Up 覆盖≥20 张牌、≥20 revised | 部分                                               | 部分                            |

随机遇见事件为 0 XP，仍记录 factual achievement progress。Dual 可重复 XP（comparison、reflection、definition、revision、monthly review）共享 40/周、100/月子上限，并受 Personal 200/日总上限；一次性 tutorial/achievement 不受子上限。

### 9.2 Stacking 与 suppression

| 同一用户动作                                  | 处理                                                                                            |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Reading 中记录 left/right                     | 只结算正常 Reading package；方向出现为 0 XP factual event                                       |
| Follow-Up reflection 同时含方向观察           | 正常 Follow-Up reflection +10 Dual bonus，前提是 Dual 观察保存为独立结构化段落/字段且 hash 不同 |
| 同一段文字同时保存为 comparison 与 definition | 只发较高的 comparison 15 XP；definition milestone 更新但 XP 标记 `suppressed_duplicate_content` |
| left/right 两个 definition 使用不同合格文本   | 每侧 8 XP 可分别发，但受每周 2 条和子上限                                                       |
| 仅改标点、空白、同义复制或来回恢复旧版本      | 新版本可保留审计，但 0 XP                                                                       |
| 基于新 Follow-Up 修改 definition              | Follow-Up package 正常结算；首次合格 revision 可另加 10，必须有独立 change reason               |
| Mission 与基础 Dual event 同时完成            | mission 只发 bonus；同一 source 每日最多完成 1 个 Dual daily 与 1 个 weekly                     |
| Achievement 与 long-term mission 同一条件     | 只取较高 XP，另一项写 `suppressed_by`；Badge/Title 仍可发                                       |

实质修订只验证：previous version 存在、normalized diff 超过最低阈值、关联新 source、change reason 合格、未恢复旧 hash。服务端不判断定义正确或更好。

## 10. Mission integration（Phase 2）

只有 `DualReversalMode=enabled` 的用户会收到 Dual missions；`tutorial/disabled` 不分配。每周最多 1 个 Dual daily slot 和 1 个 Dual weekly slot，且候选任务始终可以用历史或 Lab 完成，绝不要求当天随机抽到某方向。

### 10.1 Daily

| Mission ID                | 名称     | 条件                                             |  XP | 奖励 | 周期  | 防刷                             |
| ------------------------- | -------- | ------------------------------------------------ | --: | ---- | ----- | -------------------------------- |
| `D_DUAL_HISTORY_NOTE`     | 再看一侧 | 回看既有 left/right source 并新增一条合格观察    |   4 | —    | daily | 新文本 hash；每 source 30 天一次 |
| `D_DUAL_LAB_STUDY`        | 方向练习 | 在 Lab 研究 1 张牌并保存合格 study note          |   4 | —    | daily | 每 card 30 天一次；打开/旋转 0   |
| `D_DUAL_ORDINARY_COMPARE` | 三种逆位 | 比较 ordinary reversed、left、right 并写一句差异 |   5 | —    | daily | 合格 comparison artifact         |

### 10.2 Weekly

| Mission ID             | 名称       | 条件                                        |  XP | 奖励 | 周期   | 防刷                                    |
| ---------------------- | ---------- | ------------------------------------------- | --: | ---- | ------ | --------------------------------------- |
| `W_DUAL_PAIR_NOTE`     | 一组两侧   | 完成一张牌的首组左右差异笔记                |   8 | —    | weekly | card milestone unique                   |
| `W_DUAL_REALITY`       | 方向与现实 | 对 dual Reading 完成 Follow-Up 并写方向观察 |  10 | —    | weekly | 真实 source；outcome 同值               |
| `W_DUAL_REVISION`      | 允许改变   | 基于新 evidence 修订暂定定义                |   8 | —    | weekly | 新 version/source/hash                  |
| `W_DUAL_TOPIC_CONTEXT` | 随境而变   | 比较同牌在 2 个 Topic 的 evidence 并写观察  |   8 | —    | weekly | 每 Topic 各≥1 source；每 card 90 天一次 |

### 10.3 Long-term

| Mission ID               | 名称           | 条件                                                   |  XP | 奖励                       | 周期 | 防刷                             |
| ------------------------ | -------------- | ------------------------------------------------------ | --: | -------------------------- | ---- | -------------------------------- |
| `L_DUAL_THREE_PAIRS`     | 三组方向       | 3 个自然 pairs + 3 comparisons                         |  15 | Badge“三组方向”            | once | distinct cards                   |
| `L_DUAL_TEN_COMPARISONS` | 两侧书写       | 10 comparisons，其中≥3 自然 pairs                      |  30 | Title“两侧书写者”          | once | distinct cards                   |
| `L_DUAL_MAJOR_MAP`       | 大牌双向星图   | Stage 4 条件                                           |  60 | 星图装饰                   | once | achievement suppression          |
| `L_DUAL_FOUR_SUITS`      | 四种方向语言   | 四花色各完成 1 篇总结                                  |  40 | 四花色档案封面             | once | 每 suit ≥5 evidence              |
| `L_DUAL_LEXICON`         | 个人双向词典   | Full Lexicon 条件                                      | 100 | Badge“两侧星图”            | once | achievement suppression          |
| `L_DUAL_CHANGED_MIND`    | 推翻第一次定义 | 首次基于真实 Follow-Up 创建与初版明显不同的 definition |  20 | Hidden title“允许改变的人” | once | 人工语义不判断；结构+diff+source |

Daily/Weekly XP 计入既有 mission 20/日、60/周上限及 Dual 子上限。未开启用户的任务轮换概率和总奖励机会必须相同，以普通 reflection mission 替代。

## 11. Achievement & Badge integration

表中 XP 是该 milestone 的最终一次性总额；若对应基础 event/mission 已发，则 ledger 只补差额或记 `suppressed_by`，不叠加两次。

| Achievement ID                         | 名称           | 条件                                       | Tier     |  XP | Badge                | Title          | 隐藏   | 自然遇见 | Lab 可完成 | Follow-Up |
| -------------------------------------- | -------------- | ------------------------------------------ | -------- | --: | -------------------- | -------------- | ------ | -------- | ---------- | --------- |
| `DUAL_MODE_ENABLED`                    | 打开另一侧     | 完成 tutorial 并首次 enabled               | Bronze   |  10 | `dual_open`          | 方向初见者     | 否     | 否       | 是         | 否        |
| `FIRST_LEFT`                           | 向左的牌       | 首次自然 left                              | Bronze   |   0 | `first_left`         | —              | 否     | **是**   | 否         | 否        |
| `FIRST_RIGHT`                          | 向右的牌       | 首次自然 right                             | Bronze   |   0 | `first_right`        | —              | 否     | **是**   | 否         | 否        |
| `FIRST_PAIR`                           | 同一张牌的两侧 | 首个自然 pair + 合格 comparison            | Bronze   |  10 | `first_pair`         | 左右记录者     | 否     | **是**   | 否         | 否        |
| `FIRST_COMPARISON`                     | 第一次对照     | 首组合格 comparison                        | Bronze   |  15 | `first_comparison`   | 两侧观察者     | 否     | 否       | 是         | 否        |
| `THREE_PAIRS`                          | 三组方向       | 3 个自然 pair + comparison                 | Silver   |  15 | `three_pairs`        | —              | 否     | **是**   | 部分       | 否        |
| `TEN_COMPARISONS`                      | 两侧书写者     | 10 comparisons，≥3 natural pairs           | Silver   |  30 | `ten_comparisons`    | 两侧书写者     | 否     | 部分     | 是         | 否        |
| `MAJOR_DUAL_MAP`                       | 大牌双向星图   | Stage 4 条件                               | Gold     |  60 | `major_dual_map`     | 大牌双向绘图者 | 否     | 部分     | 部分       | **是**    |
| `DEFINITION_REVISED`                   | 允许自己改变   | 首次基于现实 evidence 修订定义             | Silver   |  20 | `definition_revised` | 允许改变的人   | **是** | **是**   | 可编辑     | **是**    |
| `CONTEXT_DEPENDENT_MEANING_DISCOVERED` | 含义随境而变   | 同牌在 2 Topic 各≥2 evidence，用户写出差异 | Gold     |  25 | `context_meaning`    | 含义随境而变   | **是** | 部分     | 否         | 可选      |
| `DUAL_REALITY_BRIDGE`                  | 方向与现实     | 10 次 dual-related Follow-Up               | Gold     |  40 | `dual_reality`       | 方向研究者     | 否     | **是**   | 否         | **是**    |
| `FULL_DUAL_LEXICON`                    | 两侧星图       | Full Lexicon 条件                          | Platinum | 100 | `full_dual_lexicon`  | 两侧星图       | 否     | 部分     | 部分       | **是**    |

“允许自己改变”不比较新旧定义谁更正确，只验证真实 source、版本差异和 change reason。`FIRST_LEFT/RIGHT` 故意为 0 XP，避免奖励随机运气。

## 12. Title Catalog additions（10）

| Title ID                    | 中文名         | English                 | 类型       | 获取方式             | 永久 | 可装备 | 默认公开 |
| --------------------------- | -------------- | ----------------------- | ---------- | -------------------- | ---- | ------ | -------- |
| `t_direction_beginner`      | 方向初见者     | Direction Beginner      | Discovery  | tutorial + enabled   | 是   | 是     | 否       |
| `t_left_right_recorder`     | 左右记录者     | Left & Right Recorder   | Discovery  | FIRST_PAIR           | 是   | 是     | 否       |
| `t_two_side_observer`       | 两侧观察者     | Observer of Both Sides  | Reflection | FIRST_COMPARISON     | 是   | 是     | 否       |
| `t_two_side_writer`         | 两侧书写者     | Writer of Both Sides    | Reflection | TEN_COMPARISONS      | 是   | 是     | 否       |
| `t_dual_interpreter`        | 双向诠释者     | Dual Interpreter        | Journey    | Track Stage 3        | 是   | 是     | 否       |
| `t_direction_researcher`    | 方向研究者     | Direction Researcher    | Reflection | 10 dual Follow-Ups   | 是   | 是     | 否       |
| `t_major_dual_cartographer` | 大牌双向绘图者 | Major Dual Cartographer | Discovery  | MAJOR_DUAL_MAP       | 是   | 是     | 否       |
| `t_two_side_constellation`  | 两侧星图       | Two-Sided Constellation | Journey    | Track Stage 5        | 是   | 是     | 否       |
| `t_open_to_change`          | 允许改变的人   | Open to Revision        | Hidden     | DEFINITION_REVISED   | 是   | 是     | 否       |
| `t_context_changes_meaning` | 含义随境而变   | Meaning in Context      | Hidden     | CONTEXT_DEPENDENT... | 是   | 是     | 否       |

禁用“逆位权威”“双向大师”“真理解读者”等能力或权威表述。称号默认私密，用户主动选择公开。

## 13. Dual visual reward catalog（9）

| Reward ID                     | 名称           | 类型               | 解锁条件          | 最低 Level | Track Stage | 可预览 | 影响随机性 | 复杂度 |
| ----------------------------- | -------------- | ------------------ | ----------------- | ---------: | ----------: | ------ | ---------- | ------ |
| `dual_back_crossing_paths`    | 交汇路径牌背   | card_back          | FIRST_PAIR        |          1 |           1 | 是     | **否**     | 低     |
| `dual_reveal_split_glimmer`   | 左右分流光     | reveal_effect      | Stage 3           |          1 |           3 | 是     | **否**     | 中     |
| `dual_ambient_direction_dust` | 轻微方向星尘   | ambient_effect     | THREE_PAIRS       |          1 |           2 | 是     | **否**     | 中     |
| `dual_comparison_cover`       | 两侧档案封面   | profile_cover      | FIRST_COMPARISON  |          1 |           1 | 是     | **否**     | 低     |
| `dual_star_map_decoration`    | 双向星图装饰   | theme_decoration   | MAJOR_DUAL_MAP    |          1 |           4 | 是     | **否**     | 中     |
| `dual_profile_frame`          | 左右方向框     | profile_decoration | Stage 2           |          1 |           2 | 是     | **否**     | 低     |
| `dual_lexicon_cover`          | 双向词典封面   | collection_cover   | FULL_DUAL_LEXICON |          1 |           5 | 是     | **否**     | 中     |
| `dual_comparison_layout`      | 对照视图排版   | layout_skin        | TEN_COMPARISONS   |          1 |           3 | 是     | **否**     | 低     |
| `dual_title_slot_ornament`    | 双向称号槽装饰 | title_decoration   | Stage 4           |          1 |           4 | 是     | **否**     | 低     |

所有资产只改变展示；不得读写 `reversedProbability`、`rightProbabilityWhenReversed`、hidden deck、牌阵结果或 Draw Engine random provider。Reduced Motion 下流光/星尘变为静态边缘或短 fade。

Phase 1B 只建议实际交付 `dual_back_crossing_paths`、`dual_comparison_cover`、`dual_profile_frame`；其余进入 Phase 2/长期 catalog，不提前显示为空壳奖励。

## 14. Community integration（Phase 3 Future dependency）

允许的内容类型：我的左旋定义、我的右旋定义、一次去标识化现实案例、定义如何改变、仍无法区分的牌、同牌不同 Topic、左右旋方法讨论、自定义方向牌阵。

互动不以“赞同/正确”为核心：

- **给了我新的角度**：表达启发，不表示认可为标准。
- **我也有相似记录**：只表达个人经验重叠。
- **我的经验不同**：鼓励差异，不是反对票。
- **收藏作参考**：私人收藏，不增加作者权威标识。

发布页固定显示：

> 这是该用户基于个人记录形成的解释，不代表统一或标准牌义。

CRP 可以奖励完整背景、去标识化 Follow-Up、后续修订、尊重差异和明确“个人经验”边界；不奖励绝对断言、准确率竞争、用热度证明权威或批量复制定义。Personal XP 与公开/私密状态无关。Community moderation 必须允许作者隐藏问题、人物、日期、Topic、outcome 和原 Reading 链接。

## 15. V1.1 基础体系保留与整合

本节使 V1.2 可以独立评审，而不是要求读者在 V1.1 与 Dual 附录之间来回拼接。除本文件明确修订的 Dual 规则外，以下 V1.1 规则保持原义。

### 15.1 Personal XP 基础包与上限

- Personal Journey XP 总上限仍为 **200 XP/可信服务端日**；Dual XP 不是额外日额度。
- Achievement XP 仍为低频一次性事件、立即结算并免日上限；是否另设周保护仍待批准。
- 每日最多 3 条 Reading 获得 package XP；同一 normalized question 24 小时仅第一条获得 package XP。
- Mission bonus 仍为每日最多 20 XP、每周最多 60 XP，并受 Personal 总上限约束。
- 草稿、DrawSession、揭牌、移动牌、重复保存、历史 import 和随机 orientation 本身均不发 XP。

| Reading Event                          | Milestone        |  XP | 资格                                               |
| -------------------------------------- | ---------------- | --: | -------------------------------------------------- |
| `READING_COMPLETED`                    | 有效保存         |  10 | completed；非空真实问题；至少 1 张有效牌；牌序合法 |
| `READING_INITIAL_REFLECTION_ADDED`     | 当下观察         | +10 | 达到语言友好阈值                                   |
| `READING_OVERALL_INTERPRETATION_ADDED` | 完整总体解读     | +15 | 达到总体解读阈值且非重复                           |
| `READING_ALL_CARD_NOTES_ADDED`         | 全部单牌笔记     | +10 | 每张牌均达到单牌笔记阈值                           |
| `DAILY_FIRST_VALID_READING`            | 当日首条有效记录 |  +5 | 当日首条可获 XP 的 Reading                         |

单条 Reading 常规最高 **50 XP**。单张、三张、情境和自由牌桌同值；不按牌数加价。Topic、Question Template 和 orientation 只作上下文，不产生持续独立 XP。

| Follow-Up Event                   | Milestone      |  XP | 资格                                  |
| --------------------------------- | -------------- | --: | ------------------------------------- |
| `FOLLOW_UP_COMPLETED`             | 基础现实回顾   |  20 | `scheduled→completed` 且 outcome 合法 |
| `FOLLOW_UP_REFLECTION_ADDED`      | 现实反思       | +20 | 达到 Follow-Up 文本阈值               |
| `FOLLOW_UP_7_DAY_MATURITY`        | 至少间隔 7 天  |  +5 | trusted `reviewedAt-readingAt ≥ 7d`   |
| `FOLLOW_UP_30_DAY_MATURITY`       | 至少间隔 30 天 | +10 | 与 7 日奖励可叠加                     |
| `FOLLOW_UP_UNDERSTANDING_CHANGED` | 明确理解变化   | +10 | 用户主动选择且有新增有效观察          |

30 日完整 Follow-Up 最高 **65 XP**；所有 outcome 同值，不计算“准确率”。Dual reality reflection 只有在独立结构化内容单元存在时才可能额外结算，详见 9.2。

| Review / Knowledge / System Event   |  XP | V1.2 规则                                          |
| ----------------------------------- | --: | -------------------------------------------------- |
| `WEEKLY_REVIEW_COMPLETED`           |  40 | 周期唯一、summary 达阈值                           |
| `MONTHLY_REVIEW_COMPLETED`          |  80 | 周期唯一、summary 达阈值                           |
| `ANNUAL_REVIEW_COMPLETED`           | 150 | Future dependency；每年一次                        |
| `TAROT_CARD_FIRST_ENCOUNTER`        |   0 | 只计事实/收藏，避免收集刷 XP                       |
| `PERSONAL_CARD_MEANING_CREATED`     |  20 | Future dependency；与同内容 Dual definition 不叠加 |
| `PERSONAL_CARD_MEANING_UPDATED`     |   0 | 版本保留但不重复发 XP                              |
| `SUIT_REFLECTION_COMPLETED`         |  30 | Future dependency；每 suit 一次                    |
| `ONBOARDING_COMPLETED`              |  30 | 账户一次                                           |
| profile/privacy/sync/reminder/login |   0 | 不用 XP 诱导资料、权限、通知或回访                 |

### 15.2 文本资格与基础幂等

继续使用 Unicode normalization、trim、折叠重复空白、移除 placeholder，并计算：

```text
effectiveUnits = 2 × CJK字符数 + Latin字母/数字数
```

| 内容                                            | 最低规则（满足任一）                         |
| ----------------------------------------------- | -------------------------------------------- |
| 当下观察                                        | ≥8 CJK；或 ≥20 Latin；或 effectiveUnits ≥20  |
| 单牌笔记 / 单方向 definition                    | ≥6 CJK；或 ≥15 Latin；或 effectiveUnits ≥15  |
| 总体解读                                        | ≥15 CJK；或 ≥40 Latin；或 effectiveUnits ≥40 |
| Follow-Up / Dual comparison / Dual reality note | ≥12 CJK；或 ≥30 Latin；或 effectiveUnits ≥30 |
| definition revision `changeReason`              | ≥8 CJK；或 ≥20 Latin；或 effectiveUnits ≥20  |
| 周 Review                                       | ≥20 CJK；或 ≥50 Latin；或 effectiveUnits ≥50 |
| 月 Review                                       | ≥35 CJK；或 ≥90 Latin；或 effectiveUnits ≥90 |

文本不能只是牌名、标点、重复字符、模板提示或近期已奖励内容的 normalized exact duplicate。系统不使用 AI 判断观点质量，也不判断左右定义是否“正确”。

基础幂等仍采用稳定 source 与 milestone：

```text
v1.2:{userId}:{eventCode}:{sourceType}:{stableSourceId}:{milestone}
```

- 客户端只提交 candidate event，不提交 XP 数值或“内容有价值”的断言。
- 服务端在同一事务验证 source、rule version、幂等键、日/周/月 cap 和 suppression group。
- profile 是 append-only ledger 的可重建 aggregate，不以客户端 total 做多设备加法。
- 正常删除 source 保留 verified ledger；作弊或纠错使用引用原事件的 append-only reversal/adjustment。
- 离线先显示 provisional；云端 verified ledger 是多设备权威。
- import Reading 进入历史和 Insights，但不追溯 Personal XP，也不自动成为 natural dual encounter。

### 15.3 等级曲线与模拟

Level 50 仍为 50,960 XP。V1.1 的保守模型不因 Dual Track 改变目标曲线：

| 模型                     | 7 天     | 30 天       | 90 天        | 180 天       | 365 天       | 满级估计     |
| ------------------------ | -------- | ----------- | ------------ | ------------ | ------------ | ------------ |
| Casual（220/周）         | 250 / L2 | 973 / L4    | 2,859 / L9   | 5,687 / L14  | 11,501 / L21 | 约 4.45 年   |
| Regular（490/周）        | 520 / L3 | 2,130 / L7  | 6,330 / L15  | 12,630 / L23 | 25,580 / L34 | 约 2.0 年    |
| Highly Engaged（800/周） | 830 / L4 | 3,459 / L10 | 10,316 / L20 | 20,601 / L30 | 41,744 / L44 | 约 14.7 个月 |

| 阶段起点      |     XP | Regular 预计 | Highly Engaged 预计 |
| ------------- | -----: | -----------: | ------------------: |
| Lv5 倾听者    |  1,010 |     约 14 天 |             约 9 天 |
| Lv10 记录者   |  3,060 |     约 44 天 |            约 27 天 |
| Lv17 诠释者   |  7,400 |    约 106 天 |            约 65 天 |
| Lv25 映照者   | 14,460 |    约 207 天 |           约 127 天 |
| Lv34 同行者   | 25,080 |    约 358 天 |           约 219 天 |
| Lv43 星辰旅者 | 38,535 |    约 550 天 |           约 337 天 |
| Lv50          | 50,960 |    约 728 天 |           约 446 天 |

Dual Track 是可选增量，不能被计入“所有用户应有”的升级速度。上线模拟应分别报告 disabled 与 enabled cohort；不得用 enabled cohort 反向提高基础曲线。若按本提案的子上限运行，产品评审需在 8 周后依据 verified event 分布冻结未来 rule version，不追溯扣级。

### 15.4 V1 Reward Catalog 不被 Dual Track 替代

V1.1 的 50 级结构与资产预算继续有效：2 个主题、3 个牌背、2 个 reveal、8 个 title、10 个 badge、3 个 profile decoration；Moonlight 默认主题不计新增资产。关键解锁节点保持：

| Level | 既有主要奖励            | Dual 关系             |
| ----: | ----------------------- | --------------------- |
|     5 | Theme：静谧星空         | 无前置关系            |
|    10 | Card Back：星点         | 无前置关系            |
|    15 | Reveal：柔和流光        | 无前置关系            |
|    20 | Theme：古典书房         | 无前置关系            |
|    25 | Profile：四花色框       | 无前置关系            |
|    30 | Card Back：留白星图     | 无前置关系            |
|    35 | Reveal：月光揭示        | 无前置关系            |
|    40 | Moonlight 完整配色预设  | 无前置关系            |
|    45 | 星点 + 月光揭示纪念组合 | 无前置关系            |
|    50 | 复用既有资产的纪念套装  | Dual Track 不作为条件 |

其余等级继续发既有 badge/title/profile/阶段进度或组合样式，不承诺未制作的空壳资产。第 13 节 Dual rewards 是独立 achievement catalog，不能挤占普通用户的 Level reward；Phase 1B 最终美术总量必须由产品负责人批准。

### 15.5 Base Mission Pool 与 Dual 混合规则

原有 Daily/Weekly 候选池保留；Dual mission 是条件化候选，不替换用户获得同等任务奖励的机会。

| Daily ID              | 行为                            |  XP |
| --------------------- | ------------------------------- | --: |
| `D_REFLECT_ONE`       | 完成 1 条合格当下观察           |   4 |
| `D_FOLLOWUP_ONE`      | 完成 1 个 Follow-Up             |   6 |
| `D_OLD_NEW_NOTE`      | 给 ≥7 天旧 Reading 新增现实观察 |   5 |
| `D_CARD_NOTE`         | 完成一条单牌笔记                |   4 |
| `D_FULL_READING`      | 完成含总体解读的 Reading        |   5 |
| `D_COMPARE_TWO`       | 同模板两条 Reading 新增对照观察 |   5 |
| `D_REALITY_OUTCOME`   | 完成含 outcome 的现实回顾       |   4 |
| `D_REFRAME`           | 主动记录一次理解变化            |   5 |
| `D_TWO_TOPICS`        | 两个 Topic 各完成合格反思       |   4 |
| `D_SPREAD_REFLECTION` | 任一位置化 Reading 含总体观察   |   4 |
| `D_QUESTION_RETURN`   | 固定问题新 Reading 且有不同观察 |   5 |
| `D_REST_OPTION`       | 主动选择今天保留余白            |   0 |

| Weekly ID                     | 行为                                     |  XP |
| ----------------------------- | ---------------------------------------- | --: |
| `W_THREE_REFLECTION_DAYS`     | 3 个不同日各有合格反思                   |  10 |
| `W_TWO_FOLLOWUPS`             | 2 个不同 Follow-Up                       |  14 |
| `W_WEEKLY_REVIEW`             | 完成周 Review                            |  12 |
| `W_TWO_TOPICS_REFLECTED`      | 2 个 Topic 各有反思                      |   7 |
| `W_TWO_SPREAD_GUIDES`         | 2 个 guide 各有观察                      |   7 |
| `W_DEEP_READING`              | 1 条 Reading 达全部深度 milestone        |  10 |
| `W_30_DAY_FOLLOWUP`           | 完成 ≥30 天 Follow-Up                    |  12 |
| `W_FOUR_DISTINCT_CARDS_NOTED` | 4 张不同牌各有新笔记                     |   8 |
| `W_TEMPLATE_COMPARISON`       | 同模板历史对照 + 新观察                  |   8 |
| `W_DUAL_NOTE`                 | 已有 left/right 记录新增对应观察         |   8 |
| `W_THREE_OLD_NOTES`           | 3 条旧 Reading 新增现实注释              |  10 |
| `W_GENTLE_WEEK`               | 1 条 Reading + 1 个 Follow-Up reflection |   8 |

通用规则仍是：查看/停留/标记已阅不算完成；Topic/tag/template 只是多样性条件；每天 3 个候选至少 1 个不要求新抽牌；同一 source 最多结算 1 个 daily 与 1 个 weekly milestone。Dual enabled 用户的 3 个 daily 候选最多含 1 个 Dual，weekly rotation 最多含 1 个 Dual；disabled/tutorial 用户使用等值 reflection 候选替代。

### 15.6 Spread Guide、Community 与长期 Roadmap

- **Spread Guide Unlock** 只解锁官方模板、布局、牌位说明、引导问题和结构化回顾，不限制自由牌桌或手动录入。
- Personal Card Meaning Dictionary、Reading collections、年度 Journey、Seasonal decorations、Advanced Insights presentation 与 Creator 能力继续是 Future dependency，不绑定已发布 Level 的空壳承诺。
- Community CRP 保持独立账本、无公开全站榜单、无负分展示和违规 reversal；其数值必须在 community domain、moderation 与隐私模型存在后另行模拟。
- 不参与 Community、不启用 Dual、不公开私人研究，均不妨碍 Personal Level 50。

## 16. Data Model integration（Future schema proposal）

本节是未来 schema/repository 评审输入，不是本次 migration。目标是最少事实表、完整版本历史和 owner-only 权限，而不是机械创建需求中列出的每一张候选表。

### 16.1 六个候选结构的取舍

| 候选结构                                        | 建议                                                                 | 理由                                                                      |
| ----------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `dual_reversal_preferences`                     | **不单独建表**；优先扩展既有 `user_preferences`                      | 生命周期与其他用户偏好相同；减少 1:1 表                                   |
| `personal_card_orientation_profiles`            | **新建事实/状态表**                                                  | 一行表示 user + card + canonical orientation 的个人研究状态               |
| `personal_card_orientation_definitions`         | **不建物理表**；用最新 definition version 或 `security_invoker` view | 避免 current 与 history 双写漂移                                          |
| `personal_card_orientation_definition_versions` | **新建 append-only 表**                                              | 定义与修订历史的唯一事实来源                                              |
| `dual_reversal_comparisons`                     | **新建表**                                                           | 保存用户主动写下的全局或 Topic-scoped 左右对照                            |
| `dual_reversal_track_progress`                  | **先派生；必要时建 server-owned cache**                              | stage 可由偏好、profiles、versions、comparisons、Follow-Up 与 ledger 重建 |

因此 Phase 2 的最小持久化方案是：扩展 1 个既有 preference model，新增 3 张 source-of-truth 表；只有真实性能证据出现后才增加 track cache。

### 16.2 Preference model

建议在既有 `user_preferences` 中增加逻辑字段：

```text
dualReversalMode
dualReversalTutorialCompletedAt
dualReversalEnabledDrawModes
dualReversalStatisticsEnabled
dualReversalGrowthPromptsEnabled
dualReversalSettingsVersion
```

- `dualReversalMode` 只允许 `disabled|tutorial|enabled`。
- draw mode list 只允许稳定 mode ID；关闭后保留列表，便于恢复，但新 Draw 默认回到 ordinary standard。
- tutorial completion 与 mode 分开；关闭功能不抹去已完成教学事实。
- preference 不改写 Reading 或 DrawSession 的历史配置。
- 普通偏好可由 owner 更新；涉及 tutorial XP 的完成时间必须由受控 coordinator/RPC 验证。

### 16.3 `personal_card_orientation_profiles`

推荐关键字段：

```text
id uuid PK
user_id uuid NOT NULL
tarot_card_id smallint NOT NULL
orientation_key text NOT NULL
definition_status text NOT NULL
instant_impression text NULL
study_note text NULL
first_studied_at timestamptz NULL
last_studied_at timestamptz NULL
study_count integer NOT NULL DEFAULT 0
current_definition_version integer NOT NULL DEFAULT 0
last_revised_at timestamptz NULL
row_version bigint NOT NULL DEFAULT 0
created_at timestamptz NOT NULL
updated_at timestamptz NOT NULL
```

Canonical `orientation_key`：

```text
upright
reversed
reversed_left
reversed_right
```

这避免 PostgreSQL nullable unique 的歧义。Repository 映射回现有二层 domain：

```text
upright        -> upright + null
reversed       -> reversed + null
reversed_left  -> reversed + left
reversed_right -> reversed + right
```

关键约束：`UNIQUE(user_id, tarot_card_id, orientation_key)`、`UNIQUE(id,user_id)`、非负 counts/version，以及合法 definition status check。单方向 `definition_status` 只表达 `none|draft|provisional|active`，其中 active 也不表示正确。card-level `DualReversalCardKnowledgeStatus` 由左右两行、versions、comparisons 和 Follow-Up 派生；新修订可令 pair status 从 `stable_definition` 回到 `revised`。

需求中的以下字段属于 read model，但优先实时/服务端聚合，不复制成 profile 数组：

| Read-model field                         | 来源                                                                   |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| `encounterCount`                         | 当前有效 ReadingCard occurrence；同 Reading 重复牌可按 occurrence 计数 |
| `firstEncounterAt` / `lastEncounterAt`   | 关联 Reading 的 `readingAt`                                            |
| `readingIds`                             | 去重后的关联 Reading 查询结果                                          |
| `followUpCount`                          | 含该状态且 completed Follow-Up 的去重 Reading 数                       |
| `personalDefinition`                     | 最新 definition version                                                |
| `definitionStatus` / `definitionVersion` | 最新 version + profile                                                 |
| `lastRevisedAt`                          | 第二版以后最近修订                                                     |
| `topicDistribution`                      | Reading 与 Topic 动态聚合                                              |

这样 Reading 编辑/删除后统计会自然修正。性能不足时才建立可重建 projection，不能把 cache 当 XP 或 achievement 的唯一事实来源。

### 16.4 `personal_card_orientation_definition_versions`

推荐字段：

```text
id uuid PK
user_id uuid NOT NULL
profile_id uuid NOT NULL
version integer NOT NULL
created_at timestamptz NOT NULL
definition_text text NOT NULL
status text NOT NULL
source_type text NOT NULL
source_id uuid NULL
topic_id uuid NULL
change_reason text NULL
previous_version_id uuid NULL
client_mutation_id uuid NOT NULL
definition_hash text NOT NULL
```

必须保留需求指定的 `createdAt`、`definitionText`、`status`、`sourceType`、`sourceId`、`changeReason` 与 `previousVersionId`。约束：

- `UNIQUE(profile_id,version)` 与 `UNIQUE(user_id,client_mutation_id)`。
- 复合 owner FK：`(profile_id,user_id) -> profiles(id,user_id)`。
- previous version 必须属于同一 user/profile；正常路径形成线性链。
- version `status` 使用 definition lifecycle：`draft|provisional|active|superseded`；它不等同于 card-level knowledge status，也不表示正确性。
- `source_type` 至少支持 `manual|reading|follow_up|direction_lab|dual_reversal_comparison|review`。
- 正常业务只 INSERT，不 UPDATE/DELETE；当前定义来自最新有效 version。
- 多态 `source_id` 由 RPC 校验 ownership，不能假装数据库 FK 已覆盖所有 source table。
- Reading 删除后 version 保留，source UI 显示“原记录已删除”；不复制问题、人物或 Follow-Up 正文进版本表。
- Topic 删除使用 `SET NULL`，不删除定义历史。
- 用户显式清除个人定义历史和账户删除是隐私 purge，优先于业务 append-only。

### 16.5 `dual_reversal_comparisons`

推荐字段：

```text
id uuid PK
user_id uuid NOT NULL
tarot_card_id smallint NOT NULL
topic_id uuid NULL
left_observation text NULL
right_observation text NULL
comparison_note text NULL
status draft|completed
first_completed_at timestamptz NULL
content_hash text NULL
row_version bigint NOT NULL DEFAULT 0
last_client_mutation_id uuid NULL
created_at timestamptz NOT NULL
updated_at timestamptz NOT NULL
```

全局 comparison 使用 partial unique `(user_id,tarot_card_id) WHERE topic_id IS NULL`；Topic comparison 使用 `(user_id,tarot_card_id,topic_id) WHERE topic_id IS NOT NULL`。次数、问题、初始解读、Follow-Up、outcome 和 Topic 分布继续从 Reading/Follow-Up 聚合，不复制到 comparison 行。无论建立多少 Topic comparison，每张牌的首次 comparison XP 仍只发一次。

### 16.6 `dual_reversal_track_progress` 作为可选 cache

Phase 1/2 默认由下列事实派生：tutorial/pref、Reading facts、profiles/versions、comparisons、Follow-Up 与 progression ledger。若性能测试要求 cache，最小字段为：

```text
user_id PK
highest_stage_unlocked smallint
metrics_snapshot jsonb
rules_version text
recalculated_at timestamptz
```

它必须 server-owned、客户端只读、可完全重建。当前覆盖率可因 Reading 删除下降；已经验证的最高 stage、XP 与奖励沿用 ledger/grant，不回退。

### 16.7 Natural encounter、旧存储与删除语义

当前有三个不可忽略的约束：

1. Supabase `reading_cards` / `draw_session_cards` 仍以 `reversal_expression=underexpressed|overexpressed` 兼容存储 left/right。Phase 1A 只能把它视为旧编码，UI/统计/XP 绝不能恢复“能量不足/过度”语义。Future migration 将列和值改为 `reversal_variant=left|right`，必须另行批准并同时更新 RPC/mapper/tests；**本次不创建 migration**。
2. Import 与实体手录当前都可能进入 `source=manual`，Reading 又没有可信 `recordOrigin`，所以 Phase 1A 只有“app draw + linked dual DrawSession”可验证为 natural。import 可进入统计但不触发 natural achievement/XP；manual physical 与 legacy unknown 在增加可信 origin 前只显示“已记录”。
3. 当前 Reading 更新可能 delete/reinsert ReadingCard，`reading_card.id` 不是永久身份。任何 milestone/idempotency key 都不能依赖它；使用 user/global、card ID 或稳定 `readingId+cardId+orientationKey`。

删除 Reading 后，动态 encounter/readingIds/follow-up/topic 聚合减少；definition versions、Lab study、comparisons、verified ledger、achievement 和 stage high-water 保留。账户删除则通过 `user_id -> auth.users(id) ON DELETE CASCADE` 清除所有私人偏好、profiles、versions、comparisons、cache、ledger 与 unlocks。

### 16.8 RLS、写权限与 Repository

所有 exposed table 必须启用 RLS；`anon` 无权访问，authenticated owner policy 使用：

```sql
using ((select auth.uid()) = user_id)
```

需要 UPDATE 的 policy 同时提供同样的 `USING` 与 `WITH CHECK`；table grants 与 RLS 分开最小化。聚合 view 使用 `security_invoker`，或只通过受控 repository/RPC 暴露。

| 数据                                         | 客户端直写 | 建议                                |
| -------------------------------------------- | ---------- | ----------------------------------- |
| 普通显示/统计偏好                            | 可         | owner RLS + validation              |
| tutorial completion + XP                     | 否         | coordinator/RPC 原子验证            |
| profile 派生 counts/status                   | 否         | server projection/read model        |
| Direction Lab note                           | 窄入口     | repository + validation             |
| definition version                           | 否         | append RPC + optimistic concurrency |
| comparison                                   | 窄入口     | RPC/repository + CAS                |
| track cache / progression ledger / XP amount | 否         | server-owned                        |

若未来使用 `SECURITY DEFINER`，必须 `set search_path=''`、使用 schema-qualified object、函数内验证 `auth.uid()`、不接收 `userId`、撤销 `PUBLIC/anon EXECUTE`、只 grant authenticated 且禁止动态 SQL；service secret 永不进入 Expo client。

未来新增 `DualReversalRepository`（Local/Supabase parity），负责 preference、profile read model、study note、append definition、comparison、versions 与 metrics。`ReadingRepository` / `FollowUpRepository` 保存成功后由 application coordinator 验证 progression facts；不得把 XP side effect 塞进 repository。

## 17. Progression Event Architecture integration

```ts
type ProgressionSourceType =
  | 'reading'
  | 'follow_up'
  | 'review'
  | 'card_meaning'
  | 'dual_reversal_definition'
  | 'dual_reversal_comparison'
  | 'direction_lab'
  | 'mission'
  | 'achievement';
```

Ledger 建议同时保存 `sourceType`、`sourceId`、`milestoneKey`、unique `idempotencyKey`、`contentFingerprint`、`ruleVersion`、`clientEventId` 与最小非敏感 metadata。`clientEventId` 只用于网络重试；最终 key 必须由可信服务端生成。

| Event                     | 稳定 idempotency key                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| Tutorial                  | `v1.2:{userId}:DUAL_REVERSAL_TUTORIAL_COMPLETED:account`                                                |
| First left                | `v1.2:{userId}:DUAL_REVERSAL_FIRST_LEFT_ENCOUNTER:global`                                               |
| First right               | `v1.2:{userId}:DUAL_REVERSAL_FIRST_RIGHT_ENCOUNTER:global`                                              |
| First pair                | `v1.2:{userId}:DUAL_REVERSAL_FIRST_PAIR_COMPLETED:global`                                               |
| First comparison for card | `v1.2:{userId}:DUAL_REVERSAL_COMPARISON_NOTE_COMPLETED:{cardId}`                                        |
| Reality reflection        | `v1.2:{userId}:DUAL_REVERSAL_REALITY_REFLECTION_COMPLETED:{followUpId}`                                 |
| Definition create         | `v1.2:{userId}:DUAL_REVERSAL_DEFINITION_CREATED:{cardId}:{orientationKey}`                              |
| First reality revision    | `v1.2:{userId}:DUAL_REVERSAL_DEFINITION_REVISED:{cardId}:{orientationKey}:first_reality_based_revision` |
| Monthly review            | `v1.2:{userId}:DUAL_REVERSAL_MONTHLY_REVIEW_COMPLETED:{YYYY-MM}`                                        |
| Three pairs               | `v1.2:{userId}:DUAL_REVERSAL_THREE_PAIRS_COMPLETED:global`                                              |
| Ten comparisons           | `v1.2:{userId}:DUAL_REVERSAL_TEN_COMPARISONS_COMPLETED:global`                                          |
| Major map                 | `v1.2:{userId}:DUAL_REVERSAL_MAJOR_ARCANA_MAP_COMPLETED:global`                                         |
| Full lexicon              | `v1.2:{userId}:DUAL_REVERSAL_FULL_LEXICON_COMPLETED:global`                                             |

First left/right 的审计 metadata 可引用 Reading ID，但 key 是 global；comparison/definition key 用 card/orientation milestone，不用可删除重建的 row ID。一个 Follow-Up 即使涉及多张左右旋牌，也最多发一次 Dual reality XP，但可为多个 profile 增加 Reflected 事实。

服务端只验证：文本达到确定性门槛、source 存在且属于用户、首次达到 milestone、时间/cap、前后 hash 有实质变化和 suppression 规则。它不能验证“定义很有价值”、内容正确、现实应验或某方向更积极。

### 17.1 多设备 definition revision

定义正文不得 last-write-wins。客户端提交 `profileId`、`expectedRowVersion`、`expectedDefinitionVersion`、`clientMutationId`、正文、source 和 changeReason。服务端在短事务中锁 profile、检查 base version、追加 version、更新 profile pointer/status、生成 candidate event。

- `UNIQUE(user_id,client_mutation_id)` 让离线重试返回原结果。
- base 未变化才自动提交；已变化返回 conflict。
- 散文文本不自动 merge；保留本地草稿并显示云端/本地版本，由用户选择重新应用为下一版。
- comparison 使用同样的 `rowVersion` CAS。

## 18. Statistics & Reports integration

未来 Dual 统计只描述用户已有事实：

| 指标                      | 定义/分母                                                                   |
| ------------------------- | --------------------------------------------------------------------------- |
| left/right 总次数         | 当前筛选范围内有效 ReadingCard occurrence；普通 reversed 排除               |
| 每张牌 left/right 次数    | card + exact orientation key                                                |
| Topic 分布                | exact card+direction 在各 Topic 的 occurrence；删除 Topic 后重算            |
| Follow-Up completion rate | 已到期 directional Reading 中 completed Follow-Up 数 / 已到期数；未到期排除 |
| definition revision 次数  | append-only version 中 version > 1 的数量；普通保存不算                     |
| 暂定定义覆盖率            | 同时显示全牌组分母（156 sides）和已探索 sides 分母                          |
| 现实回顾覆盖率            | 至少一次 Reflected 的 explored profile / explored profile                   |
| natural vs studied        | Experienced 和 Studied 分开计数，不合成“能力分”                             |
| 花色覆盖                  | 每花色 left/right observed/defined/revised 的事实比例                       |
| 大阿卡那地图              | 22 张 × left/right = 44 个方向状态，不含 ordinary reversed                  |
| 定义随时间变化            | definition version timeline、changeReason 与 source availability            |

报告只可说“在你的已有记录中，太阳左旋出现 4 次，其中 2 次有现实回顾”。禁止输出“左旋更准确”“右旋更积极”“某方向更容易应验”“你的双向逆位能力更强”或 cohort 排名。系统不把 ordinary `reversed+null` 强行分配到 left/right，也不把 missing Follow-Up 当作 did-not-happen。

## 19. Privacy & Ethics integration

- 左右旋个人定义、Direction Lab 笔记、comparison 和版本历史默认 private、owner-only。
- 用户必须显式创建 share snapshot 才进入社区；分享与原私密 source 分离，并可隐藏问题、人物、日期、Topic、Follow-Up、outcome 和 Reading 链接。
- 私密研究获得的 Personal XP 不低于公开分享；公开状态本身为 0 Personal XP。
- 用户可关闭 Dual stats/growth prompts；关闭不删除历史，也不产生惩罚、断签或新 Dual mission。
- telemetry 不采集定义正文用于心理画像，不按 left/right 使用频率推断人格、疾病、关系事实或第三方真实想法。
- App 不把方向固定绑定吉凶、病理、性格或准确率，不鼓励为收集 pair 反复问同一问题。
- 社区 snapshot 固定带个人经验免责声明；热度、共识和举报以外的互动都不能证明解释权威。
- account deletion 级联清除私人数据；社区内容按用户已批准的撤回/匿名化策略另行处理，不得继续反向关联私人档案。
- Direction Lab 和 Reading 使用完全隔离的写入路径；Lab 不得通过客户端字段伪装成 natural encounter。

## 20. Implementation Phases

只有 Phase 1A 与 Phase 1B 属于当前建议的 **V1 deliverable boundary**；Phase 2–4 全部是 Future dependency。每个 Phase 都需单独产品批准、技术设计、migration/RLS 审查与发布验收，不能因出现在本文中被视为已经承诺。

### 20.1 Phase 1A — Progression Infrastructure + Dual Facts

| 项目                | 内容                                                                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 范围                | V1.1 Progression ledger/profile/rule version；Dual preference；按 draw mode 启用；读取现有 Reading/DrawSession exact left/right；tutorial；FIRST_LEFT/RIGHT 与 basic pair facts         |
| 依赖                | 已有 Reading、ReadingCard、DrawSession、Follow-Up、Auth、local/Supabase repositories；可信服务端时间                                                                                    |
| 数据库变化          | 未来扩展 preference；建立基础 progression ledger/profile/RPC/RLS。**不改 Reading 数据，不创建 Direction Lab/profile/definition/comparison 表；旧 orientation storage 暂由 mapper 兼容** |
| Repository          | `ProgressionRepository` local/Supabase parity；复用 preference repository；coordinator 在 source 保存成功后验证，不改 Reading repository 语义                                           |
| UI 页面             | 基础 Progress 页面；Dual setting/非强制 tutorial；verified/provisional XP 解释；可隐藏成长 UI                                                                                           |
| Dual XP/Achievement | tutorial 10；FIRST_LEFT/RIGHT 0；FIRST_PAIR/初始事实按批准后的 suppression 结算；随机 occurrence 0                                                                                      |
| 测试                | level curve、package cap、ledger 幂等、offline/multi-device、owner RLS、mode matrix、旧 storage mapper、existing Reading 不被改写、disabled 行为                                        |
| 风险                | `underexpressed/overexpressed` 旧存储语义；manual/import 无法可信区分；ReadingCard ID 不稳定；Dual 事件与基础 package 双发                                                              |
| 不包含              | Direction Lab、definition history、完整 profile、missions、full track、Community、creator、自定义方向牌阵                                                                               |

### 20.2 Phase 1B — First Rewards + Basic Dual Archive

| 项目               | 内容                                                                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 范围               | V1.1 first reward inventory/equip；四状态基础只读档案；left/right counts/Reading links/Topic 简单统计；首组人工 comparison；少量 badge/title/reward |
| 依赖               | Phase 1A 稳定至少一个发布周期；准确 orientation read model；产品批准 Phase 1B 资产预算                                                              |
| 数据库变化         | 未来增加 `personal_card_orientation_profiles` 与 `dual_reversal_comparisons`；reward catalog/unlocks/equipped slots；不增加 definition versions     |
| Repository         | 初版 `DualReversalRepository` 读取 profile、保存 comparison；Local/Supabase parity；Progression coordinator 负责 first comparison settlement        |
| UI 页面            | 四方向档案基础视图、首组左右对照、simple stats、inventory/preview/equip；无资产不得显示空壳                                                         |
| 建议实际 Dual 奖励 | 最多基础 Dual badges、3 个 titles，以及 `dual_back_crossing_paths`、`dual_comparison_cover`、`dual_profile_frame`；最终数量需从 V1.1 总预算中批准   |
| 测试               | 四状态聚合、普通 reversed 排除、comparison 幂等、删除 Reading 后重算、reward ownership/equip、Reduced Motion、Web/iOS/Android smoke                 |
| 风险               | 新 Dual assets 挤占既有 Phase 1B 预算；聚合查询性能；把 studied/experienced 混为一谈                                                                |
| 不包含             | Direction Lab、append-only definition history、stable status、完整五阶段、Dual missions、monthly dual review、Community                             |

### 20.3 Phase 2 — Direction Lab + Complete Exploration Track

| 项目       | 内容                                                                                                                                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 范围       | Direction Lab；定义版本历史；完整 status/stage；全部 Dual missions/achievements；长期统计报告与余下个人视觉 rewards                                                                 |
| 依赖       | Phase 1B profile/comparison 稳定；offline conflict UX；文本资格与 suppression telemetry；批准的 source origin 语义                                                                  |
| 数据库变化 | `personal_card_orientation_definition_versions`；profile version/CAS 字段；必要时 server-owned track cache；可能的 `recordOrigin` 与 native `reversal_variant` migration 需单独批准 |
| Repository | 完整 DualReversalRepository；append version RPC；comparison CAS；profile/report read model；Progression coordinator 全事件矩阵                                                      |
| UI 页面    | Direction Lab、四状态 profile、definition timeline、pair comparison、track map、missions、reports、privacy/prompt settings                                                          |
| 测试       | Lab/Reading 写入隔离、version append/CAS、offline conflicts、Stage 多路径、suppression、caps、all mission eligibility、statistics denominators                                      |
| 风险       | 长文本多设备冲突；把 stage 表述为能力；重复内容刷 XP；156-side completion pressure；migration backward compatibility                                                                |
| 不包含     | Community sharing、热度/排名、AI 权威解释、自定义方向牌阵、创作者发布工具                                                                                                           |

### 20.4 Phase 3 — Community Sharing

| 项目       | 内容                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| 范围       | 显式去标识化 share snapshot；八类 Dual community content；四种非权威互动；撤回、moderation、reporting 与独立 CRP |
| 依赖       | 成熟 privacy model、moderation、consent/audit、community domain、abuse response、legal review                    |
| 数据库变化 | 独立 share snapshot/community tables；不得直接开放私人 profile/version；字段级 consent 与撤回状态                |
| Repository | Community repository 与 Personal/Dual repository 分离；分享只读取用户显式选择的 snapshot                         |
| UI 页面    | share review/redaction、community feed/detail、四种互动、举报/撤回、固定免责声明                                 |
| 测试       | 默认私密、字段脱敏、撤回、跨用户 RLS、moderation、删除账户、CRP/Personal XP 分账、无热度权威文案                 |
| 风险       | 私密 source 泄漏、去标识失败、群体共识被误读为标准、骚扰第三方、社区热度诱导                                     |
| 不包含     | 准确率榜单、专家认证、Personal XP 分享加成、community 定义自动写回私人档案                                       |

### 20.5 Phase 4 — Directional Creator Tools

| 项目       | 内容                                                                                   |
| ---------- | -------------------------------------------------------------------------------------- |
| 范围       | 自定义方向牌阵、方法文章、创作者版本与可选模板分享                                     |
| 依赖       | 自定义 Spread domain/editor、versioning、licensing、moderation、Community Phase 3 稳定 |
| 数据库变化 | 独立 creator/spread version model；不修改历史 Reading/DrawSession；不赋予概率字段写权  |
| Repository | Creator/Spread repository；安装模板与执行 Reading 分离                                 |
| UI 页面    | direction spread editor、method composer、version history、preview/install             |
| 测试       | template versioning、ownership、install snapshot、历史兼容、moderation、随机性不变     |
| 风险       | 伪科学权威化、模板安全与版权、过度复杂、创作者内容误导                                 |
| 不包含     | 概率优势、付费抽牌优势、准确率排名、App 认可的标准左右牌义                             |

## 21. Future Test Matrix

以下测试是未来实现验收清单；本次文档任务不新增测试代码。

1. 未开启 dual reversal 的用户不会收到左右旋任务。
2. 开启后不会修改已有 Reading、ReadingCard 或 DrawSession 数据。
3. 抽到 left/right 本身不会重复发 XP，first facts 为 0 XP 或仅结算已批准的一次性 milestone。
4. 同一张牌同一方向 definition 只发一次 create XP。
5. 普通编辑、标点变化、相同 hash 与恢复旧版本不重复发 XP。
6. 满足 source、时间、diff、changeReason 后只发一次 qualifying revision XP。
7. Direction Lab 不创建 Reading 或 DrawSession。
8. Direction Lab 不计 natural encounter 或每日抽牌次数。
9. Experienced 与 Studied 正确区分并可同时存在。
10. 删除 Reading 不删除个人 definition history、verified XP 或 stage high-water。
11. 私密 definition 默认不进入社区，也不会被 public view/RPC 泄漏。
12. 左右 comparison 不自动生成标准结论、准确率或正负判断。
13. orientation 与当前 `orientation + reversalVariant` domain 兼容，四状态唯一约束正确。
14. ordinary `reversed+null` 不被错误归为 left/right。
15. left=-30°、right=+30°、ordinary reversed=180° 与现有显示定义一致；视觉角度不是唯一无障碍信息。
16. 离线 candidate event 重试幂等，verified total 不做客户端加法合并。
17. 多设备 definition revision 冲突不会 last-write-wins；本地草稿保留。
18. Reduced Motion 下流光/粒子降级且不影响 orientation 或交互。
19. 关闭 dual 后历史仍可查看，已解锁 reward 保留，未完成 Dual mission 无惩罚移除。
20. 关闭后新抽牌回到 ordinary standard；已有 per-session snapshot 不变。
21. per-mode `single/three/table/open` preference matrix 正确，tutorial 不隐式开启真实 Draw。
22. 固定 RandomProvider 回归：开启 Dual 不改变 card selection probability，只按现有配置记录方向。
23. 六种 knowledge status 可前进、按定义回退；历史 milestone/XP high-water 不回退。
24. Reading/Follow-Up/definition/comparison/mission 共享文本时 suppression 正确，只结算允许的最高内容事件。
25. app draw、实体手录、Import、legacy unknown 和 Direction Lab 的 natural/studied 分类正确。
26. 两用户 RLS 隔离；anon 无访问；security-invoker view 不绕过 policy。
27. 账户删除级联私人数据；Reading/Topic 删除只使 source unavailable，不级联 definition history。
28. Stage 5 多路径等价，不要求 156 个方向全部自然遇见，且不影响 Level 50。
29. disabled 用户历史可见，但不收到新 Dual mission/growth prompt；stats setting 关闭后不展示自动总结。
30. 报告只描述事实，不生成标准牌义、准确率、积极度、能力分或第三方思想断言。
31. 旧 `underexpressed/overexpressed` storage 经 mapper 只映射为 left/right，不泄漏旧能量语义。
32. Reading update delete/reinsert card rows 后不会重发 milestone，永久 key 不依赖 `reading_card.id`。
33. 一个 Follow-Up 涉及多张左右旋牌时，多个 profile 获得 Reflected 事实，但 Dual XP 最多结算一次。
34. achievement 与 long-term mission 同一 settlement group 只发一份 XP，但 Badge/Title 正常解锁。
35. privacy purge 可删除 definition history；普通业务删除不能伪装成 purge，也不能借重建刷 XP。

## 22. Dual Reversal Frozen Decisions

本节所有条目状态均为 **PROPOSED — awaiting product owner approval**；“Frozen”表示建议在实现规格前冻结，而不是已经批准。

1. Dual Track 自愿、可按模式开启、可随时关闭；关闭后保留历史。
2. Dual 不影响 upright/reversed、left/right、牌面选择或牌阵结果概率。
3. App 不规定 left/right 的统一牌义、吉凶、正确答案或能力等级。
4. natural left/right occurrence、打开档案、查看统计、旋转牌面和重复编辑本身为 0 XP。
5. Direction Lab 不是 Reading，不建 DrawSession，不进入自然 encounter 或 Reading XP。
6. Personal Level 50、核心功能、基础任务和普通奖励不要求启用或完成 Dual Track。
7. ordinary reversed 始终是独立四状态之一，不能归入 left/right。
8. 同一内容单元不重复结算 Reading/Follow-Up/Dual definition/comparison XP；取明确规则允许的最高项。
9. 私密 definition/Lab note 默认 owner-only；公开分享必须显式 snapshot 与字段级脱敏。
10. disabled/tutorial 用户不收到 Dual missions，且获得等值普通 reflection 候选机会。
11. `stable_definition` 是“当前可用”，不是最终答案；用户继续修订不受惩罚。
12. 已验证 milestone、XP 与永久 reward 不因关闭 Dual 或正常删除 Reading 被收回。

## 23. Dual Reversal Decisions Requiring Product Owner Approval

以下每项均为 **PROPOSED — awaiting product owner approval**：

1. 第 9 节全部 XP 数值，以及可重复 Dual XP `40/周、100/月` 子上限。
2. Achievement 免日 cap 是否需要额外单周保护；Stage/Mission/Achievement 同事实的补差或完全 suppression 策略。
3. tutorial 10 XP、FIRST_PAIR 10 XP，以及 FIRST_PAIR 是否必须左右两侧均为 natural 并包含 comparison note。
4. manual physical 是否算 natural；在可信 `recordOrigin` 出现前是否只允许 app draw + linked DrawSession。
5. knowledge status 的自动/用户控制边界，以及 `stable_definition` 的 2 次 encounter、2 次 Follow-Up、30 天门槛与回退。
6. 五个 Stage 的具体条件，尤其 Stage 5 的 4-of-5 多路径、natural/Lab/Follow-Up/definition 数量。
7. qualifying revision 的最低 7 日间隔、diff threshold、changeReason 与真实 source 要求。
8. Dual mission 在 daily/weekly 候选池中的最大比例，以及 disabled 用户的等值替代算法。
9. Major Map、Full Lexicon 的 natural pair、Follow-Up、revision 与时间跨度门槛。
10. Phase 1B 实际 badge/title/reward 数量，是增加 V1.1 资产预算还是替换同类既有资产。
11. 删除 Reading 后动态 encounter 统计减少但 definition/stage/XP 保留的产品文案。
12. 是否以及何时把旧 `reversal_expression + underexpressed/overexpressed` 迁移为 native `reversal_variant + left/right`。
13. 是否新增 `recordOrigin` 以可靠区分 app draw、manual physical、import 与 legacy unknown。
14. 是否需要物理 `dual_reversal_track_progress` cache；没有真实性能证据前建议不建。
15. Direction Lab 首版是否包含 upright/ordinary reversed definitions，还是只交付 left/right 对照写作。
16. Community CRP 数值、share snapshot 保留/撤回/匿名化、字段脱敏、moderation 和账户删除策略。
17. definition history 的用户级 purge UX、审计保留与已发 XP 处理。
18. 自定义方向牌阵进入 Phase 4 的内容审核、版本与版权规则。

## 24. Differences from V1.1

| 主题               | V1.1                                               | V1.2 修订                                                                                  |
| ------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 核心成长           | 50 Level、Reading/Follow-Up/Review                 | 完整保留；Dual 仅为可选探索 track                                                          |
| Reversal knowledge | `DUAL_REVERSAL_NOTES_COMPLETED` 作为 Future 单事件 | 四状态 profile、六种 knowledge status、五 Stage 与多路径                                   |
| XP                 | 未定义 left/right 完整事件与 suppression           | 13 个稳定 event、明确数值、随机 occurrence 0、内容去重与 Dual 子上限                       |
| Missions           | 1 个泛化 `W_DUAL_NOTE` 候选                        | 新增 3 daily、4 weekly、6 long-term；仅 enabled 投放                                       |
| Achievements       | 结构保留、具体 Dual catalog 未冻结                 | 新增 12 个提案 achievement，含 2 个 hidden reflection achievements                         |
| Titles             | V1.1 8 个基础 titles                               | 另增 10 个探索型 title，避免“大师/权威”语言                                                |
| Rewards            | V1.1 Level catalog 与 future roadmap               | 另增 9 个 Dual visual rewards；Level min 1、stage gated、randomness=false                  |
| Personal meanings  | Future dependency                                  | 四方向档案、append-only definition versions、Topic context 与 evidence 分类                |
| Direction Lab      | 无                                                 | Phase 2 非占卜研究工具；不建 Reading/encounter                                             |
| Event sources      | Reading/Follow-Up/Review 为主                      | 增加 definition/comparison/direction_lab/mission/achievement sources 与稳定 keys           |
| Data model         | Progression infrastructure proposal                | 最小 3 个 Dual source-of-truth tables + preference extension + optional cache              |
| Statistics         | 基础事实统计                                       | 增加 exact left/right、coverage、revision、natural/studied、Major map；禁止准确率结论      |
| Privacy            | 私密 XP 不低于公开                                 | 增加 definition/Lab owner-only、share snapshot、字段脱敏与心理画像禁区                     |
| Phases             | 1A infrastructure、1B rewards                      | Dual facts 进入 1A；basic archive 进入 1B；Lab/full track/community/creator 分别进入 2/3/4 |

## 25. Implementation Gate

V1.2 完成后仍只进入人工产品评审。实施前必须逐项批准：事件矩阵与数值、natural origin、schema 最小方案、migration/RLS/RPC、offline conflict、suppression、Phase 1B 美术预算、用户可见伦理文案和 telemetry privacy。

本次文档修订：

- 不修改业务代码或 production logic。
- 不创建或部署数据库 migration。
- 不实现 UI、Repository、Progression coordinator、Direction Lab 或 Community。
- 不改变当前 Reading、Follow-Up、Draw Engine、Statistics 或现有 left/right 数据。
- 不把任何 **PROPOSED** 项视为已获产品负责人批准。
