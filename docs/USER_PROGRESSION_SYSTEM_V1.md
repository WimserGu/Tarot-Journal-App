# Tarot Journal App 用户成长、XP、奖励与解锁系统 V1（设计稿）

> 状态：**PROPOSED — awaiting product owner approval**
> 文档版本：1.0；建议 `progressionVersion = 1`
> 本文仅为产品、数值、权限与技术设计，不代表已冻结或已实现。

## 1. 目标、边界与核心循环

成长系统要解决的不是“让用户抽更多牌”，而是让长期记录的价值可见：新用户快速理解“记录—反思—回顾”，中期用户看见知识与历史积累，长期用户通过收藏、年度旅程和贡献持续获得目标。它主要改善首次价值不明显、Follow-Up 动机不足、长期内容缺少阶段反馈和非连续使用缺少回归感等留存问题。

核心循环为：**提出问题 → 完成有效 Reading → 写下当下观察 → 在现实中等待 → 完成 Follow-Up → 周期回顾 → 形成个人牌义/模式 → 解锁表达方式 → 再次记录**。奖励权重按“回顾 > 深度反思 > 有效记录 > 单纯抽牌”排列。

不可逾越的边界：

- 等级表示记录与反思历程，不表示预测准确率、灵性、权威或第三方真实想法。
- 视觉、牌背和动画不改变洗牌、朝向或牌面概率。
- 单张、三张、自由牌桌、基础 Reading、基础 Follow-Up、基础统计、隐私、无障碍、删除与个人数据导出不得锁定。
- 不设置付费继续抽牌、会清零的 streak、损失倒计时、公开竞争排行榜或抽取奖励箱。
- 私密 Reading 与公开分享获得相同 Personal XP；社区发布不是个人满级条件。
- Personal Journey XP 与 Community Contribution 完全分账。

## 2. 当前仓库事实审计

| 范围            | 当前事实                                                                                                                                | 对成长系统的约束                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 用户/认证       | Supabase Auth；本地模式使用 demo user；仅有 `user_preferences.onboarding_completed_at`                                                  | 没有 profile、XP、achievement 字段；需要独立 progression repository                       |
| Reading         | `Reading` 包含 Topic、模板/临时问题快照、tag、spread、时间、总体解读、draft/completed；`ReadingCard` 有牌、方向、左右旋、来源、单牌解读 | XP 只能奖励 completed；可分别验证问题、总体解读、单牌解读                                 |
| Follow-Up       | 独立 `reading_follow_ups`，scheduled/completed、outcome、reflection、reviewedAt                                                         | 现实回顾可成为最高频高价值 XP 来源；编辑不可重复奖励                                      |
| Topic/问题      | Topic、QuestionTemplate、Topic-scoped QuestionTag 已实现                                                                                | Topic/tag 归类只能是小额辅助奖励，避免批量建空分类刷分                                    |
| 抽牌            | DrawSession 持久化；单张、三张、情境、开放牌阵；自由牌桌可任意牌数；双逆位已实现                                                        | DrawSession/draft 不给 XP；只有保存成有效 Reading 后产生候选事件                          |
| Reviews         | weekly/monthly Review 快照与个人总结已实现                                                                                              | 周/月回顾可验证；年度 Review 是 **Future dependency**                                     |
| Statistics      | Reading-only 纯函数，支持 Topic/tag/时间、牌、花色、方向、左右旋和来源追溯                                                              | 成长统计不得把 Draft DrawSession 算入；可复用事实计数，不改统计口径                       |
| AI              | 无 App 内 AI API；Import 仅复制外部整理模板并在本地解析                                                                                 | AI 周期总结、AI 额度均为 **Future dependency**，不得作为 V1 等级奖励                      |
| 主题            | `ThemeProvider`、registry、AsyncStorage 偏好；当前只有 `moonlight`                                                                      | 新主题需注册完整 token；主题拥有权未来应进入 unlock inventory                             |
| 数据适配        | `repositoryFactory` 在 local/mock 与 Supabase adapter 间切换；错误统一为 RepositoryError                                                | Progression 必须同时提供 local adapter 与 Supabase adapter；本地数据先显示 provisional XP |
| Supabase        | 所有用户表带 `user_id`/所有权关系并启用 RLS；写入常通过验证函数/RPC；迁移既有 `000x_` 与时间戳命名                                      | 新表必须 RLS；客户端不得写 XP 数值；未来 migration 沿用当前时间戳方式并人工部署           |
| 社区/自定义牌阵 | 没有社区表、声誉、公开 profile 或用户自定义 spread repository                                                                           | Community、Creator、分享牌阵均为 **Future dependency**                                    |

现有 `JournalData` 不包含 progression；Local Review 另用 AsyncStorage，而主要 journal 使用 store。Phase 1 应建立单一 `ProgressionRepository`，不要把 XP 字段塞入 Reading，也不要让 Statistics 计算 XP。

## 3. 系统关系

| 系统                      | 作用                               | 是否影响 Personal Level |
| ------------------------- | ---------------------------------- | ----------------------- |
| Personal Journey XP/Level | 私人长期历程，50 级封顶            | 是                      |
| Community Contribution    | 社区建设信誉，独立 0–10,000 points | 否                      |
| Achievement/Badge         | 一次性事实里程碑；可附少量 XP      | 仅表中明确的 XP         |
| Mission                   | 引导多样行为；不取代基础事件 XP    | 是，但有独立日/周上限   |
| Title                     | 可装备身份文字，不代表权威         | 否                      |
| Unlock Inventory          | 持有与装备视觉、牌阵、称号等       | 否                      |
| Mastery/Annual Journey    | 满级后的收藏与年度历程             | 不扩张基础等级          |

## 4. 有效内容与发放原则

### 4.1 客户端可即时检查

- Reading 为 `completed`、问题非空且不是 UI placeholder、至少一张有效牌、牌序连续。
- reflection/interpretation 先 Unicode trim、折叠重复空白；初始观察至少 12 个非空白字母/数字，完整解读至少 30 个，Follow-Up reflection 至少 20 个。
- 内容不能仅由同一字符、标点、牌名列表或模板提示组成；同一表单的奖励项显示资格预览。
- 客户端检查只改善反馈，不能作为最终授权。

### 4.2 服务端/数据库必须强制

- `auth.uid()` 与 source owner 一致；source 存在且状态满足规则。
- 事件 UUID 与 `idempotency_key` 唯一；同一 `(user,event_code,source_type,source_id,milestone)` 只记账一次。
- 服务端时间决定日/周窗口；客户端 `occurredAt` 只用于审计和离线排序。
- 对 normalized hash、近 24 小时同用户内容和已删除来源 hash 做重复检查；相同内容不重复发奖。
- 用规则版本计算 XP，客户端永远不能提交 `xpAmount`。
- 每日/每周上限在同一事务中锁定/汇总，防止双设备并发越限。

### 4.3 只能软提示

- 不判断塔罗观点“正确”、深刻或积极。
- 相似问题短时间重抽仅提示“是否先观察已有牌面”；不强制阻止保存。
- 语义相似、情绪状态和写作风格不得用于扣分；V1 不使用 AI 判质。

草稿、单纯揭牌、移动牌、重复保存、编辑已有合格文本、点赞/评论数量本身、开启隐私设置、回归登录均不产生 Personal XP。

## 5. Personal Journey XP 规则

全局上限：基础/反思事件每日最多 **180 XP**；Daily Mission 额外最多 **25 XP/日**；Weekly Mission 额外最多 **80 XP/周**；一次性 achievement 不受日上限但单日最多结算 150 XP，溢出次日到账。Reading completion 每日最多 3 条计 XP，之后仍可正常记录但为 0 XP。

