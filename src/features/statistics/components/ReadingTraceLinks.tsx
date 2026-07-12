import { Pressable, StyleSheet, View } from 'react-native';
import type { UUID } from '../../../domain/types';
import { Text } from '../../../components/Text';
import { colors, spacing } from '../../../theme/tokens';
export function ReadingTraceLinks({
  readingIds,
  onOpen,
}: {
  readingIds: UUID[];
  onOpen: (id: UUID) => void;
}) {
  if (readingIds.length === 0) return <Text variant="muted">来源：0 条 Reading</Text>;
  return (
    <View style={styles.root}>
      <Text variant="muted">来源：{readingIds.length} 条 Reading</Text>
      <View style={styles.links}>
        {readingIds.map((id, index) => (
          <Pressable
            accessibilityRole="button"
            key={id}
            onPress={() => onOpen(id)}
            style={styles.link}
          >
            <Text style={styles.text}>Reading {index + 1}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { gap: spacing.xs },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  link: {
    borderColor: colors.border,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  text: { fontSize: 13 },
});
