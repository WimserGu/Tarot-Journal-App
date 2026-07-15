import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/Text';
import type { TarotCard } from '@/domain/types';
import { CardArtwork } from '@/features/draw/components/CardArtwork';
import { borderRadii, colors, fontSizes, spacing } from '@/theme/tokens';

import {
  defaultTarotCardPickerFilters,
  applyArcanaFilter,
  filterTarotCards,
  hasActiveTarotCardPickerFilters,
  isTarotCardSelected,
  type ArcanaFilter,
  type SuitFilter,
} from '../tarotCardPickerState';

type TarotCardPickerModalProps = {
  cards: readonly TarotCard[];
  onClose: () => void;
  onSelect: (card: TarotCard) => void;
  selectedCardIds: readonly number[];
  visible: boolean;
};

const arcanaFilters: readonly { label: string; value: ArcanaFilter }[] = [
  { label: '全部', value: 'all' },
  { label: '大阿卡那', value: 'major' },
  { label: '小阿卡那', value: 'minor' },
];

const suitFilters: readonly { label: string; value: SuitFilter }[] = [
  { label: '全部花色', value: 'all' },
  { label: '权杖', value: 'wands' },
  { label: '圣杯', value: 'cups' },
  { label: '宝剑', value: 'swords' },
  { label: '星币', value: 'pentacles' },
];

const suitLabels = {
  cups: '圣杯',
  pentacles: '星币',
  swords: '宝剑',
  wands: '权杖',
} as const;

export function TarotCardPickerModal({
  cards,
  onClose,
  onSelect,
  selectedCardIds,
  visible,
}: TarotCardPickerModalProps) {
  const [filters, setFilters] = useState(defaultTarotCardPickerFilters);
  const matchingCards = useMemo(() => filterTarotCards(cards, filters), [cards, filters]);

  const selectCard = (card: TarotCard) => {
    setFilters((current) => ({ ...current, query: '' }));
    onSelect(card);
  };

  const clearFilters = () => setFilters(defaultTarotCardPickerFilters);

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text variant="title">选择塔罗牌</Text>
          <Pressable accessibilityLabel="关闭选牌" onPress={onClose} style={styles.closeButton}>
            <Ionicons color={colors.text} name="close" size={24} />
          </Pressable>
        </View>
        <TextInput
          accessibilityLabel="搜索塔罗牌"
          autoFocus
          onChangeText={(query) => setFilters((current) => ({ ...current, query }))}
          placeholder="搜索中文、英文或牌名标识"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          value={filters.query}
        />
        <View style={styles.filterHeader}>
          <Text variant="muted">分类</Text>
          {hasActiveTarotCardPickerFilters(filters) ? (
            <Pressable
              accessibilityLabel="清除搜索和筛选"
              accessibilityRole="button"
              onPress={clearFilters}
              style={({ pressed }) => [styles.clearButton, pressed ? styles.pressed : null]}
            >
              <Text style={styles.clearButtonText}>清除</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.arcanaFilters}>
          {arcanaFilters.map((filter) => {
            const selected = filters.arcana === filter.value;

            return (
              <Pressable
                accessibilityLabel={`筛选${filter.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={filter.value}
                onPress={() =>
                  setFilters((current) => applyArcanaFilter(current, filter.value))
                }
                style={({ pressed }) => [
                  styles.arcanaFilter,
                  selected ? styles.filterSelected : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={selected ? styles.filterSelectedText : undefined}>{filter.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {filters.arcana !== 'major' ? (
          <View style={styles.suitFilters}>
            {suitFilters.map((filter) => {
              const selected = filters.suit === filter.value;

              return (
                <Pressable
                  accessibilityLabel={`按${filter.label}筛选`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={filter.value}
                  onPress={() => setFilters((current) => ({ ...current, suit: filter.value }))}
                  style={({ pressed }) => [
                    styles.suitFilter,
                    selected ? styles.filterSelected : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text style={selected ? styles.filterSelectedText : undefined}>
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        <FlatList
          data={matchingCards}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(card) => String(card.id)}
          ListEmptyComponent={<Text variant="muted">没有匹配的塔罗牌。</Text>}
          renderItem={({ item: card }) =>
            (() => {
              const selected = isTarotCardSelected(card.id, selectedCardIds);
              const categoryLabel = card.arcana === 'major' ? '大阿卡那' : '小阿卡那';
              const suitLabel = card.suit === null ? null : suitLabels[card.suit];

              return (
                <Pressable
                  accessibilityLabel={`选择 ${card.name_zh}${selected ? '，已选' : ''}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => selectCard(card)}
                  style={({ pressed }) => [
                    styles.cardRow,
                    selected ? styles.cardRowSelected : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <View style={styles.cardFace}>
                    <CardArtwork
                      accessibilityLabel={`${card.name_zh}牌面缩略图`}
                      cardId={card.id}
                      orientation="upright"
                      size="picker"
                    />
                  </View>
                  <View style={styles.cardCopy}>
                    <Text>{card.name_zh}</Text>
                    <Text variant="muted">{card.name_en}</Text>
                    <Text variant="muted">{suitLabel ?? categoryLabel}</Text>
                  </View>
                  {selected ? (
                    <View style={styles.selectedStatus}>
                      <Ionicons color={colors.accent} name="checkmark-circle" size={20} />
                      <Text style={styles.selectedText}>已选</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })()
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  arcanaFilter: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.xs,
  },
  arcanaFilters: {
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardFace: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    minHeight: 72,
    paddingHorizontal: spacing.sm,
    width: 76,
  },
  cardCopy: {
    flex: 1,
    flexShrink: 1,
    gap: spacing.xs,
  },
  cardRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 84,
    overflow: 'hidden',
    paddingRight: spacing.md,
  },
  cardRowSelected: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  clearButton: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  clearButtonText: {
    color: colors.accent,
    fontWeight: '700',
  },
  closeButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterSelected: {
    backgroundColor: colors.accent,
  },
  filterSelectedText: {
    color: colors.surface,
    fontWeight: '700',
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  pressed: {
    opacity: 0.7,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  selectedStatus: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  selectedText: {
    color: colors.accent,
    fontSize: fontSizes.caption,
    fontWeight: '700',
  },
  searchInput: {
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
  separator: {
    height: spacing.xs,
  },
  suitFilter: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: spacing.sm,
  },
  suitFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
});