| Event Code                           | 行为                     |  XP | 最低资格                                |   日上限 |    周上限 | 重复              | 防刷/删除处理                             | 离线 |
| ------------------------------------ | ------------------------ | --: | --------------------------------------- | -------: | --------: | ----------------- | ----------------------------------------- | ---- |
| `DAILY_FIRST_VALID_READING`          | 当日首条有效 Reading     |  10 | completed Reading                       |        1 |         7 | 每日              | 服务端日期；删除保留，确认作弊才 reversal | 是   |
| `READING_SINGLE_COMPLETED`           | 单张有效 Reading         |   8 | 1 张、有效问题                          | 3 条共享 | 15 条共享 | 新 source         | source 唯一；编辑不再发                   | 是   |
| `READING_THREE_CARD_COMPLETED`       | 三张有效 Reading         |  12 | 3 张、有效问题                          | 3 条共享 | 15 条共享 | 新 source         | 同上                                      | 是   |
| `READING_FREE_TABLE_COMPLETED`       | 自由牌桌有效 Reading     |  14 | 1–10 张、有效问题                       | 3 条共享 | 15 条共享 | 新 source         | 牌数不叠加 XP                             | 是   |
| `READING_SITUATION_COMPLETED`        | 情境牌阵有效 Reading     |  12 | 3 个既定位置                            | 3 条共享 | 15 条共享 | 新 source         | source 唯一                               | 是   |
| `READING_INITIAL_REFLECTION_ADDED`   | 初始观察                 |  12 | ≥12 有效字符                            |        3 |        15 | 每 Reading 一次   | milestone key；后续编辑 0                 | 是   |
| `READING_FULL_INTERPRETATION_ADDED`  | 完整总体解读             |  20 | ≥30 有效字符且非复制                    |        2 |        10 | 每 Reading 一次   | normalized hash；删除保留                 | 是   |
| `READING_CARD_INTERPRETATIONS_ADDED` | 完成全部单牌解读         |  15 | 每张 ≥12 有效字符                       |        2 |        10 | 每 Reading 一次   | 全部达到后一次性发放                      | 是   |
| `READING_TOPIC_ASSIGNED`             | 有效归入 Topic           |   3 | completed 且真实 Topic                  |        3 |        15 | 每 Reading 一次   | 新建 Topic 本身不发 XP                    | 是   |
| `READING_VALID_QUESTION_ADDED`       | 有效问题                 |   3 | ≥6 有效字符、非 placeholder             |        3 |        15 | 每 Reading 一次   | normalized hash 去重                      | 是   |
| `READING_TEMPLATE_USED`              | 使用固定问题             |   2 | active template                         |        1 |         5 | 每模板/日一次     | 不按重复 Reading 叠加                     | 是   |
| `SPREAD_FIRST_USED`                  | 首次完成某牌阵           |  15 | 首次 completed                          |        — |         — | 每 spread 一次    | stable spread id                          | 是   |
| `FOLLOW_UP_COMPLETED`                | 完成现实回顾             |  25 | scheduled→completed、有 outcome         |        3 |        10 | 每 Follow-Up 一次 | source 状态验证                           | 是   |
| `FOLLOW_UP_OUTCOME_RECORDED`         | 标记 outcome             |   5 | 合法枚举                                |        3 |        10 | 每 Follow-Up 一次 | 与 completion 分里程碑                    | 是   |
| `FOLLOW_UP_REFLECTION_ADDED`         | 写现实反思               |  15 | ≥20 有效字符                            |        3 |        10 | 每 Follow-Up 一次 | 编辑不重复                                | 是   |
| `FOLLOW_UP_7_DAY_REVIEW`             | 回顾至少 7 天前 Reading  |  10 | `reviewedAt-readingAt≥7d`               |        2 |         7 | 每 Follow-Up 一次 | 服务端时间                                | 是   |
| `FOLLOW_UP_30_DAY_REVIEW`            | 回顾至少 30 天前 Reading |  15 | 间隔≥30d                                |        1 |         3 | 每 Follow-Up 一次 | 服务端时间                                | 是   |
| `FOLLOW_UP_REFRAMED_UNDERSTANDING`   | 写下理解变化             |  10 | reflection ≥40 且勾选“理解有变化”       |        1 |         3 | 每 Follow-Up 一次 | 用户声明+文本资格，不判对错               | 是   |
| `WEEKLY_REVIEW_COMPLETED`            | 完成周回顾               |  45 | completed + summary ≥40                 |        1 |         1 | 每周期一次        | period unique                             | 是   |
| `MONTHLY_REVIEW_COMPLETED`           | 完成月回顾               |  90 | completed + summary ≥80                 |        1 |      1/月 | 每周期一次        | period unique                             | 是   |
| `ANNUAL_REVIEW_COMPLETED`            | 年度回顾                 | 180 | **Future dependency**                   |        1 |      1/年 | 每周期一次        | 单独结算                                  | 是   |
| `TAROT_CARD_FIRST_ENCOUNTER`         | 首次记录某张牌           |   2 | completed Reading                       |     5 张 |     20 张 | 每 card 一次      | 导入历史不发 XP                           | 是   |
| `PERSONAL_CARD_MEANING_CREATED`      | 建立个人牌义             |  20 | **Future dependency**；≥40 字           |        2 |         8 | 每 card/方向一次  | unique card+orientation                   | 是   |
| `PERSONAL_CARD_MEANING_UPDATED`      | 有意义更新               |   5 | **Future dependency**；新增≥30 有效字符 |        1 |         3 | 每 30 天/条       | diff/hash                                 | 是   |
| `SUIT_REFLECTION_COMPLETED`          | 花色个人总结             |  40 | **Future dependency**；≥120 字          |        1 |      1/月 | 每 suit/版本一次  | 4 个 stable key                           | 是   |
| `DUAL_REVERSAL_NOTES_COMPLETED`      | 左右旋差异笔记           |  30 | **Future dependency**；两侧各≥30 字     |        1 |         2 | 每 card 一次      | left/right 均存在                         | 是   |
| `ONBOARDING_COMPLETED`               | 完成 onboarding          |  30 | 首次完成                                |        — |         — | 仅一次            | user unique                               | 是   |
| `PROFILE_COMPLETED`                  | 完成个人资料             |   0 | **Future dependency**                   |        — |         — | 否                | 隐私资料不用于诱导 XP                     | 否   |
| `PRIVACY_SETTINGS_COMPLETED`         | 隐私设置                 |   0 | 已有数据权利                            |        — |         — | 否                | 不奖励隐私选择                            | 否   |
| `FIRST_SYNC_COMPLETED`               | 首次同步/备份            |   0 | **Future dependency**                   |        — |         — | 否                | 核心数据权利不做奖励                      | 否   |
| `FOLLOW_UP_REMINDERS_ENABLED`        | 开启提醒                 |   0 | **Future dependency**                   |        — |         — | 否                | 不用 XP 诱导通知权限                      | 否   |
| `RETURNING_USER_WELCOME`             | 回归欢迎                 |   0 | 30 天未使用                             |        — |         — | 每 90 天          | 只发欢迎卡/纪念，不补偿性刷 XP            | 否   |

批量导入：不发 Reading/反思 XP；可计入历史统计与牌面收藏进度，但所有“首次遇见”在一次导入中最多标记 10 张且 XP 为 0，避免导入即满级。

## 6. 等级上限与曲线决策

| 上限 | 优点                                    | 缺点                                             | 结论        |
| ---: | --------------------------------------- | ------------------------------------------------ | ----------- |
|   30 | 清楚、维护低、奖励密度高                | 1–2 年后空间不足；阶段过粗                       | 不选        |
|   50 | 可理解；约 1–5 年跨度；每级可给轻量奖励 | 与塔罗数字无直接彩蛋                             | **推荐 V1** |
|   78 | 世界观契合                              | 容易出现空洞等级、维护高、用户误解为 78 张收集轨 | 不选        |

推荐 50 级。令 `n = level - 1`：

```text
cumulativeXP(level) = 200n + 17.5n(n - 1)
xpToNext(level) = 200 + 35(level - 1)   // level 1...49
Level 50 cumulative XP = 50,960
```

曲线单调但不过陡；前 7 天可升 1–4 级，中期约每 1–3 周一级，后期约每 2–6 周一级。完全不参与社区仍可满级。

### 6.1 阶段命名候选

| 方案       | 阶段（中/英）                                                                                                                                                                         | 特点                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| A 反思成长 | 初见者 First Look；倾听者 Listener；记录者 Recorder；诠释者 Interpreter；映照者 Reflector；同行者 Companion；星辰旅者 Starfarer                                                       | 克制、贴合日记，不暗示权威         |
| B 星空旅程 | 微光 Glimmer；月径 Moonpath；星图 Star Map；远望 Far Gaze；星港 Star Haven；长夜 Long Night；晨星 Morning Star                                                                        | 视觉性强，但与具体行为较弱         |
| C 塔罗知识 | 初识牌面 Card Acquaintance；花色观察者 Suit Observer；牌阵记录者 Spread Recorder；符号读者 Symbol Reader；个人词典 Personal Lexicon；历史编者 History Curator；完整旅程 Whole Journey | 清楚但较学术，容易被误读为能力等级 |

推荐方案 A，范围为 1–4、5–9、10–16、17–24、25–33、34–42、43–50。

## 7. Level 1–50 完整表

基础功能始终开放。表中“功能”仅为高级组织/展示；标为 Future 的奖励在对应能力实现前显示预览，不提前承诺可用日期。

