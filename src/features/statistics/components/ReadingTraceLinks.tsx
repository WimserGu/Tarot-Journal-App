import { Pressable, StyleSheet, View } from 'react-native';
import type { UUID } from '../../../domain/types';
import { MysticText as Text } from '../../../components/mystic';
import { useAppTheme } from '../../../theme/useAppTheme';
export function ReadingTraceLinks({
  readingIds,
  onOpen,
}: {
  readingIds: UUID[];
  onOpen: (id: UUID) => void;
}) {
  const { theme } = useAppTheme();
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
            style={[
              styles.link,
              {
                backgroundColor: theme.colors.glassSubtle,
                borderColor: theme.colors.glassBorder,
                borderRadius: theme.radii.pill,
                paddingHorizontal: theme.spacing.sm,
              },
            ]}
          >
            <Text style={styles.text}>Reading {index + 1}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { gap: 4 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  link: {
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  text: { fontSize: 13 },
});
