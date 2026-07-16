import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { MoonButton as Button, MysticText as Text } from '@/components/mystic';
import type { TarotCard } from '@/domain/types';
import type { AppTheme } from '@/theme/types';
import { useAppTheme } from '@/theme/useAppTheme';
import { cardsForSpread } from '@/features/spreads/spreadMapping';
import { spreadRepository } from '@/features/spreads/spreadRepository';

import { ReadingCardEditor } from './ReadingCardEditor';
import { SelectionModal, type SelectionOption } from './SelectionModal';
import { TarotCardPickerModal } from './TarotCardPickerModal';
import { getDefaultCardsForTemplate } from '../readingFormState';
import {
  createEmptyReadingCard,
  getCompletedCardsError,
  readingFormSchema,
  type ReadingFormValues,
} from '../readingSchema';
import type { ReadingFormContext } from '../readingRepository';
import { LEGACY_UNSPECIFIED_SPREAD_LABEL, readingSpreadLabel } from '../readingSpreadPresentation';
import type { ReversalMode } from '@/features/draw/drawTypes';

type ReadingFormProps = {
  context: ReadingFormContext;
  initialValues: ReadingFormValues;
  isSaving: boolean;
  onCreateTopic: () => void;
  onDirtyChange: (isDirty: boolean) => void;
  onSave: (values: ReadingFormValues, status: 'draft' | 'completed') => Promise<void>;
  saveError: string | null;
  unspecifiedSpreadLabel?: string;
  reversalMode?: ReversalMode;
};

function isBlankCard(card: ReadingFormValues['cards'][number]): boolean {
  return card.tarot_card_id === null;
}