|  Lv | Stage    | Level Name   | Next XP | Cum. XP | Primary Reward             | Secondary Reward   | New Permission          |
| --: | -------- | ------------ | ------: | ------: | -------------------------- | ------------------ | ----------------------- |
|   1 | 初见者   | 第一束光     |     200 |       0 | Moonlight 默认主题         | Journey 起点徽章   | 核心功能全开            |
|   2 | 初见者   | 留下一页     |     235 |     200 | 月纹牌背                   | 称号“初次记录”     | —                       |
|   3 | 初见者   | 安静观察     |     270 |     435 | 柔雾牌桌背景               | profile 小月点     | —                       |
|   4 | 初见者   | 回望当下     |     305 |     705 | 基础淡入揭示               | 成就展示槽 1       | —                       |
|   5 | 倾听者   | 月下倾听     |     340 |   1,010 | 星空主题                   | 称号槽 1           | —                       |
|   6 | 倾听者   | 细节浮现     |     375 |   1,350 | 星点牌背                   | 牌面收藏视图       | —                       |
|   7 | 倾听者   | 一周回声     |     410 |   1,725 | 周回顾边框                 | 徽章架 3 格        | —                       |
|   8 | 倾听者   | 路径初成     |     445 |   2,135 | 状态—障碍—建议皮肤         | 轻微流光效果       | —                       |
|   9 | 倾听者   | 稳定书写     |     480 |   2,580 | 月下湖面背景               | 称号“稳定书写者”   | —                       |
|  10 | 记录者   | 十页星图     |     515 |   3,060 | 森林夜雾主题               | 收藏夹 1（Future） | Reading collection 预览 |
|  11 | 记录者   | 牌面足迹     |     550 |   3,575 | 藤纹牌背                   | 卡牌遇见进度       | —                       |
|  12 | 记录者   | 问题成线     |     585 |   4,125 | 问题模板装饰               | 模板使用统计       | —                       |
|  13 | 记录者   | 三点成形     |     620 |   4,710 | 情绪来源牌阵（Future）     | 水波揭示           | 牌阵预览                |
|  14 | 记录者   | 月相翻页     |     655 |   5,330 | 月相 profile 环            | 称号槽 2           | —                       |
|  15 | 记录者   | 现实来信     |     690 |   5,985 | Follow-Up 纪念牌背         | 徽章架 6 格        | —                       |
|  16 | 记录者   | 记录成册     |     725 |   6,675 | 晨曦云层主题               | 月度页签皮肤       | —                       |
|  17 | 诠释者   | 多重视角     |     760 |   7,400 | 关系镜像牌阵（Future）     | 镜面波纹效果       | 牌阵预览                |
|  18 | 诠释者   | 方向之间     |     795 |   8,160 | 左右旋收藏徽记             | 双逆位统计卡皮肤   | —                       |
|  19 | 诠释者   | 文字与牌     |     830 |   8,955 | 古典书房背景               | 个人牌义入口预览   | Future dependency       |
|  20 | 诠释者   | 二十次回声   |     865 |   9,785 | 古典书房主题               | 称号“耐心回望”     | —                       |
|  21 | 诠释者   | 分岔之路     |     900 |  10,650 | 决策双路径牌阵（Future）   | 羽毛揭示           | 牌阵预览                |
|  22 | 诠释者   | 大牌之环     |     935 |  11,550 | 大阿卡那 profile 框        | 卡背“22 道门”      | —                       |
|  23 | 诠释者   | 情绪水面     |     970 |  12,485 | 深海梦境背景               | 深海牌背           | —                       |
|  24 | 诠释者   | 一段长句     |   1,005 |  13,455 | 阅读排版样式 2             | 收藏夹 2（Future） | —                       |
|  25 | 映照者   | 镜中记录     |   1,040 |  14,460 | 深海梦境主题               | 称号槽 3           | —                       |
|  26 | 映照者   | 内外相照     |   1,075 |  15,500 | 内在冲突牌阵（Future）     | 烛光揭示           | 牌阵预览                |
|  27 | 映照者   | 四种声音     |   1,110 |  16,575 | 四花色徽章框               | 四元素牌背         | —                       |
|  28 | 映照者   | 月度回望     |   1,145 |  17,685 | 月度回顾牌阵（Future）     | 报告封面 1         | —                       |
|  29 | 映照者   | 历史纹理     |   1,180 |  18,830 | 时间线装饰 1               | 历史对照强调色     | —                       |
|  30 | 映照者   | 三十层月光   |   1,215 |  20,010 | 极简黑金主题               | 称号“历史整理者”   | —                       |
|  31 | 映照者   | 一周的形状   |   1,250 |  21,225 | 本周回顾牌阵（Future）     | 银河轨迹效果       | —                       |
|  32 | 映照者   | 自己的词典   |   1,285 |  22,475 | 个人牌义词典（Future）     | 词典封面           | Future dependency       |
|  33 | 映照者   | 稳定映照     |   1,320 |  23,760 | 星辉 profile 框            | 徽章架 12 格       | —                       |
|  34 | 同行者   | 与历史同行   |   1,355 |  25,080 | 古典书房主题变体           | 称号槽 4           | —                       |
|  35 | 同行者   | 复杂也清晰   |   1,390 |  26,435 | 复杂关系动态牌阵（Future） | 极光揭示           | 牌阵预览                |
|  36 | 同行者   | 安静的深处   |   1,425 |  27,825 | 阴影工作牌阵（Future）     | 暗月牌背           | 内容警示说明            |
|  37 | 同行者   | 长期线索     |   1,460 |  29,250 | 高级趋势展示皮肤           | 比较视图 2         | 不增加预测结论          |
|  38 | 同行者   | 自定位置     |   1,495 |  30,710 | 自定义牌阵槽 1（Future）   | 编辑器预览         | Future dependency       |
|  39 | 同行者   | 十字交点     |   1,530 |  32,205 | 凯尔特十字（Future）       | 十字桌布           | 牌阵预览                |
|  40 | 同行者   | 四十页之后   |   1,565 |  33,735 | 月下湖面主题变体           | 称号“长期同行者”   | —                       |
|  41 | 同行者   | 年轮初见     |   1,600 |  35,300 | 年度旅程封面（Future）     | 年度徽章槽         | Future dependency       |
|  42 | 同行者   | 保留余白     |   1,635 |  36,900 | 极简牌背                   | 无干扰模式皮肤     | —                       |
|  43 | 星辰旅者 | 星图展开     |   1,670 |  38,535 | 星辰旅者主题               | profile 星图       | —                       |
|  44 | 星辰旅者 | 自定星座     |   1,705 |  40,205 | 自定义牌阵槽 2（Future）   | 自定义封面         | Future dependency       |
|  45 | 星辰旅者 | 一季回声     |   1,740 |  41,910 | 季节收藏页（Future）       | 季节称号槽         | Future dependency       |
|  46 | 星辰旅者 | 年度之轮     |   1,775 |  43,650 | 年度之轮牌阵（Future）     | 年轮牌背           | 牌阵预览                |
|  47 | 星辰旅者 | 完整牌途     |   1,810 |  45,425 | 78 牌收藏主题              | 78 牌徽章框        | —                       |
|  48 | 星辰旅者 | 自己的星图   |   1,845 |  47,235 | 自定义牌阵槽 3（Future）   | 创作草稿箱         | Future dependency       |
|  49 | 星辰旅者 | 长夜将明     |   1,880 |  49,080 | 晨星揭示                   | 满级前纪念徽章     | —                       |
|  50 | 星辰旅者 | 旅程仍在继续 |       0 |  50,960 | 年度 Mastery（Future）     | “星辰旅者”称号     | 不重置、不失去解锁      |

## 8. V1 Unlock Reward Catalog

状态定义：`locked` 未满足；`previewable` 可预览；`unlocked` 已永久拥有；`equipped` 当前启用；`limited` 有明确获取窗口但获得后永久；`expired` 窗口结束且未获得；`archived` 不再展示但既有拥有权保留。一个物品可同时 `unlocked + equipped`。所有视觉项的 `affectsRandomness=false`。

### 8.1 UI themes、背景与 profile

| Reward ID               | 名称       | 类型               | 分类     | 解锁           | 最低级 | 预览 | 随机性 | 复杂度 |
| ----------------------- | ---------- | ------------------ | -------- | -------------- | -----: | ---- | ------ | ------ |
| `theme_moonlight`       | 月光       | theme              | default  | 初始           |      1 | 是   | 否     | 已实现 |
| `theme_starry`          | 静谧星空   | theme              | journey  | Lv5            |      5 | 是   | 否     | 中     |
| `theme_forest_mist`     | 森林夜雾   | theme              | journey  | Lv10           |     10 | 是   | 否     | 中     |
| `theme_dawn_cloud`      | 晨曦云层   | theme              | journey  | Lv16           |     16 | 是   | 否     | 中     |
| `theme_classic_library` | 古典书房   | theme              | journey  | Lv20           |     20 | 是   | 否     | 中     |
| `theme_deep_sea`        | 深海梦境   | theme              | journey  | Lv25           |     25 | 是   | 否     | 中     |
| `theme_minimal_gold`    | 极简黑金   | theme              | journey  | Lv30           |     30 | 是   | 否     | 中     |
| `theme_starfaring`      | 星辰旅者   | theme              | capstone | Lv43           |     43 | 是   | 否     | 高     |
| `bg_soft_mist`          | 柔雾桌面   | draw_background    | common   | Lv3            |      3 | 是   | 否     | 低     |
| `bg_moon_lake`          | 月下湖面   | draw_background    | uncommon | Lv9            |      9 | 是   | 否     | 中     |
| `bg_forest_night`       | 林间夜雾   | draw_background    | uncommon | Lv10           |     10 | 是   | 否     | 中     |
| `bg_dawn`               | 晨光云层   | draw_background    | uncommon | Lv16           |     16 | 是   | 否     | 中     |
| `bg_library`            | 静默书桌   | draw_background    | rare     | Lv19           |     19 | 是   | 否     | 中     |
| `bg_deep_sea`           | 深海微光   | draw_background    | rare     | Lv23           |     23 | 是   | 否     | 中     |
| `bg_minimal_gold`       | 黑金留白   | draw_background    | rare     | Lv30           |     30 | 是   | 否     | 低     |
| `bg_star_map`           | 漫长星图   | draw_background    | capstone | Lv43           |     43 | 是   | 否     | 高     |
| `profile_moon_dot`      | 月点       | profile_decoration | common   | Lv3            |      3 | 是   | 否     | 低     |
| `profile_weekly_frame`  | 一周回声框 | profile_decoration | common   | 首次周回顾     |      7 | 是   | 否     | 低     |
| `profile_lunar_ring`    | 月相环     | profile_decoration | uncommon | Lv14           |     14 | 是   | 否     | 低     |
| `profile_major_frame`   | 大阿卡那环 | profile_decoration | uncommon | 遇见 22 张大牌 |     22 | 是   | 否     | 中     |
| `profile_four_suits`    | 四花色框   | profile_decoration | rare     | 四花色成就     |     27 | 是   | 否     | 中     |
| `profile_starlight`     | 星辉框     | profile_decoration | rare     | Lv33           |     33 | 是   | 否     | 中     |
| `profile_annual_ring`   | 年轮       | profile_decoration | annual   | 年度回顾       |     41 | 是   | 否     | 中     |
| `profile_star_map`      | 星图       | profile_decoration | capstone | Lv43           |     43 | 是   | 否     | 高     |

