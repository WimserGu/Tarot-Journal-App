import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  EmptyMysticState,
  GlassPanel,
  MoonButton,
  MysticScreen,
  MysticText,
  SectionLabel,
} from '@/components/mystic';
import type { QuestionTemplate } from '@/domain/types';
import { TarotCardDisplay } from '@/features/draw/components/TarotCardDisplay';
import { addFollowUpCalendarDays } from '@/features/followups/followUpDate';
import {
  buildPendingFollowUpModel,
  followUpDetailRoute,
  followUpReadingRoute,
} from '@/features/followups/followUpPageModel';
import { usePendingFollowUps } from '@/features/followups/useFollowUps';
import { TodayQuestionCard } from '@/features/home/components/TodayQuestionCard';
import { TodayQuestionManagerModal } from '@/features/home/components/TodayQuestionManagerModal';
import { TopicSummaryCard } from '@/features/home/components/TopicSummaryCard';
import { buildHomeData, formatHomeDate } from '@/features/home/homeData';
import { useHomeRepositoryData } from '@/features/home/useHomeRepositoryData';
import { followUpRepository } from '@/repositories/repositoryFactory';
import { useAppTheme } from '@/theme/useAppTheme';

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [now] = useState(() => new Date());
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const homeRepository = useHomeRepositoryData();
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const [questionManagerOpen, setQuestionManagerOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionTemplate | null>(null);
  const [templateOverrides, setTemplateOverrides] = useState<QuestionTemplate[]>([]);
  const pending = usePendingFollowUps({ now: now.toISOString(), timezone: timeZone });
  const pendingModel = buildPendingFollowUpModel(pending.items);
  const questionTemplates = [
    ...homeRepository.data.questionTemplates.map(
      (template) => templateOverrides.find((item) => item.id === template.id) ?? template,
    ),
    ...templateOverrides.filter(
      (template) => !homeRepository.data.questionTemplates.some((item) => item.id === template.id),
    ),
  ];
  const homeData = buildHomeData({
    now,
    time_zone: timeZone,
    topics: homeRepository.data.topics,
    question_templates: questionTemplates,
    readings: homeRepository.data.readings,
    reading_cards: homeRepository.data.readingCards,
    tarot_cards: homeRepository.data.tarotCards,
  });
  const todayReading = homeData.recent_reading?.is_today ? homeData.recent_reading : null;

  return (
    <MysticScreen scroll>
      <View style={{ gap: theme.spacing.xs }}>
        <MysticText style={{ color: theme.colors.primarySoft }} variant="caption">
          {formatHomeDate(now, timeZone)} · MOONLIGHT JOURNAL
        </MysticText>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.spacing.sm }}>
          <MysticText style={{ flex: 1 }} variant="display">
            {homeData.greeting}
          </MysticText>
          <Ionicons color={theme.colors.warm} name="moon" size={28} />
        </View>
        <MysticText variant="caption">慢一点，听见此刻真正值得记录的事。</MysticText>
      </View>

      <View style={{ gap: theme.spacing.md }}>
        <SectionLabel description="今天的牌与问题会成为长期日记的一部分。" title="今日 Reading" />
        {todayReading ? (
          <GlassPanel variant="elevated">
            <View style={{ gap: theme.spacing.xs }}>
              <MysticText style={{ color: theme.colors.warm }} variant="caption">
                {todayReading.topic?.title ?? '自由记录'} · 今日已记录
              </MysticText>
              <MysticText variant="pageTitle">{todayReading.question_text}</MysticText>
            </View>
            {todayReading.cards.length > 0 ? (
              <View
                style={{
                  alignItems: 'flex-start',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: theme.spacing.md,
                  justifyContent: 'center',
                }}
              >
                {todayReading.cards.slice(0, 3).map((card) => (
                  <TarotCardDisplay
                    cardId={card.tarot_card_id}
                    key={`${card.tarot_card_id}-${card.card_key}`}
                    name={card.name_zh}
                    orientation={card.orientation}
                    reversalVariant={card.reversalVariant}
                    size="compact"
                  />
                ))}
              </View>
            ) : null}
            <MoonButton
              label="打开今日 Reading"
              onPress={() =>
                router.push({
                  pathname: '/readings/[readingId]',
                  params: { readingId: todayReading.reading.id },
                })
              }
            />
          </GlassPanel>
        ) : (
          <GlassPanel style={{ alignItems: 'center' }} variant="elevated">
            <View
              style={{
                alignItems: 'center',
                backgroundColor: theme.colors.glass,
                borderColor: theme.colors.glassBorder,
                borderRadius: theme.radii.pill,
                borderWidth: 1,
                height: 76,
                justifyContent: 'center',
                width: 76,
              }}
            >
              <Ionicons color={theme.colors.warm} name="moon-outline" size={36} />
            </View>
            <MysticText style={{ textAlign: 'center' }} variant="pageTitle">
              今天还没有留下牌面
            </MysticText>
            <MysticText style={{ maxWidth: 520, textAlign: 'center' }} variant="caption">
              带着一个真实的问题进入牌桌。App 记录你的观察，不替你宣告答案。
            </MysticText>
            <MoonButton label="开始今日抽牌" onPress={() => router.push('/draw' as Href)} />
          </GlassPanel>
        )}
      </View>

      <View style={{ gap: theme.spacing.md }}>
        <SectionLabel title="快速入口" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <MoonButton label="即时抽牌" onPress={() => router.push('/draw' as Href)} />
          <MoonButton
            label="手动录入实体牌"
            onPress={() => router.push('/readings/new')}
            variant="secondary"
          />
          <MoonButton
            label="抽牌历史"
            onPress={() => router.push('/draw/history')}
            variant="ghost"
          />
        </View>
      </View>

      {homeData.recent_reading ? (
        <View style={{ gap: theme.spacing.md }}>
          <SectionLabel description="回到最近一次记录，继续书写或安排回顾。" title="最近 Reading" />
          <GlassPanel variant="subtle">
            <MysticText style={{ color: theme.colors.primarySoft }} variant="caption">
              {homeData.recent_reading.topic?.title ?? '自由记录'} ·{' '}
              {formatHomeDate(homeData.recent_reading.reading.reading_at, timeZone)}
            </MysticText>
            <MysticText variant="cardTitle">{homeData.recent_reading.question_text}</MysticText>
            <MysticText variant="caption">
              {homeData.recent_reading.cards.length > 0
                ? homeData.recent_reading.cards
                    .map((card) => card.name_zh)
                    .slice(0, 5)
                    .join(' · ')
                : '这条记录暂时没有有效牌面'}
            </MysticText>
            <MoonButton
              label="继续查看"
              onPress={() =>
                router.push({
                  pathname: '/readings/[readingId]',
                  params: { readingId: homeData.recent_reading!.reading.id },
                })
              }
              variant="secondary"
            />
          </GlassPanel>
        </View>
      ) : null}

      <View style={{ gap: theme.spacing.md }}>
        <SectionLabel
          description={`已到期 ${pendingModel.overdueCount} · 今天 ${pendingModel.dueTodayCount}`}
          title="待回顾"
        />
        {pending.loading ? <MysticText variant="caption">正在加载待回顾…</MysticText> : null}
        {pending.error ? <MysticText>{pending.error}</MysticText> : null}
        {!pending.loading && !pending.error && pendingModel.isEmpty ? (
          <EmptyMysticState description="现在没有到期或即将到期的回顾。" title="暂时没有待回顾" />
        ) : null}
        {pendingModel.visibleItems.slice(0, 2).map((item) => (
          <GlassPanel key={item.followUp.id} variant="subtle">
            <MysticText style={{ color: theme.colors.warm }} variant="caption">
              {item.dueState === 'overdue' ? '已到期' : '即将回顾'}
            </MysticText>
            <MysticText variant="cardTitle">{item.questionText}</MysticText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              <MoonButton
                label="打开回顾"
                onPress={() => router.push(followUpDetailRoute(item.followUp.id))}
                variant="secondary"
              />
              <MoonButton
                label="原 Reading"
                onPress={() => router.push(followUpReadingRoute(item.followUp.readingId))}
                variant="ghost"
              />
              <MoonButton
                label="7 天后"
                onPress={() => {
                  setFollowUpError(null);
                  void followUpRepository
                    .snoozeFollowUp(
                      item.followUp.id,
                      addFollowUpCalendarDays(now.toISOString(), timeZone, 7),
                    )
                    .catch(() => setFollowUpError('暂时无法稍后提醒，请重试。'));
                }}
                variant="ghost"
              />
            </View>
          </GlassPanel>
        ))}
        {followUpError ? <MysticText>{followUpError}</MysticText> : null}
        {!pendingModel.isEmpty ? (
          <MoonButton
            label="查看全部回顾"
            onPress={() => router.push('/followups')}
            variant="ghost"
          />
        ) : null}
      </View>

      <View style={{ gap: theme.spacing.md }}>
        <View
          style={{
            alignItems: 'flex-end',
            flexDirection: 'row',
            gap: theme.spacing.md,
            justifyContent: 'space-between',
          }}
        >
          <SectionLabel
            description="重复的问题，会逐渐形成属于你的观察轨迹。"
            title="今日固定问题"
          />
          <MoonButton
            label="添加"
            onPress={() => {
              setEditingQuestion(null);
              setQuestionManagerOpen(true);
            }}
            variant="ghost"
          />
        </View>
        {homeRepository.loading ? (
          <MysticText variant="caption">正在加载固定问题…</MysticText>
        ) : null}
        {homeRepository.error ? <MysticText>{homeRepository.error}</MysticText> : null}
        {homeData.today_questions.length > 0 ? (
          homeData.today_questions.map((question) => (
            <TodayQuestionCard
              key={question.question_template.id}
              question={question}
              timeZone={timeZone}
              onEdit={() => {
                setEditingQuestion(question.question_template);
                setQuestionManagerOpen(true);
              }}
              onStart={() => {
                router.push({
                  pathname: '/draw/single',
                  params: {
                    topicId: question.topic.id,
                    questionTemplateId: question.question_template.id,
                    questionText: question.question_template.question_text,
                  },
                });
              }}
            />
          ))
        ) : !homeRepository.loading && !homeRepository.error ? (
          <EmptyMysticState
            actionLabel="添加固定问题"
            description="可以从“今日日运如何？”开始，也可以写下你真正想长期追踪的问题。"
            onAction={() => setQuestionManagerOpen(true)}
            title="今天没有固定问题"
          />
        ) : null}
      </View>

      <View style={{ gap: theme.spacing.md }}>
        <SectionLabel description="按长期议题回看重复出现的牌与现实反馈。" title="长期议题" />
        {homeData.topics.length > 0 ? (
          homeData.topics.slice(0, 4).map((summary) => (
            <TopicSummaryCard
              key={summary.topic.id}
              summary={summary}
              timeZone={timeZone}
              onPress={() =>
                router.push({
                  pathname: '/topics/[topicId]',
                  params: { topicId: summary.topic.id },
                })
              }
            />
          ))
        ) : (
          <EmptyMysticState
            actionLabel="创建长期议题"
            description="Topic 会把不同日期的 Reading 放进同一条观察线索。"
            onAction={() => router.push('/topics')}
            title="还没有长期议题"
          />
        )}
      </View>

      <TodayQuestionManagerModal
        editing={editingQuestion}
        onClose={() => setQuestionManagerOpen(false)}
        onSaved={(template) => {
          setTemplateOverrides((current) => [
            ...current.filter((item) => item.id !== template.id),
            template,
          ]);
          void homeRepository.reload();
        }}
        topics={homeRepository.data.topics.filter((topic) => topic.archived_at === null)}
        visible={questionManagerOpen}
      />
    </MysticScreen>
  );
}
