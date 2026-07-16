import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { MysticText as Text } from '@/components/mystic';
import type { TarotCard } from '@/domain/types';
import type { ReadingCardFormValue } from '@/features/readings/readingSchema';
import type { ReversalMode } from '@/features/draw/drawTypes';
import { reversalStatesForMode } from '@/features/draw/reversalPresentation';
import { TarotCardDisplay } from '@/features/draw/components/TarotCardDisplay';
import type { AppTheme } from '@/theme/types';
import { useAppTheme } from '@/theme/useAppTheme';

type ReadingCardEditorProps = {
  canRemove?: boolean;
  canMoveDown: boolean;
  canMoveUp: boolean;
  disabled: boolean;
  index: number;
  onChooseCard: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onOrientationChange: (orientation: ReadingCardFormValue['orientation']) => void;
  onReversalVariantChange: (
    variant: NonNullable<ReadingCardFormValue['reversalVariant']> | null,
  ) => void;
  onPositionNameChange: (value: string) => void;
  onInterpretationChange: (value: string) => void;
  onRemove: () => void;
  selectedCard: TarotCard | null;
  value: ReadingCardFormValue;
  reversalMode?: ReversalMode;
};

function ToolButton({
  accessibilityLabel,
  disabled,
  icon,
  onPress,
  tone = 'default',
}: {
  accessibilityLabel: string;
  disabled: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tone?: 'default' | 'danger';
}) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        baseStyles.toolButton,
        { opacity: disabled ? theme.opacity.disabled : pressed ? theme.opacity.pressed : 1 },
      ]}
    >
      <Ionicons
        color={tone === 'danger' ? theme.colors.danger : theme.icons.primary}
        name={icon}
        size={20}
      />
    </Pressable>
  );
}

export function ReadingCardEditor({
  canRemove = true,
  canMoveDown,
  canMoveUp,
  disabled,
  index,
  onChooseCard,
  onMoveDown,
  onMoveUp,
  onOrientationChange,
  onReversalVariantChange,
  onPositionNameChange,
  onInterpretationChange,
  onRemove,
  selectedCard,
  value,
  reversalMode,
}: ReadingCardEditorProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text variant="subtitle">第 {index + 1} 张牌</Text>
        <View style={styles.tools}>
          <ToolButton
            accessibilityLabel="上移这张牌"
            disabled={disabled || !canMoveUp}
            icon="arrow-up-outline"
            onPress={onMoveUp}
          />
          <ToolButton
            accessibilityLabel="下移这张牌"
            disabled={disabled || !canMoveDown}
            icon="arrow-down-outline"
            onPress={onMoveDown}
          />
          <ToolButton
            accessibilityLabel="删除这张牌"
            disabled={disabled || !canRemove}
            icon="trash-outline"
            onPress={onRemove}
            tone="danger"
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text variant="muted">牌阵位置</Text>
        <TextInput
          accessibilityLabel={`第 ${index + 1} 张牌的位置`}
          editable={!disabled}
          onChangeText={onPositionNameChange}
          placeholder="例如：现状"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          value={value.position_name}
        />
      </View>

      <View style={styles.field}>
        <Text variant="muted">塔罗牌</Text>
        <Pressable
          accessibilityLabel={`选择第 ${index + 1} 张塔罗牌`}
          accessibilityRole="button"
          disabled={disabled}
          onPress={onChooseCard}
          style={({ pressed }) => [
            styles.cardSelector,
            pressed && !disabled ? styles.pressed : null,
            disabled ? styles.toolButtonDisabled : null,
          ]}
        >
          {selectedCard ? (
            <TarotCardDisplay
              cardId={selectedCard.id}
              name={selectedCard.name_zh}
              orientation={value.orientation}
              reversalVariant={value.reversalVariant ?? null}
              size="compact"
            />
          ) : null}
          <View style={styles.cardSelectorCopy}>
            <Text>{selectedCard ? selectedCard.name_zh : '选择塔罗牌'}</Text>
            {selectedCard ? <Text variant="muted">{selectedCard.name_en}</Text> : null}
          </View>
          <Ionicons color={theme.colors.textMuted} name="chevron-forward" size={20} />
        </Pressable>
      </View>

      <View style={styles.field}>
        <Text variant="muted">方向</Text>
        <View style={styles.variantOptions}>
          {reversalStatesForMode(reversalMode).map((state) => {
            const selected =
              value.orientation === state.orientation &&
              (value.reversalVariant ?? null) === state.reversalVariant;

            return (
              <Pressable
                accessibilityLabel={`设为${state.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                disabled={disabled}
                key={`${state.orientation}:${state.reversalVariant ?? 'standard'}`}
                onPress={() => {
                  onOrientationChange(state.orientation);
                  onReversalVariantChange(state.reversalVariant);
                }}
                style={({ pressed }) => [
                  styles.variantOption,
                  selected ? styles.segmentSelected : null,
                  pressed && !disabled ? styles.pressed : null,
                ]}
              >
                <Text style={selected ? styles.segmentTextSelected : undefined}>{state.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text variant="muted">
        来源：{(value.source ?? 'manual') === 'drawn' ? 'App 抽取' : '手动添加'}
      </Text>

      <View style={styles.field}>
        <Text variant="muted">这张牌的解读（可选）</Text>
        <TextInput
          accessibilityLabel={`第 ${index + 1} 张牌的解读`}
          editable={!disabled}
          maxLength={5000}
          multiline
          numberOfLines={3}
          onChangeText={onInterpretationChange}
          placeholder="记录这张牌在本次问题中的含义"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.input, styles.interpretationInput]}
          textAlignVertical="top"
          value={value.interpretation ?? ''}
        />
      </View>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  toolButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.glass,
      borderColor: theme.colors.glassBorder,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
    },
    cardSelector: {
      alignItems: 'center',
      backgroundColor: theme.colors.glassSubtle,
      borderColor: theme.colors.glassBorder,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      flexDirection: 'row',
      gap: theme.spacing.md,
      minHeight: 52,
      padding: theme.spacing.sm,
    },
    cardSelectorCopy: {
      flex: 1,
      flexShrink: 1,
      gap: theme.spacing.xs,
    },
    field: {
      gap: theme.spacing.xs,
    },
    variantOption: {
      alignItems: 'center',
      backgroundColor: theme.colors.glassSubtle,
      borderColor: theme.colors.glassBorder,
      borderRadius: theme.radii.sm,
      borderWidth: 1,
      flexGrow: 1,
      justifyContent: 'center',
      minHeight: 44,
      paddingHorizontal: theme.spacing.sm,
    },
    variantOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
      justifyContent: 'space-between',
    },
    input: {
      backgroundColor: theme.colors.glassSubtle,
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
      minHeight: 88,
    },
    pressed: {
      opacity: theme.opacity.pressed,
    },
    segmentSelected: {
      backgroundColor: theme.colors.primary,
    },
    segmentTextSelected: {
      color: theme.colors.textPrimary,
      fontWeight: '700',
    },
    toolButtonDisabled: {
      opacity: theme.opacity.disabled,
    },
    tools: {
      flexDirection: 'row',
      flexShrink: 0,
    },
  });
}