### 8.2 Reveal effects 与 card backs

| Reward ID            | 名称       | 类型          | 分类     | 解锁            | 最低级 | 预览 | 随机性 | 复杂度 |
| -------------------- | ---------- | ------------- | -------- | --------------- | -----: | ---- | ------ | ------ |
| `reveal_basic`       | 基础翻牌   | reveal_effect | default  | 初始            |      1 | 是   | 否     | 已实现 |
| `reveal_fade`        | 柔和浮现   | reveal_effect | common   | Lv4             |      4 | 是   | 否     | 低     |
| `reveal_glimmer`     | 轻微流光   | reveal_effect | common   | Lv8             |      8 | 是   | 否     | 低     |
| `reveal_ripple`      | 水波扩散   | reveal_effect | uncommon | Lv13            |     13 | 是   | 否     | 中     |
| `reveal_moonlight`   | 月光揭示   | reveal_effect | uncommon | 10 次 Follow-Up |     15 | 是   | 否     | 中     |
| `reveal_mirror`      | 镜面波纹   | reveal_effect | uncommon | Lv17            |     17 | 是   | 否     | 中     |
| `reveal_feather`     | 羽毛落下   | reveal_effect | rare     | Lv21            |     21 | 是   | 否     | 中     |
| `reveal_candle`      | 烛光显现   | reveal_effect | rare     | Lv26            |     26 | 是   | 否     | 中     |
| `reveal_galaxy`      | 银河轨迹   | reveal_effect | rare     | Lv31            |     31 | 是   | 否     | 高     |
| `reveal_aurora`      | 极光展开   | reveal_effect | capstone | Lv35            |     35 | 是   | 否     | 高     |
| `back_moon_lines`    | 月纹       | card_back     | common   | Lv2             |      2 | 是   | 否     | 低     |
| `back_stardots`      | 星点       | card_back     | common   | Lv6             |      6 | 是   | 否     | 低     |
| `back_vines`         | 夜藤       | card_back     | uncommon | Lv11            |     11 | 是   | 否     | 低     |
| `back_followup`      | 回望之窗   | card_back     | uncommon | 首次 Follow-Up  |     15 | 是   | 否     | 低     |
| `back_22_doors`      | 二十二道门 | card_back     | uncommon | 22 张大牌       |     22 | 是   | 否     | 中     |
| `back_deep_sea`      | 深海       | card_back     | rare     | Lv23            |     23 | 是   | 否     | 中     |
| `back_four_elements` | 四种元素   | card_back     | rare     | 四花色成就      |     27 | 是   | 否     | 中     |
| `back_dark_moon`     | 暗月       | card_back     | rare     | Lv36            |     36 | 是   | 否     | 中     |
| `back_minimal`       | 留白       | card_back     | rare     | Lv42            |     42 | 是   | 否     | 低     |
| `back_year_wheel`    | 年度之轮   | card_back     | capstone | 年度回顾        |     46 | 是   | 否     | 高     |

稀有度只描述收藏来源和制作复杂度。Reduced Motion 下所有效果必须变为短 fade/instant；粒子不能持续运行。

## 9. 牌阵与健康抽牌规则

| 层级 | 牌阵                                                         | 解锁方式                                                        | 说明                                                      |
| ---- | ------------------------------------------------------------ | --------------------------------------------------------------- | --------------------------------------------------------- |
| 初始 | 单张指引、过去—现在—未来、状态—障碍—建议、自由牌桌/开放牌阵  | 初始开放                                                        | 当前核心价值，不锁定                                      |
| 中期 | 情绪来源、关系镜像、决策双路径、内在冲突、本周回顾、月度回顾 | Lv13–31                                                         | **Future dependency**；等级解锁只影响模板，不限制手动记录 |
| 后期 | 复杂关系动态、阴影工作、凯尔特十字、年度之轮                 | Lv35–46                                                         | **Future dependency**；阴影工作附温和说明，不作治疗替代   |
| 创作 | 自定义位置/解释、分享牌阵                                    | Lv38 槽位 1，Lv44 槽位 2，Lv48 槽位 3；发布需 Community Stage 3 | **Future dependency**；私下自定义不要求社区等级           |

健康规则：

- 不限制普通个人 Reading 次数；只限制每日可获 XP 的 Reading 为 3 条。
- Daily Guidance 每日首条有 10 XP bonus，之后可继续记录但不再有 bonus。
- 同一 normalized question 在 30 分钟内再次抽牌时显示非阻断提示；24 小时内只有第一条 completion XP。
- 三张与自由牌桌不因牌数增加额外 XP；活动抽牌不能售卖“额外机会”。
- AI 次数、同步、导出、历史范围、隐私与无障碍不得由等级控制。订阅未来只能影响计算成本型服务，不影响基础记录和随机公平性。

## 10. Mission Pool

任务在基础事件 XP 之外只给小额 bonus；同一动作最多同时完成 1 个 daily、1 个 weekly 和 1 个 long-term milestone。每天显示 3 个 daily（至少 1 个无需抽牌），每周显示 3 个 weekly；用户可替换 1 个，不产生惩罚。

### 10.1 Daily（候选 12）

| Mission ID            | 名称         | 类型  | 完成条件                                |  XP | 额外奖励   | 周期 | 防刷                |
| --------------------- | ------------ | ----- | --------------------------------------- | --: | ---------- | ---- | ------------------- |
| `D_REFLECT_ONE`       | 留下一句观察 | daily | 1 条初始观察                            |   5 | —          | 日   | 合格 milestone      |
| `D_FOLLOWUP_ONE`      | 回望一次     | daily | 1 个 Follow-Up                          |   8 | —          | 日   | source unique       |
| `D_REVIEW_OLD`        | 翻开旧页     | daily | 打开≥7 天前 Reading 并停留/主动标记已阅 |   4 | —          | 日   | 每 source 30 天一次 |
| `D_CARD_NOTE`         | 一张牌的笔记 | daily | 1 条单牌解读                            |   5 | —          | 日   | ≥12 字              |
| `D_TOPIC_TIDY`        | 整理归处     | daily | 为未分类 Reading 加 Topic/tag           |   3 | —          | 日   | 最多 1 条           |
| `D_QUESTION_TEMPLATE` | 回到固定问题 | daily | 使用模板完成 Reading                    |   4 | —          | 日   | 同模板一次          |
| `D_ONE_VALID_READING` | 今日一页     | daily | 1 条有效 Reading                        |   4 | —          | 日   | completion unique   |
| `D_THREE_POSITIONS`   | 看见三个位置 | daily | 完成三张/情境牌阵                       |   5 | —          | 日   | 1 条                |
| `D_FREE_OBSERVE`      | 自由观察     | daily | 自由牌桌保存且有观察                    |   5 | —          | 日   | 1 条                |
| `D_FAVORITE_REVISIT`  | 重读收藏     | daily | 打开收藏 Reading 并主动标记已阅         |   3 | —          | 日   | 不自动按停留发      |
| `D_REALITY_OUTCOME`   | 记录现实结果 | daily | Follow-Up outcome                       |   5 | —          | 日   | source unique       |
| `D_REST_OPTION`       | 保留余白     | daily | 主动选择“今天不记录”                    |   0 | 温和结束卡 | 日   | 不用 XP 奖励打卡    |

### 10.2 Weekly（候选 12）

| Mission ID           | 名称         | 类型   | 完成条件                                |  XP | 额外奖励 | 周期 | 防刷                         |
| -------------------- | ------------ | ------ | --------------------------------------- | --: | -------- | ---- | ---------------------------- |
| `W_THREE_DAYS`       | 三日三页     | weekly | 不同 3 天有效记录                       |  12 | —        | 周   | 服务端日期                   |
| `W_TWO_FOLLOWUPS`    | 两次现实回望 | weekly | 2 个 Follow-Up                          |  18 | —        | 周   | source unique                |
| `W_WEEKLY_REVIEW`    | 一周回声     | weekly | 完成周回顾                              |  15 | —        | 周   | period unique                |
| `W_TWO_TOPICS`       | 两个议题     | weekly | 2 Topic 各 1 条 Reading                 |   8 | —        | 周   | completed only               |
| `W_TWO_SPREADS`      | 两种视角     | weekly | 使用 2 种 spread                        |   8 | —        | 周   | stable spread IDs            |
| `W_DEEP_NOTE`        | 完整写下一次 | weekly | 1 条完整总体+单牌解读                   |  12 | —        | 周   | 同一 Reading                 |
| `W_OLD_AND_NEW`      | 新旧相照     | weekly | 新 Reading + ≥30 天旧 Reading Follow-Up |  15 | —        | 周   | 两个 source                  |
| `W_FOUR_CARDS_NOTED` | 四张牌的声音 | weekly | 4 张不同牌有单牌解读                    |  10 | —        | 周   | distinct card IDs            |
| `W_TEMPLATE_RETURN`  | 固定问题回访 | weekly | 同模板新 Reading + 查看上次             |   8 | —        | 周   | 新 source                    |
| `W_DUAL_REVERSAL`    | 左右之间     | weekly | 记录 left/right 且各有解读              |  10 | —        | 周   | 不强求抽出；仅出现时可选任务 |
| `W_ORGANIZE_TAGS`    | 整理问题线索 | weekly | 给 3 条旧 Reading 分类                  |   6 | —        | 周   | 每 Reading 一次              |
| `W_QUIET_WEEK`       | 温和的一周   | weekly | 任意 1 Reading + 1 Follow-Up            |   8 | —        | 周   | 不要求连续天数               |

