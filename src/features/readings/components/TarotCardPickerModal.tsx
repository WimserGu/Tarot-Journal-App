import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/Text';
import { searchTarotCards } from '@/domain/readingUtils';
import type { TarotCard } from '@/domain/types';
import { borderRadii, colors, fontSizes, spacing } from '@/theme/tokens';

type TarotCardPickerModalProps = {
  cards: readonly TarotCard[];
  onClose: () => void;
  onSelect: (card: TarotCard) => void;
  visible: boolean;
};

export function TarotCardPickerModal({
  cards,
  onClose,
  onSelect,
  visible,
}: TarotCardPickerModalProps) {
  const [query, setQuery] = useState('');
  const matchingCards = useMemo(() => searchTarotCards(query, cards), [cards, query]);

  const selectCard = (card: TarotCard) => {
    setQuery('');
    onSelect(card);
  };

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
          onChangeText={setQuery}
          placeholder="搜索中文、英文或牌名标识"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          value={query}
        />
        <FlatList
          data={matchingCards}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(card) => String(card.id)}
          ListEmptyComponent={<Text variant="muted">没有匹配的塔罗牌。</Text>}
          renderItem={({ item: card }) => (
            <Pressable
              accessibilityLabel={`选择 ${card.name_zh}`}
              accessibilityRole="button"
              onPress={() => selectCard(card)}
              style={({ pressed }) => [styles.cardRow, pressed ? styles.pressed : null]}
            >
              <View style={styles.cardCopy}>
                <Text>{card.name_zh}</Text>
                <Text variant="muted">{card.name_en}</Text>
              </View>
              <Text variant="muted">{card.arcana === 'major' ? '大阿卡那' : '小阿卡那'}</Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  cardCopy: {
    flex: 1,
    flexShrink: 1,
    gap: spacing.xs,
  },
  cardRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
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
    backgroundColor: colors.border,
    height: 1,
  },
});
