import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/Text';
import type { TarotCard } from '@/domain/types';
import type { ReadingCardFormValue } from '@/features/readings/readingSchema';
import { borderRadii, colors, fontSizes, spacing } from '@/theme/tokens';

import { toggleCardOrientation } from '../tarotCardPickerState';

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
  onReversalExpressionChange: (
    expression: NonNullable<ReadingCardFormValue['reversalExpression']> | null,
  ) => void;
  onPositionNameChange: (value: string) => void;
  onRemove: () => void;
  selectedCard: TarotCard | null;
  value: ReadingCardFormValue;
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
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolButton,
        disabled ? styles.toolButtonDisabled : null,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      <Ionicons color={tone === 'danger' ? colors.danger : colors.text} name={icon} size={20} />
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
  onReversalExpressionChange,
  onPositionNameChange,
  onRemove,
  selectedCard,
  value,
}: ReadingCardEditorProps) {
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
          placeholderTextColor={colors.textMuted}
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
          <View style={styles.cardSelectorCopy}>
            <Text>{selectedCard ? selectedCard.name_zh : '选择塔罗牌'}</Text>
            {selectedCard ? <Text variant="muted">{selectedCard.name_en}</Text> : null}
          </View>
          <Ionicons color={colors.textMuted} name="chevron-forward" size={20} />
        </Pressable>
      </View>

      <View style={styles.field}>
        <Text variant="muted">方向</Text>
        <View style={styles.segmentedControl}>
          {(['upright', 'reversed'] as const).map((orientation) => {
            const selected = value.orientation === orientation;

            return (
              <Pressable
                accessibilityLabel={orientation === 'upright' ? '设为正位' : '设为逆位'}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                disabled={disabled}
                key={orientation}
                onPress={() => onOrientationChange(orientation)}
                style={({ pressed }) => [
                  styles.segment,
                  selected ? styles.segmentSelected : null,
                  pressed && !disabled ? styles.pressed : null,
                ]}
              >
                <Text style={selected ? styles.segmentTextSelected : undefined}>
                  {orientation === 'upright' ? '正位' : '逆位'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          accessibilityLabel={value.orientation === 'upright' ? '快速切换为逆位' : '快速切换为正位'}
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => onOrientationChange(toggleCardOrientation(value.orientation))}
          style={({ pressed }) => [
            styles.orientationToggle,
            pressed && !disabled ? styles.pressed : null,
            disabled ? styles.toolButtonDisabled : null,
          ]}
        >
          <Ionicons color={colors.accent} name="swap-horizontal" size={18} />
          <Text style={styles.orientationToggleText}>
            {value.orientation === 'upright' ? '切换为逆位' : '切换为正位'}
          </Text>
        </Pressable>
      </View>

      {value.orientation === 'reversed' ? (
        <View style={styles.field}>
          <Text variant="muted">逆位表达</Text>
          <View style={styles.expressionOptions}>
            {(
              [
                [null, '普通逆位'],
                ['underexpressed', '表达不足'],
                ['overexpressed', '表达过度'],
              ] as const
            ).map(([expression, label]) => {
              const selected = (value.reversalExpression ?? null) === expression;
              return (
                <Pressable
                  accessibilityLabel={`设置为${label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  disabled={disabled}
                  key={expression ?? 'standard'}
                  onPress={() => onReversalExpressionChange(expression)}
                  style={({ pressed }) => [
                    styles.expressionOption,
                    selected ? styles.segmentSelected : null,
                    pressed && !disabled ? styles.pressed : null,
                  ]}
                >
                  <Text style={selected ? styles.segmentTextSelected : undefined}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <Text variant="muted">
        来源：{(value.source ?? 'manual') === 'drawn' ? 'App 抽取' : '手动添加'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  cardSelector: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  cardSelectorCopy: {
    flex: 1,
    flexShrink: 1,
    gap: spacing.xs,
  },
  field: {
    gap: spacing.xs,
  },
  expressionOption: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: borderRadii.sm,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  expressionOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: fontSizes.body,
    lineHeight: 24,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.72,
  },
  orientationToggle: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.xs,
  },
  orientationToggleText: {
    color: colors.accent,
    fontWeight: '700',
  },
  segment: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  segmentedControl: {
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  segmentSelected: {
    backgroundColor: colors.accent,
  },
  segmentTextSelected: {
    color: colors.surface,
    fontWeight: '700',
  },
  toolButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  toolButtonDisabled: {
    opacity: 0.35,
  },
  tools: {
    flexDirection: 'row',
    flexShrink: 0,
  },
});