### 10.3 Long-term（候选 20）

| Mission ID           | 名称           | 类型    | 完成条件                              |  XP | 额外奖励       | 周期     | 防刷                       |
| -------------------- | -------------- | ------- | ------------------------------------- | --: | -------------- | -------- | -------------------------- |
| `L_READINGS_10`      | 十页记录       | journey | 10 有效 Reading                       |  20 | 徽章           | 一次     | source count               |
| `L_READINGS_50`      | 五十页记录     | journey | 50                                    |  40 | 徽章           | 一次     | source count               |
| `L_READINGS_100`     | 百页记录       | journey | 100                                   |  60 | 称号           | 一次     | source count               |
| `L_FOLLOWUPS_10`     | 十次回望       | journey | 10 Follow-Up                          |  35 | 牌背           | 一次     | source count               |
| `L_FOLLOWUPS_50`     | 五十次回望     | journey | 50                                    |  70 | 称号           | 一次     | source count               |
| `L_MAJOR_22`         | 与大牌相遇     | journey | 22 大阿卡那                           |  45 | profile 框     | 一次     | distinct cards             |
| `L_ALL_78`           | 完整牌途       | journey | 78 张                                 | 100 | 主题装饰       | 一次     | import counts, no event XP |
| `L_WANDS_14`         | 权杖之路       | journey | 14 权杖                               |  25 | 徽章           | 一次     | distinct cards             |
| `L_CUPS_14`          | 圣杯之路       | journey | 14 圣杯                               |  25 | 徽章           | 一次     | distinct cards             |
| `L_SWORDS_14`        | 宝剑之路       | journey | 14 宝剑                               |  25 | 徽章           | 一次     | distinct cards             |
| `L_PENTACLES_14`     | 星币之路       | journey | 14 星币                               |  25 | 徽章           | 一次     | distinct cards             |
| `L_REVIEWS_12`       | 十二次周期回顾 | journey | 12 completed Reviews                  |  60 | 称号           | 一次     | period unique              |
| `L_ONE_YEAR`         | 一年的记录     | journey | 首条至今≥365d 且 24 活跃日            |  80 | 年轮框         | 一次     | 服务端时间                 |
| `L_TEMPLATES_5`      | 五条长期问题   | journey | 5 active templates，各≥2 Reading      |  30 | 徽章           | 一次     | owned templates            |
| `L_SPREADS_6`        | 六种视角       | journey | 6 spread 首次完成                     |  40 | 称号           | 一次     | Future dependency          |
| `L_CARD_MEANINGS_10` | 十张个人牌义   | journey | 10 meanings                           |  40 | 词典封面       | 一次     | Future dependency          |
| `L_CARD_MEANINGS_78` | 个人牌义词典   | journey | 78 meanings                           | 120 | 称号           | 一次     | Future dependency          |
| `L_DUAL_NOTES_10`    | 十组左右笔记   | journey | 10 cards left/right notes             |  50 | 徽章           | 一次     | Future dependency          |
| `L_MONTHLY_6`        | 六个月度回顾   | journey | 6 distinct months                     |  70 | 背景           | 一次     | period unique              |
| `L_RETURN_GENTLY`    | 再次回来       | journey | 间隔≥30d 后完成 1 Reading+1 Follow-Up |  20 | “欢迎回来”徽章 | 每年一次 | 不显示断签                 |

### 10.4 Community（候选 10，Future dependency）

| Mission ID             | 名称           | 类型      | 条件                     | Reputation | 额外奖励           | 周期 | 防刷                  |
| ---------------------- | -------------- | --------- | ------------------------ | ---------: | ------------------ | ---- | --------------------- |
| `C_SHARE_ONE`          | 分享一种方法   | community | 1 条合格公开分享         |          5 | —                  | 周   | 审核/长度/唯一 hash   |
| `C_COMMENT_THOUGHTFUL` | 留下建设性回应 | community | 2 条合格评论             |          4 | —                  | 周   | 不同作者              |
| `C_HELPFUL_ONE`        | 一次有启发     | community | 被标记 helpful           |          6 | —                  | 周   | 作者唯一              |
| `C_WELCOME_NEW`        | 欢迎新成员     | community | 回答 1 个新人问题        |          5 | —                  | 周   | 新人标记+双方账户限制 |
| `C_SPREAD_SHARE`       | 分享牌阵       | community | 发布通过审核的牌阵       |         10 | —                  | 月   | 一版本一次            |
| `C_METHOD_NOTE`        | 分享解读方法   | community | 合格方法帖               |          8 | —                  | 月   | 非 Reading 隐私内容   |
| `C_REPORT_VALID`       | 维护空间       | community | 举报确认有效             |          3 | —                  | 月   | 最多 2/月             |
| `C_REVISION`           | 完善自己的分享 | community | 根据反馈做实质修订       |          4 | —                  | 月   | diff+人工/规则审核    |
| `C_DIVERSE_VOICES`     | 回应不同声音   | community | 3 位不同作者互动         |          5 | —                  | 周   | 排除互刷组            |
| `C_CREATOR_GUIDE`      | 写一份使用说明 | community | 牌阵含安全说明与位置解释 |         10 | creator badge 进度 | 月   | 审核通过              |

## 11. Achievement & Badge V1

Achievement XP 是一次性 milestone bonus；同一事实若已由 long-term mission 奖励，则 achievement XP 取两者较高值而不相加（ledger 记录 `suppressed_by`）。

| Achievement ID       | 名称           | 描述/条件              | Tier     |  XP | Badge            | Title        | 隐藏 |
| -------------------- | -------------- | ---------------------- | -------- | --: | ---------------- | ------------ | ---- |
| `A_FIRST_READING`    | 第一页         | 首条有效 Reading       | Bronze   |  10 | first_page       | 初次记录     | 否   |
| `A_ONBOARDING`       | 找到入口       | 完成 onboarding        | Bronze   |   0 | doorway          | —            | 否   |
| `A_READINGS_10`      | 十页星图       | 10 Reading             | Bronze   |  20 | pages_10         | —            | 否   |
| `A_READINGS_50`      | 稳定书写       | 50 Reading             | Silver   |  40 | pages_50         | 稳定书写者   | 否   |
| `A_READINGS_100`     | 长期记录       | 100 Reading            | Gold     |  60 | pages_100        | 历史整理者   | 否   |
| `A_FIRST_FOLLOWUP`   | 现实来信       | 首次 Follow-Up         | Bronze   |  20 | reality_letter   | 回望者       | 否   |
| `A_FOLLOWUPS_10`     | 十次回望       | 10 Follow-Up           | Silver   |  35 | followup_10      | 耐心回望     | 否   |
| `A_FOLLOWUPS_50`     | 长期回望       | 50 Follow-Up           | Gold     |  70 | followup_50      | 现实记录者   | 否   |
| `A_CARD_10`          | 十张相遇       | 10 distinct cards      | Bronze   |  15 | cards_10         | 牌面观察者   | 否   |
| `A_MAJOR_22`         | 大牌之环       | 22 Major Arcana        | Gold     |  45 | major_22         | 大牌同行者   | 否   |
| `A_ALL_78`           | 完整牌途       | 78 cards               | Platinum | 100 | cards_78         | 七十八次相遇 | 否   |
| `A_WANDS_14`         | 权杖之路       | 全部权杖               | Silver   |  25 | suit_wands       | 火花记录者   | 否   |
| `A_CUPS_14`          | 圣杯之路       | 全部圣杯               | Silver   |  25 | suit_cups        | 水面倾听者   | 否   |
| `A_SWORDS_14`        | 宝剑之路       | 全部宝剑               | Silver   |  25 | suit_swords      | 清晰书写者   | 否   |
| `A_PENTACLES_14`     | 星币之路       | 全部星币               | Silver   |  25 | suit_pentacles   | 日常收藏者   | 否   |
| `A_UPRIGHT_REVERSED` | 两种方向       | 记录过正位与普通逆位   | Bronze   |  10 | two_orientations | 方向观察者   | 否   |
| `A_DUAL_LEFT_RIGHT`  | 左右之间       | 记录过 left 与 right   | Silver   |  20 | dual_paths       | 左右记录者   | 否   |
| `A_DUAL_NOTES`       | 两侧笔记       | 同一牌完成左右差异笔记 | Gold     |  30 | dual_notes       | 两侧书写者   | 是   |
| `A_SPREADS_3`        | 三种视角       | 3 spreads              | Bronze   |  15 | spreads_3        | 牌阵漫游者   | 否   |
| `A_SPREADS_6`        | 六种视角       | 6 spreads              | Silver   |  40 | spreads_6        | 位置编排者   | 否   |
| `A_CUSTOM_SPREAD`    | 自己的位置     | 首个自定义 spread      | Gold     |  25 | custom_spread    | 牌阵创作者   | 否   |
| `A_MEANING_FIRST`    | 自己的词语     | 首条个人牌义           | Bronze   |  15 | meaning_first    | 私人词典     | 否   |
| `A_MEANINGS_22`      | 二十二条注解   | 22 cards meanings      | Gold     |  60 | meanings_22      | 符号笔记者   | 否   |
| `A_MEANINGS_78`      | 个人牌义词典   | 78 cards meanings      | Platinum | 120 | meanings_78      | 词典编者     | 否   |
| `A_WEEKLY_FIRST`     | 一周回声       | 首个周 Review          | Bronze   |  15 | weekly_first     | 周期回望者   | 否   |
| `A_MONTHLY_FIRST`    | 月度镜面       | 首个月 Review          | Silver   |  30 | monthly_first    | 月度记录者   | 否   |
| `A_REVIEWS_12`       | 十二次周期     | 12 Reviews             | Gold     |  60 | reviews_12       | 周期整理者   | 否   |
| `A_ONE_YEAR`         | 一年之后       | 365 天跨度+24 活跃日   | Platinum |  80 | one_year         | 年轮同行者   | 否   |
| `A_RETURN`           | 欢迎回来       | ≥30 天后回归并完成回顾 | Bronze   |  20 | welcome_back     | 再次翻页     | 是   |
| `A_COMMUNITY_FIRST`  | 第一次分享     | 首个合格社区分享       | Bronze   |   0 | community_first  | 温和分享者   | 否   |
| `A_HELPFUL_FIRST`    | 一次启发       | 首次 helpful           | Silver   |   0 | helpful_first    | 有心回应者   | 否   |
| `A_FEATURED`         | 被认真阅读     | 首次精选               | Gold     |   0 | featured         | 精选作者     | 否   |
| `A_CREATOR_FIRST`    | 第一副公开牌阵 | 首个审核通过 spread    | Gold     |   0 | creator_first    | 牌阵创作者   | 否   |