export function ReadingForm({
  context,
  initialValues,
  isSaving,
  onCreateTopic,
  onDirtyChange,
  onSave,
  saveError,
  unspecifiedSpreadLabel = LEGACY_UNSPECIFIED_SPREAD_LABEL,
  reversalMode,
}: ReadingFormProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const colors = useMemo(
    () => ({
      accent: theme.colors.primarySoft,
      textMuted: theme.colors.textMuted,
    }),
    [theme],
  );
  const {
    clearErrors,
    control,
    formState: { errors, isDirty, isSubmitting },
    getValues,
    handleSubmit,
    setError,
    setValue,
  } = useForm<ReadingFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(readingFormSchema),
  });
  const { append, fields, move, replace } = useFieldArray({ control, name: 'cards' });
  const cards = useWatch({ control, name: 'cards' }) ?? [];
  const selectedTopicId = useWatch({ control, name: 'topic_id' });
  const selectedSpreadId = useWatch({ control, name: 'spread_id' });
  const questionMode = useWatch({ control, name: 'question_mode' });
  const selectedTemplateId = useWatch({ control, name: 'question_template_id' });
  const selectedQuestionTagId = useWatch({ control, name: 'question_tag_id' });
  const [isTopicPickerVisible, setTopicPickerVisible] = useState(false);
  const [isQuestionPickerVisible, setQuestionPickerVisible] = useState(false);
  const [isSpreadPickerVisible, setSpreadPickerVisible] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);
  const tarotCardsById = useMemo(
    () => new Map(context.tarot_cards.map((card) => [card.id, card])),
    [context.tarot_cards],
  );
  const selectedTopic = context.topics.find((topic) => topic.id === selectedTopicId);
  const selectedTemplate = context.question_templates.find(
    (template) => template.id === selectedTemplateId,
  );
  const availableQuestions = context.question_templates.filter(
    (template) => template.topic_id === selectedTopicId,
  );
  const availableQuestionTags = context.question_tags.filter(
    (tag) => tag.topic_id === selectedTopicId,
  );
  const selectedSpread = selectedSpreadId ? spreadRepository.getSpread(selectedSpreadId) : null;

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  if (context.topics.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text variant="subtitle">先创建一个长期议题</Text>
        <Button label="创建长期议题" onPress={onCreateTopic} />
      </View>
    );
  }

  const topicOptions: SelectionOption[] = context.topics.map((topic) => ({
    id: topic.id,
    label: topic.title,
    description: topic.description ?? undefined,
  }));
  const questionOptions: SelectionOption[] = availableQuestions.map((template) => ({
    id: template.id,
    label: template.question_text,
    description:
      template.frequency === 'daily' ? '每日' : template.frequency === 'weekly' ? '每周' : '按需',
  }));
  const spreadOptions: SelectionOption[] = spreadRepository.listSpreads().map((spread) => ({
    id: spread.id,
    label: spread.name,
    description: spread.description,
  }));
  const disabled = isSaving || isSubmitting;

  const selectTopic = (topicId: string) => {
    const currentTemplate = context.question_templates.find(
      (template) => template.id === getValues('question_template_id'),
    );

    setValue('topic_id', topicId, { shouldDirty: true, shouldValidate: true });

    if (currentTemplate?.topic_id !== topicId) {
      setValue('question_mode', 'temporary', { shouldDirty: true, shouldValidate: true });
      setValue('question_template_id', null, { shouldDirty: true, shouldValidate: true });
    }
    const currentTag = context.question_tags.find((tag) => tag.id === getValues('question_tag_id'));
    if (currentTag?.topic_id !== topicId) {
      setValue('question_tag_id', null, { shouldDirty: true, shouldValidate: true });
    }

    setTopicPickerVisible(false);
  };

  const selectTemplate = (templateId: string) => {
    const currentCards = getValues('cards');
    const shouldApplyDefaultPositions =
      currentCards.length === 0 || currentCards.every((card) => isBlankCard(card));

    setValue('question_mode', 'template', { shouldDirty: true, shouldValidate: true });
    setValue('question_template_id', templateId, { shouldDirty: true, shouldValidate: true });
    setValue('temporary_question', '', { shouldDirty: true });

    if (shouldApplyDefaultPositions) {
      replace(getDefaultCardsForTemplate(context, templateId));
    }

    setQuestionPickerVisible(false);
  };

  const applySpread = (spreadId: string) => {
    const current = getValues('cards');
    const spread = spreadRepository.resolveSpread(
      spreadId,
      spreadId === 'open' ? Math.max(1, Math.min(10, current.length)) : undefined,
    );
    setValue('spread_id', spreadId, { shouldDirty: true, shouldValidate: true });
    replace(cardsForSpread(spread, current));
    setSpreadPickerVisible(false);
  };

  const selectSpread = (spreadId: string) => {
    const current = getValues('cards');
    const next = spreadRepository.resolveSpread(
      spreadId,
      spreadId === 'open' ? Math.max(1, Math.min(10, current.length)) : undefined,
    );
    const removed = current
      .slice(next.positions.length)
      .some((card) => card.tarot_card_id !== null);
    if (!removed) return applySpread(spreadId);
    Alert.alert(
      '更换牌阵会移除牌面',
      `新牌阵只有 ${next.positions.length} 个位置。确认移除多出的已选牌吗？`,
      [
        { text: '取消', style: 'cancel' },
        { text: '确认更换', style: 'destructive', onPress: () => applySpread(spreadId) },
      ],
    );
  };

  const selectTarotCard = (tarotCard: TarotCard) => {
    if (activeCardIndex === null) {
      return;
    }

    const cardCount = getValues('cards').length;
    setValue(`cards.${activeCardIndex}.tarot_card_id`, tarotCard.id, {
      shouldDirty: true,
      shouldValidate: true,
    });
    clearErrors('cards');

    if (activeCardIndex === cardCount - 1 && selectedSpread?.isOpen && cardCount < 10) {
      const spread = spreadRepository.resolveSpread('open', cardCount + 1);
      append(cardsForSpread(spread)[cardCount]!);
    }

    setActiveCardIndex(null);
  };

  const save = (status: 'draft' | 'completed') => {
    if (disabled) {
      return;
    }

    void handleSubmit(async (values) => {
      clearErrors('cards');

      if (status === 'completed') {
        const completionError = getCompletedCardsError(values.cards);

        if (completionError) {
          setError('cards', { message: completionError, type: 'manual' });
          return;
        }
      }

      await onSave(values, status);
    })();
  };

  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <Text variant="subtitle">牌阵</Text>
        <Pressable
          accessibilityLabel="选择牌阵"
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => setSpreadPickerVisible(true)}
          style={({ pressed }) => [
            styles.selector,
            pressed && styles.pressed,
            disabled && styles.disabled,
          ]}
        >
          <Text>{readingSpreadLabel(selectedSpread?.name, unspecifiedSpreadLabel)}</Text>
          <Ionicons color={colors.textMuted} name="chevron-down" size={18} />
        </Pressable>
      </View>
      <View style={styles.field}>
        <Text variant="subtitle">长期议题</Text>
        <Pressable
          accessibilityLabel="选择长期议题"
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => setTopicPickerVisible(true)}
          style={({ pressed }) => [
            styles.selector,
            pressed && !disabled ? styles.pressed : null,
            disabled ? styles.disabled : null,
          ]}
        >
          <Text>{selectedTopic?.title ?? '选择长期议题'}</Text>
          <Ionicons color={colors.textMuted} name="chevron-forward" size={20} />
        </Pressable>
        {errors.topic_id?.message ? (
          <Text style={styles.errorText}>{errors.topic_id.message}</Text>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text variant="subtitle">问题标签（可选）</Text>
        <Text variant="muted">标签只属于当前 Topic，用于汇总不同时间里表达相近的问题。</Text>
        {!selectedTopicId ? (
          <Pressable
            accessibilityLabel="先选择长期议题，再选择问题标签"
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => setTopicPickerVisible(true)}
            style={({ pressed }) => [
              styles.selector,
              pressed && !disabled ? styles.pressed : null,
              disabled ? styles.disabled : null,
            ]}
          >
            <Text>先选择长期议题</Text>
            <Ionicons color={colors.textMuted} name="chevron-forward" size={20} />
          </Pressable>
        ) : (
          <View style={styles.segmentedControl}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: selectedQuestionTagId === null }}
              disabled={disabled}
              onPress={() =>
                setValue('question_tag_id', null, { shouldDirty: true, shouldValidate: true })
              }
              style={[
                styles.segment,
                selectedQuestionTagId === null ? styles.segmentSelected : null,
              ]}
            >
              <Text style={selectedQuestionTagId === null ? styles.segmentTextSelected : undefined}>
                未分类
              </Text>
            </Pressable>
            {availableQuestionTags.map((tag) => {
              const selected = selectedQuestionTagId === tag.id;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  disabled={disabled}
                  key={tag.id}
                  onPress={() =>
                    setValue('question_tag_id', tag.id, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  style={[styles.segment, selected ? styles.segmentSelected : null]}
                >
                  <Text style={selected ? styles.segmentTextSelected : undefined}>{tag.name}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
        {selectedTopicId && availableQuestionTags.length === 0 ? (
          <Text variant="muted">可在 Topic 详情页添加问题标签和关系类推荐标签。</Text>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text variant="subtitle">问题</Text>
        <View style={styles.segmentedControl}>
          {(
            [
              ['template', '固定问题'],
              ['temporary', '临时问题'],
            ] as const
          ).map(([mode, label]) => {
            const selected = questionMode === mode;

            return (
              <Pressable
                accessibilityLabel={`使用${label}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                disabled={disabled}
                key={mode}
                onPress={() => {
                  setValue('question_mode', mode, { shouldDirty: true, shouldValidate: true });

                  if (mode === 'temporary') {
                    setValue('question_template_id', null, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }
                }}
                style={({ pressed }) => [
                  styles.segment,
                  selected ? styles.segmentSelected : null,
                  pressed && !disabled ? styles.pressed : null,
                ]}
              >
                <Text style={selected ? styles.segmentTextSelected : undefined}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {questionMode === 'template' ? (
          <>
            <Pressable
              accessibilityLabel="选择固定问题"
              accessibilityRole="button"
              disabled={disabled || !selectedTopicId}
              onPress={() => setQuestionPickerVisible(true)}
              style={({ pressed }) => [
                styles.selector,
                pressed && !disabled ? styles.pressed : null,
                disabled || !selectedTopicId ? styles.disabled : null,
              ]}
            >
              <Text>{selectedTemplate?.question_text ?? '选择固定问题'}</Text>
              <Ionicons color={colors.textMuted} name="chevron-forward" size={20} />
            </Pressable>
            {errors.question_template_id?.message ? (
              <Text style={styles.errorText}>{errors.question_template_id.message}</Text>
            ) : null}
            {selectedTopicId && availableQuestions.length === 0 ? (
              <Text variant="muted">这个议题还没有启用中的固定问题。</Text>
            ) : null}
          </>
        ) : (
          <Controller
            control={control}
            name="temporary_question"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextInput
                accessibilityLabel="临时问题"
                editable={!disabled}
                maxLength={1000}
                multiline
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="输入本次想记录的问题"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.questionInput]}
                textAlignVertical="top"
                value={value}
              />
            )}
          />
        )}
        {errors.temporary_question?.message ? (
          <Text style={styles.errorText}>{errors.temporary_question.message}</Text>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text variant="subtitle">日期和时间</Text>
        <View style={styles.dateTimeRow}>
          <Controller
            control={control}
            name="reading_date"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextInput
                accessibilityLabel="记录日期"
                editable={!disabled}
                keyboardType="numbers-and-punctuation"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="2026-07-10"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.dateInput]}
                value={value}
              />
            )}
          />
          <Controller
            control={control}
            name="reading_time"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextInput
                accessibilityLabel="记录时间"
                editable={!disabled}
                keyboardType="numbers-and-punctuation"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="08:30"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.timeInput]}
                value={value}
              />
            )}
          />
        </View>
        {errors.reading_date?.message ? (
          <Text style={styles.errorText}>{errors.reading_date.message}</Text>
        ) : null}
        {errors.reading_time?.message ? (
          <Text style={styles.errorText}>{errors.reading_time.message}</Text>
        ) : null}
      </View>

      <View style={styles.cardsSection}>
        <Text variant="subtitle">牌面</Text>
        {fields.map((field, index) => {
          const value = cards[index] ?? createEmptyReadingCard();
          const selectedCard =
            value.tarot_card_id === null ? null : (tarotCardsById.get(value.tarot_card_id) ?? null);

          return (
            <ReadingCardEditor
              canRemove={selectedSpread?.isOpen === true || selectedSpreadId === null}
              canMoveDown={selectedSpreadId === null && index < fields.length - 1}
              canMoveUp={selectedSpreadId === null && index > 0}
              disabled={disabled}
              index={index}
              key={field.id}
              onChooseCard={() => setActiveCardIndex(index)}
              onMoveDown={() => move(index, index + 1)}
              onMoveUp={() => move(index, index - 1)}
              onOrientationChange={(orientation) => {
                setValue(`cards.${index}.orientation`, orientation, { shouldDirty: true });
                if (orientation === 'upright') {
                  setValue(`cards.${index}.reversalVariant`, null, { shouldDirty: true });
                }
              }}
              onReversalVariantChange={(variant) => {
                setValue(`cards.${index}.reversalVariant`, variant, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
              onPositionNameChange={(positionName) => {
                if (selectedSpreadId === null)
                  setValue(`cards.${index}.position_name`, positionName, { shouldDirty: true });
              }}
              onInterpretationChange={(interpretation) =>
                setValue(`cards.${index}.interpretation`, interpretation, { shouldDirty: true })
              }
              onRemove={() => {
                if (selectedSpread?.isOpen || selectedSpreadId === null) {
                  const remaining = getValues('cards').filter(
                    (_, candidate) => candidate !== index,
                  );
                  if (selectedSpread?.isOpen) {
                    const spread = spreadRepository.resolveSpread(
                      'open',
                      Math.max(1, remaining.length),
                    );
                    replace(cardsForSpread(spread, remaining));
                  } else {
                    replace(remaining);
                  }
                  clearErrors('cards');
                }
              }}
              selectedCard={selectedCard}
              value={value}
              reversalMode={reversalMode}
            />
          );
        })}
        {selectedSpread?.isOpen && fields.length < 10 ? (
          <Pressable
            accessibilityLabel="添加一张牌"
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => {
              const spread = spreadRepository.resolveSpread('open', fields.length + 1);
              append(cardsForSpread(spread)[fields.length]!);
            }}
            style={({ pressed }) => [
              styles.addCardButton,
              pressed && !disabled ? styles.pressed : null,
              disabled ? styles.disabled : null,
            ]}
          >
            <Ionicons color={colors.accent} name="add" size={20} />
            <Text style={styles.addCardLabel}>添加一张牌</Text>
          </Pressable>
        ) : null}
        {errors.cards?.message ? (
          <Text style={styles.errorText}>{errors.cards.message}</Text>
        ) : null}
      </View>

      <View style={styles.field}>
        <Text variant="subtitle">总体解读</Text>
        <Controller
          control={control}
          name="interpretation"
          render={({ field: { onBlur, onChange, value } }) => (
            <TextInput
              accessibilityLabel="总体解读"
              editable={!disabled}
              maxLength={5000}
              multiline
              numberOfLines={5}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="写下这次抽牌的整体观察和感受"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.interpretationInput]}
              textAlignVertical="top"
              value={value}
            />
          )}
        />
        {errors.interpretation?.message ? (
          <Text style={styles.errorText}>{errors.interpretation.message}</Text>
        ) : null}
      </View>

      {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
      <View style={styles.saveActions}>
        <Button
          accessibilityLabel="暂存草稿"
          disabled={disabled}
          label="暂存草稿"
          loading={disabled}
          onPress={() => save('draft')}
          style={styles.saveAction}
          variant="secondary"
        />
        <Button
          accessibilityLabel="保存正式记录"
          disabled={disabled}
          label="保存记录"
          loading={disabled}
          onPress={() => save('completed')}
          style={styles.saveAction}
        />
      </View>

      <SelectionModal
        emptyMessage="没有可用牌阵。"
        onClose={() => setSpreadPickerVisible(false)}
        onSelect={selectSpread}
        options={spreadOptions}
        title="选择牌阵"
        visible={isSpreadPickerVisible}
      />
      <SelectionModal
        emptyMessage="还没有长期议题。"
        onClose={() => setTopicPickerVisible(false)}
        onSelect={selectTopic}
        options={topicOptions}
        title="选择长期议题"
        visible={isTopicPickerVisible}
      />
      <SelectionModal
        emptyMessage="这个议题还没有启用中的固定问题。"
        onClose={() => setQuestionPickerVisible(false)}
        onSelect={selectTemplate}
        options={questionOptions}
        title="选择固定问题"
        visible={isQuestionPickerVisible}
      />
      <TarotCardPickerModal
        cards={context.tarot_cards}
        onClose={() => setActiveCardIndex(null)}
        onSelect={selectTarotCard}
        selectedCardIds={cards.flatMap((card) =>
          card.tarot_card_id === null ? [] : [card.tarot_card_id],
        )}
        visible={activeCardIndex !== null}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    addCardButton: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      flexDirection: 'row',
      gap: theme.spacing.xs,
      minHeight: 44,
      paddingHorizontal: theme.spacing.sm,
    },
    addCardLabel: {
      color: theme.colors.primarySoft,
      fontWeight: '700',
    },
    cardsSection: {
      gap: theme.spacing.lg,
    },
    dateInput: {
      flex: 1,
      minWidth: 160,
    },
    dateTimeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    disabled: {
      opacity: theme.opacity.disabled,
    },
    emptyState: {
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.lg,
    },
    errorText: {
      color: theme.colors.danger,
    },
    field: {
      backgroundColor: theme.colors.glassSubtle,
      borderColor: theme.colors.glassBorder,
      borderRadius: theme.radii.lg,
      borderWidth: theme.borders.hairline,
      gap: theme.spacing.sm,
      padding: theme.spacing.lg,
    },
    form: {
      gap: theme.spacing.lg,
    },
    input: {
      backgroundColor: theme.colors.glass,
      borderColor: theme.colors.glassBorder,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      color: theme.colors.textPrimary,
      fontSize: theme.typography.body,
      lineHeight: 24,
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    interpretationInput: {
      minHeight: 144,
    },
    pressed: {
      opacity: theme.opacity.pressed,
    },
    questionInput: {
      minHeight: 96,
    },
    saveActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    saveAction: {
      flex: 1,
      minWidth: 180,
    },
    segment: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      minHeight: 44,
      paddingHorizontal: theme.spacing.sm,
    },
    segmentedControl: {
      backgroundColor: theme.colors.glass,
      borderColor: theme.colors.glassBorder,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      flexDirection: 'row',
      overflow: 'hidden',
    },
    segmentSelected: {
      backgroundColor: theme.colors.primary,
    },
    segmentTextSelected: {
      color: theme.colors.textPrimary,
      fontWeight: '700',
    },
    selector: {
      alignItems: 'center',
      backgroundColor: theme.colors.glass,
      borderColor: theme.colors.glassBorder,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 52,
      paddingHorizontal: theme.spacing.md,
    },
    timeInput: {
      flexBasis: 104,
      flexGrow: 1,
    },
  });
}