社区/creator achievements 均为 **Future dependency**，奖励 Community Reputation 或称号，不增加 Personal XP。

## 12. Community Contribution（独立系统，Future dependency）

使用 Community Reputation Points（CRP），范围 0–10,000，内部显示精确值，公开默认只显示阶段与徽章；不设负分、不设全站榜单。违规通过 reversal 降至最低 0；严重行为走权限/封禁系统，而不是公开羞辱性负分。

| Stage |          CRP | 名称                             | 权限                                                 |
| ----- | -----------: | -------------------------------- | ---------------------------------------------------- |
| C0    |         0–49 | 旁观者 Observer                  | 浏览、收藏、举报                                     |
| C1    |       50–199 | 参与者 Participant               | 发布分享、评论（账号≥7 天）                          |
| C2    |      200–599 | 回应者 Contributor               | 标记自己帖子下 1 条 helpful/帖、参与新人问答         |
| C3    |    600–1,499 | 分享者 Sharer                    | 提交自定义牌阵审核、creator 申请                     |
| C4    |  1,500–3,499 | 维护者 Steward                   | 参与精选提名；无管理删除权                           |
| C5    | 3,500–10,000 | 长期贡献者 Long-term Contributor | creator profile 装饰、测试新创作工具；无占卜权威标识 |

| Event                  | CRP | 限制/验证                                                   |
| ---------------------- | --: | ----------------------------------------------------------- |
| 合格分享发布           |   8 | 2/日、8/周；≥80 有效字符或结构化 spread；唯一 hash          |
| 合格评论               |   2 | 5/日、20/周；≥20 有效字符；不同作者；自己帖子 0             |
| 评论被作者标记 helpful |  10 | 3/日、10/周；每帖仅 1 条；双方账号≥7 天；作者不能反复同一人 |
| 唯一用户点赞           |   1 | 10/日、30/周；取消后 24h pending，再结算；同一 actor 计 1   |
| 获得评论               |   0 | 热度不是贡献质量                                            |
| 牌阵发布通过审核       |  20 | 1/周；每版本一次                                            |
| 牌阵被收藏             |   1 | 10/周；唯一用户；取消后 reversal                            |
| 回答新人问题           |   8 | 2/日；被提问者/版主确认；不能自问自答                       |
| 内容精选               |  50 | 2/月；人工审核；可 reversal                                 |
| 有效举报               |   5 | 2/周；仅最终成立；恶意举报限制权限                          |

反滥用：新账号前 7 天发布/评论不结算 CRP（验证后补发）；自我互动 0；同两账户 7 日内同类互动最多 3 次计分；互赞环、批量短评、设备/网络异常只触发 hold 与人工审核，不自动公开指控。内容删除：用户正常删除已结算分享，CRP 保留；点赞/收藏撤销回滚对应互动 CRP；违规删除、抄袭、举报成立则 ledger reversal。封禁不删除账本，冻结公开阶段和权限以保留审计。

## 13. Title Catalog（至少 40）

| Title ID              | 中文名       | English                  | 类型       | 获取方式              | 永久     | 可装备 | 公开 |
| --------------------- | ------------ | ------------------------ | ---------- | --------------------- | -------- | ------ | ---- |
| `t_first_page`        | 初次记录     | First Page               | Journey    | 首条 Reading          | 是       | 是     | 可选 |
| `t_listener`          | 月下倾听者   | Moonlit Listener         | Journey    | Lv5                   | 是       | 是     | 可选 |
| `t_recorder`          | 稳定记录者   | Steady Recorder          | Journey    | Lv10                  | 是       | 是     | 可选 |
| `t_interpreter`       | 多重视角     | Many Perspectives        | Journey    | Lv17                  | 是       | 是     | 可选 |
| `t_reflector`         | 映照者       | Reflector                | Journey    | Lv25                  | 是       | 是     | 可选 |
| `t_companion`         | 长期同行者   | Long-term Companion      | Journey    | Lv34                  | 是       | 是     | 可选 |
| `t_starfaring`        | 星辰旅者     | Starfarer                | Journey    | Lv50                  | 是       | 是     | 可选 |
| `t_patient_return`    | 耐心回望     | Patient Return           | Reflection | 10 Follow-Up          | 是       | 是     | 可选 |
| `t_reality_recorder`  | 现实记录者   | Reality Recorder         | Reflection | 50 Follow-Up          | 是       | 是     | 可选 |
| `t_weekly_echo`       | 周期回望者   | Cycle Reflector          | Reflection | 首次周 Review         | 是       | 是     | 可选 |
| `t_monthly_recorder`  | 月度记录者   | Monthly Recorder         | Reflection | 首次月 Review         | 是       | 是     | 可选 |
| `t_year_companion`    | 年轮同行者   | Year Companion           | Reflection | 一年成就              | 是       | 是     | 可选 |
| `t_reframer`          | 再看一次     | Looking Again            | Reflection | 10 次理解变化         | 是       | 是     | 可选 |
| `t_quiet_writer`      | 安静书写者   | Quiet Writer             | Reflection | 25 条完整解读         | 是       | 是     | 可选 |
| `t_card_observer`     | 牌面观察者   | Card Observer            | Discovery  | 10 distinct cards     | 是       | 是     | 可选 |
| `t_major_companion`   | 大牌同行者   | Major Companion          | Discovery  | 22 Major              | 是       | 是     | 可选 |
| `t_full_deck`         | 七十八次相遇 | Seventy-eight Encounters | Discovery  | 78 cards              | 是       | 是     | 可选 |
| `t_wands`             | 火花记录者   | Spark Recorder           | Discovery  | 全权杖                | 是       | 是     | 可选 |
| `t_cups`              | 水面倾听者   | Water Listener           | Discovery  | 全圣杯                | 是       | 是     | 可选 |
| `t_swords`            | 清晰书写者   | Clear Writer             | Discovery  | 全宝剑                | 是       | 是     | 可选 |
| `t_pentacles`         | 日常收藏者   | Everyday Collector       | Discovery  | 全星币                | 是       | 是     | 可选 |
| `t_directions`        | 方向观察者   | Direction Observer       | Discovery  | 正/普通逆             | 是       | 是     | 可选 |
| `t_dual`              | 左右记录者   | Left & Right Recorder    | Discovery  | left/right            | 是       | 是     | 可选 |
| `t_spread_walker`     | 牌阵漫游者   | Spread Wanderer          | Spread     | 3 spreads             | 是       | 是     | 可选 |
| `t_position_editor`   | 位置编排者   | Position Arranger        | Spread     | 6 spreads             | 是       | 是     | 可选 |
| `t_mirror_spread`     | 镜面观察者   | Mirror Observer          | Spread     | 10 关系镜像           | 是       | 是     | 可选 |
| `t_open_table`        | 自由桌面     | Open Table               | Spread     | 25 自由牌桌           | 是       | 是     | 可选 |
| `t_custom_spread`     | 牌阵创作者   | Spread Creator           | Creator    | 首个自定义牌阵        | 是       | 是     | 可选 |
| `t_lexicon`           | 私人词典     | Personal Lexicon         | Creator    | 首条个人牌义          | 是       | 是     | 可选 |
| `t_lexicon_editor`    | 词典编者     | Lexicon Editor           | Creator    | 78 个人牌义           | 是       | 是     | 可选 |
| `t_gentle_sharer`     | 温和分享者   | Gentle Sharer            | Community  | 首次分享              | 是       | 是     | 可选 |
| `t_thoughtful_reply`  | 有心回应者   | Thoughtful Responder     | Community  | 首次 helpful          | 是       | 是     | 可选 |
| `t_community_steward` | 空间维护者   | Community Steward        | Community  | C4                    | 条件性   | 是     | 可选 |
| `t_long_contributor`  | 长期贡献者   | Long-term Contributor    | Community  | C5                    | 条件性   | 是     | 可选 |
| `t_featured_author`   | 精选作者     | Featured Author          | Creator    | 内容精选              | 是       | 是     | 可选 |
| `t_method_writer`     | 方法记录者   | Method Writer            | Creator    | 5 方法帖              | 是       | 是     | 可选 |
| `t_spread_guide`      | 牌阵说明者   | Spread Guide             | Creator    | 5 审核牌阵            | 是       | 是     | 可选 |
| `t_spring_mist`       | 春日薄雾     | Spring Mist              | Seasonal   | 春季 journey          | 获得后是 | 是     | 可选 |
| `t_summer_stars`      | 夏夜星点     | Summer Stars             | Seasonal   | 夏季 journey          | 获得后是 | 是     | 可选 |
| `t_autumn_pages`      | 秋日书页     | Autumn Pages             | Seasonal   | 秋季 journey          | 获得后是 | 是     | 可选 |
| `t_winter_moon`       | 冬月         | Winter Moon              | Seasonal   | 冬季 journey          | 获得后是 | 是     | 可选 |
| `t_welcome_back`      | 再次翻页     | Turning the Page Again   | Hidden     | 温和回归              | 是       | 是     | 可选 |
| `t_both_sides`        | 两侧书写者   | Writer of Both Sides     | Hidden     | 左右差异笔记          | 是       | 是     | 可选 |
| `t_slow_path`         | 慢慢抵达     | Arriving Slowly          | Hidden     | 账户≥2 年且 24 活跃日 | 是       | 是     | 可选 |

默认不公开；用户可隐藏全部 level/badge/title。Community 条件性称号在资格失效时停止公开装备，但保留历史获得记录。

## 14. 满级、模拟与数值判断

不采用 Prestige 重生：它会制造损失并迫使用户重新刷取。Level 50 后 XP ledger 继续记录合格事件，但 `verified_total_xp` 可继续增长而 `level=50`；展示重点转为：年度 Journey（每年独立、不清零历史）、Mastery collections（牌、牌阵、个人牌义完成度）、新内容 unlock track、achievement 和独立 Community Contribution。年度轨道只能提供纪念/视觉奖励，不售卖进度，不移除旧奖励。

模拟假设包含基础事件与 mission bonus，排除 Community CRP：Casual 240 XP/周、Regular 700 XP/周、Highly Engaged 1,150 XP/周；首次 onboarding 30 XP。实际发放受 180 基础 XP/日、25 daily mission XP/日和重复规则约束。

| 模型                                 | 7 天        | 30 天       | 90 天        | 180 天       | 365 天       | 预计 Level 50 |
| ------------------------------------ | ----------- | ----------- | ------------ | ------------ | ------------ | ------------- |
| Casual（2–3 日/周，偶尔 Follow-Up）  | 270 XP / L2 | 1,058 / L5  | 3,116 / L10  | 6,201 / L15  | 12,544 / L23 | 约 4.1 年     |
| Regular（5 日/周，定期回顾）         | 730 / L4    | 3,030 / L9  | 9,030 / L19  | 18,030 / L28 | 36,530 / L41 | 约 1.4 年     |
| Highly Engaged（几乎每日、深度回顾） | 1,180 / L5  | 4,959 / L13 | 14,816 / L25 | 29,601 / L37 | 50,960 / L50 | 约 10.2 个月  |

判断：前期不慢，高活跃用户不会数周满级；Casual 虽慢但不会因不参加社区受罚。一次完整 Follow-Up 通常 45–70 XP，高于单纯 Reading 的 8–24 XP；第四条及以后的当日 Reading 为 0 XP，能有效抑制刷抽牌。上线 8 周后按 P25/P50/P90 速度复核；若 Regular 365 天低于 L35，则基础 XP +10%；若 Highly Engaged 180 天超过 L45，则降低 mission 叠加而不追溯扣级。

## 15. 删除、编辑、导入与一致性

| 场景                | 推荐规则                                                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 正常删除 Reading    | 已验证 Personal XP 永久保留；ledger 保留 source tombstone/hash。用户已经付出过反思，不因数据整理被惩罚                |
| 删除后重建          | 相同 owner + event code + source fingerprint 在 90 天内不再发；不同真实记录可正常发                                   |
| 确认作弊/管理员纠错 | 创建负数 reversal event，引用原 `xp_event_id`；不物理删 ledger                                                        |
| Reading 编辑        | topic、日期、牌序、文字修改均不重发 completion；从不合格到首次合格的 reflection milestone 可补发一次                  |
| Follow-Up 编辑      | outcome/reflection milestone 首次满足时补发；之后修改 0；撤空不自动扣，作弊才 reversal                                |
| Review regenerate   | 不重发；period key 唯一                                                                                               |
| 账户删除            | cascade 删除私人 progression 与 unlock；公共内容匿名化/删除按隐私选择；审计所需反作弊 hash 用不可逆、限期 30 天后清除 |
| 历史导入            | 0 XP；计入统计、时间线、收藏/achievement事实，但导入成就单独标记，不触发 Reading XP                                   |
| 社区正常删除        | 原创贡献基础 CRP保留；互动型 CRP（赞/收藏）撤销；违规删除全部相关 CRP reversal                                        |

## 16. 事件驱动、离线与同步

```ts
type ProgressionEventCandidate = {
  id: string; // client UUID v4
  userId: string;
  eventCode: ProgressionEventCode;
  sourceType: 'reading' | 'follow_up' | 'review' | 'card_meaning' | 'mission' | 'achievement';
  sourceId: string;
  milestone: string; // completion/reflection/first-use...
  occurredAt: string; // audit only; not trusted for caps
  deviceId: string;
  idempotencyKey: string; // v1:user:event:source:milestone
  sourceRevision?: string;
  metadata: Record<string, string | number | boolean | null>;
  progressionVersion: number;
  clientSchemaVersion: number;
};

type VerifiedXpEvent = ProgressionEventCandidate & {
  receivedAt: string; // trusted server time
  verifiedAt: string;
  status: 'verified' | 'rejected' | 'reversed';
  xpAmount: number; // server-calculated
  ruleVersion: number;
  rejectionCode?: string;
  reversalOf?: string;
};
```

数据流：

1. Reading/Follow-Up repository 成功提交后，由 application coordinator 生成 candidate；UI 不直接发 XP。
2. local adapter 将 candidate 放入持久化 pending queue，并用同一静态 V1 规则显示 `provisionalXp`，明确标注“待同步”。
3. Supabase adapter 调用单一受控 RPC/Edge Function；服务端从 source 表重新读取并验证 owner、状态、内容资格、版本与上限。
4. 同一事务 `INSERT ... ON CONFLICT(idempotency_key) DO NOTHING` 写 ledger、更新 profile aggregate、achievement/mission progress、写 unlock；返回 authoritative profile。
5. 客户端将 pending 标记 verified/rejected；重复提交返回已有事件，不再加分。
6. 多设备以 append-only ledger 为准，profile 是可重建缓存；冲突不做 last-write-wins 加法。
7. 登录合并本地数据时先按现有业务 repository 合并 source，再提交候选；source 无法验证的事件 rejected，不上传完整私密文本到 progression metadata。

离线本地-only 用户可以永久使用 provisional progression；切换 Supabase 时必须明确说明云端会验证并可能调整未验证 XP。设备时钟不决定 cap；离线超过 30 天的事件仍可验证 source，但按 `receivedAt` 进入限额，分批结算且不越过历史日上限。网络失败不影响 Reading 保存。

## 17. 推荐数据模型（未来 migration，不在本任务创建）

所有 `public` 用户表启用 RLS；owner policy 必须同时使用 `USING ((select auth.uid())=user_id)` 与需要时的 `WITH CHECK`。客户端不直接 insert/update ledger、aggregate 或 unlock；只执行受控事件提交。service role/secret 永不进入 Expo 客户端。

| 表                                      | 目的与关键字段                                                                             | 唯一/版本/删除                                                   | RLS 与写权限                              |
| --------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ----------------------------------------- |
| `user_progression_profiles`             | `user_id PK`, verified/provisional total, level, display flags, config version, timestamps | user unique；aggregate 可由 ledger 重建；账户删除 cascade        | owner SELECT；仅 server/RPC UPDATE        |
| `xp_events`                             | append-only ledger：event/source/milestone/idempotency/status/xp/rule/reversal/times       | unique `idempotency_key`; unique reversal target；不 soft delete | owner SELECT；仅验证函数 INSERT           |
| `level_definitions`                     | level、cumulative、stage、curve version                                                    | unique `(version,level)`；immutable version                      | authenticated SELECT；后台写              |
| `reward_definitions`                    | reward catalog、type、availability、asset/config version                                   | unique `(catalog_version,reward_id)`；archive 不删               | SELECT；后台写                            |
| `user_unlocks`                          | user、reward、unlocked_at、source、state                                                   | unique `(user_id,reward_id)`；不因 catalog archive 删除          | owner SELECT；server INSERT               |
| `user_equipped_rewards`                 | user、slot、reward                                                                         | unique `(user_id,slot)`；FK unlock                               | owner SELECT；受控 RPC UPDATE，验证拥有权 |
| `achievement_definitions`               | 条件、tier、奖励、version                                                                  | unique version+id                                                | SELECT；后台写                            |
| `user_achievements`                     | user、achievement、progress、completed、source event                                       | unique user+achievement+version；完成后冻结                      | owner SELECT；server write                |
| `mission_definitions`                   | mission pool、条件、周期、奖励、版本                                                       | version+mission id                                               | SELECT；后台/Remote Config 发布           |
| `user_mission_progress`                 | user、mission、window、progress、claim event                                               | unique user+mission+window                                       | owner SELECT；server write                |
| `community_reputation_profiles`         | user、points、stage、visibility、moderation hold                                           | user unique；可重建                                              | public 仅按用户设置看 stage；server write |
| `community_reputation_events`           | 独立 append-only CRP ledger                                                                | unique idempotency；reversal                                     | owner/审核角色按需 SELECT；server write   |
| `progression_config_versions`           | progression/rule/curve/reward/achievement 版本与生效时间                                   | version PK；immutable                                            | authenticated SELECT；后台写              |
| `progression_event_queue`（local only） | pending candidates、retry count、sync status/error                                         | event UUID/idempotency unique；成功后压缩保留 30 天              | AsyncStorage/SQLite，仅设备               |

`created_at`/`updated_at` 用于 mutable aggregate；append-only event 只需 `created_at/received_at/verified_at`。定义归属建议：

- TypeScript 静态配置：V1 event codes、客户端资格提示、fallback level/reward catalog。
- 数据库版本表：生效规则、level curve、definitions、ledger、用户状态。
- Remote Config：任务池轮换、展示顺序、非安全性的实验开关；不能单独决定 XP。
- 后台：版本发布、人工 hold/reversal、内容审核和补偿；任何修改都写审计事件。

## 18. Anti-cheat enforcement matrix

| 规则                                               | 强制/监控/人工               | 实施阶段        |
| -------------------------------------------------- | ---------------------------- | --------------- |
| source owner/status、idempotency、milestone unique | 数据库强制                   | Phase 1         |
| 服务端时间日/周 cap、双设备事务锁                  | 数据库/RPC 强制              | Phase 1         |
| 编辑/删除/恢复不重复、reversal append-only         | 强制                         | Phase 1         |
| normalized exact duplicate/hash                    | 强制拒绝重复奖励，不拒绝保存 | Phase 1         |
| 高相似文本、短时相同问题                           | 监控+温和提示                | Phase 1         |
| 客户端时间异常、离线批量                           | 强制按 receivedAt；异常监控  | Phase 1         |
| 自赞、自评、同账户环、互动 cap、新账号 hold        | 强制                         | Community Phase |
| 批量低质评论、互赞网络、抄袭                       | 监控→人工审核                | Community Phase |
| 举报、精选、creator 资格、封禁                     | 人工审核+可审计 reversal     | Community Phase |

点赞取消在 24 小时 pending 窗口内不结算；结算后取消生成 reversal。管理员不能直接改 total，应创建 signed adjustment event，包含 reason、actor 和关联 case。

## 19. 配置版本管理

每条事件固定 `progressionVersion`、`ruleVersion`；profile 记录当前 `curveVersion`，unlock 记录 `catalogVersion`，achievement 记录定义版本。推荐 grandfathering：

- 已 verified XP 不按新规则重算，不降级；已解锁奖励永久保留。
- 新规则仅对 `effective_at` 后事件生效；所有用户在同一时刻切换，不长期运行两套用户曲线。
- 曲线降低门槛时向上重新派生 level 并补发中间奖励；提高门槛时冻结当前 level，后续 XP 填补差额，不降级。
- historical replay 只用于修复 bug/缺失事件，先 dry-run，按幂等 key 写补偿；禁止覆盖 ledger。
- 数值错误用 adjustment/reversal；大范围变化发布 release note 和一次性 compensation event。

## 20. 隐私、安全与伦理

- 私人 Reading 默认不进入社区；progression metadata 只存 source ID、计数和资格信号，不复制问题/解读正文。
- 用户可以关闭成长 UI、隐藏 level/badge/title、关闭 mission/连续记录提示；关闭后仍可在设置中查看数据并继续积累。
- 私密记录 Personal XP 不低于公开记录；公开行为只进入 CRP。
- 不用脆弱情绪、同一关系问题频率或 Follow-Up outcome 做促活画像。
- 不提供“准确率 XP”；`happened` 与 `did_not_happen` outcome 奖励相同。
- 不暗示 AI、高等级或社区阶段能确认他人想法；不公开全站排名。
- 数据导出应包含 ledger 与 unlock；账户删除遵循既有用户数据删除流程。

## 21. 分阶段实施

| Phase                                 | 范围                                                                                                 | 依赖/DB/Repository/UI                                                                                       | 测试                                                                                            | 风险与明确不含                                             |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1 Personal Progression MVP            | Reading/Follow-Up/weekly+monthly Review XP、50 level、ledger、10 badges、8 titles、首批纯视觉 unlock | 新 progression tables/RLS/RPC；local+Supabase `ProgressionRepository`; coordinator；Progress 页面与设置显隐 | idempotency、caps、offline queue、two-user RLS、reversal、source validation、local/cloud parity | 不含 missions轮换、community、AI、自定义牌阵；不锁核心功能 |
| 2 Missions & Achievements             | daily/weekly/long-term pools、完整 achievements、unlock inventory/equip                              | definitions/progress tables、Remote Config 发布流程、Mission UI                                             | window/timezone、重复叠加、配置版本、reduced motion                                             | 不含社区任务与排行榜                                       |
| 3 Community Contribution              | CRP、分享/评论/helpful/report、阶段权限                                                              | **Future dependency** 社区 schema、moderation、server functions                                             | self-action、rings、new account hold、delete/reversal、abuse                                    | 不进入 Personal XP；无公开榜单                             |
| 4 Creator Ecosystem                   | 自定义牌阵、审核发布、creator titles                                                                 | **Future dependency** spread editor/repository、审核后台                                                    | schema validation、ownership、versioning、unsafe content                                        | 不出售权威或概率优势                                       |
| 5 Seasonal & Advanced Personalization | annual journey、季节装饰、新主题/背景/效果                                                           | catalog version、asset delivery、主题 registry 扩展                                                         | expiry/archive、旧资产、离线 fallback、性能                                                     | 无 FOMO 倒计时、无奖励箱、无重生清零                       |

Phase 1 首批 reward 应只使用已具备的 theme/card back/background/reveal 组件能力；不存在的资源可先以 locked preview 隐藏，不能以空壳解锁欺骗用户。

## 22. Recommended V1 Frozen Decisions

以下每项均为 **PROPOSED — awaiting product owner approval**：

1. 等级上限 50；Level 50 需累计 50,960 XP。
2. 七阶段采用“初见者—倾听者—记录者—诠释者—映照者—同行者—星辰旅者”。
3. 曲线使用 `200n + 17.5n(n-1)`，不追求 78 级数字对应。
4. 基础事件 180 XP/日；daily missions 25/日；weekly missions 80/周。
5. 每日最多 3 条 Reading 获 completion XP；继续记录不限次数且不售卖次数。
6. Reading 基础 8/12/14 XP；深度解读额外 12–20 XP；牌数不增加 XP。
7. Follow-Up 完整组合 45–70 XP，明确高于单纯抽牌。
8. 周 Review 45 XP、月 Review 90 XP；年度 180 XP 为 Future dependency。
9. Personal XP 与 CRP 完全分账；社区热度不提升 Personal Level。
10. 核心单张/三张/自由牌桌、基础 Follow-Up/统计、隐私、无障碍、同步/导出不锁定。
11. 首批解锁只包含视觉表达和 Future 牌阵模板预览，不改变随机性。
12. 正常删除 Reading 保留 XP；仅作弊/管理员纠错使用 append-only reversal。
13. 编辑只能在 milestone 首次达到资格时补发，不能重复发奖。
14. 导入历史 0 XP，但可进入事实型收藏与统计。
15. 离线显示 provisional XP；云端基于 source 验证，append-only ledger 为权威。
16. 客户端不能提交 XP 数值；所有用户表 RLS，服务端事务执行 cap/idempotency。
17. 采用 progression/rule/curve/catalog/achievement 分版本与 grandfathering，不降级、不收回已解锁。
18. 满级后使用年度 journey、Mastery collection 和新内容轨道，不重生清零。
19. 不设全站排行榜；公开只显示用户自愿展示的社区阶段/徽章。
20. Phase 1 只做 Personal MVP；Missions 完整轮换、Community、Creator、Seasonal 分后续阶段。

## 23. 开放风险与上线观测

- **数值风险**：真实写作行为可能低于模拟；上线只观察事件计数/XP，不采集正文。8 周后按分位数调整未来规则，不追溯扣分。
- **内容资格风险**：字符规则可能对短而真实的中文不友好；客户端允许保存，只影响 bonus，并提供清楚解释与申诉/反馈入口。
- **离线公平风险**：local-only 无服务端可信时间；标注 provisional，登录时不承诺全部转换。
- **资源承诺风险**：大量 catalog 资产尚不存在；Phase 1 只发布实际资产，其他定义保持 archived/不可见。
- **架构风险**：现有 local 数据散布于 journal store、Review AsyncStorage、theme AsyncStorage；Progression 不应复制业务 source，只存事件与 aggregate。
- **社区风险**：社区 schema、审核与安全工具尚不存在，不能提前开放 CRP 权限。
- **伦理风险**：任何“准确率”“连续失败”“重复关系占问奖励”均禁止进入实验。

## 24. 核心问题快速结论

XP 来自可验证的完成与反思事件；每日首条仅一次，Reading/Follow-Up/mission 均有明确 cap。Level 50 是个人历程而非能力。正常删除保留 XP，编辑不重复，首次达到新 milestone 可补发。离线先 provisional，多设备由 idempotent ledger 合并。所有定义版本化；数据库存事实/用户状态，TypeScript/Remote Config 提供已发布规则镜像。功能、订阅、Community Reputation 与 Personal Level 保持独立。
