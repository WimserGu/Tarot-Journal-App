import { Modal, Pressable, StyleSheet, TextInput } from 'react-native';
import { GlassPanel, MoonButton as Button, MysticText as Text } from '@/components/mystic';
import { useAppTheme } from '@/theme/useAppTheme';
import type { CardOrientation, ReversalVariant } from '@/domain/types';
import {
  reversalAccessibilityLabel,
  reversalStateLabel,
} from '@/features/draw/reversalPresentation';
import { CardArtwork } from './CardArtwork';
export function FocusCardModal({
  visible,
  title,
  cardId,
  name,
  englishName,
  orientation,
  reversalVariant,
  note,
  onNoteChange,
  onDismiss,
}: {
  visible: boolean;
  title: string;
  cardId: number;
  name: string;
  englishName?: string;
  orientation: CardOrientation;
  reversalVariant: ReversalVariant;
  note: string;
  onNoteChange: (value: string) => void;
  onDismiss: () => void;
}) {
  const { theme } = useAppTheme();
  return (
    <Modal transparent visible={visible} onRequestClose={onDismiss}>
      <Pressable
        style={[
          styles.backdrop,
          { backgroundColor: theme.colors.overlay, padding: theme.spacing.lg },
        ]}
        onPress={onDismiss}
      >
        <Pressable style={styles.card} onPress={() => undefined}>
          <GlassPanel variant="elevated">
            <Text variant="subtitle">{title}</Text>
            <CardArtwork
              accessibilityLabel={`${name}，${reversalAccessibilityLabel(orientation, reversalVariant)}`}
              cardId={cardId}
              orientation={orientation}
              reversalVariant={reversalVariant}
              size="focus"
            />
            <Text variant="title">{name}</Text>
            {englishName ? <Text variant="muted">{englishName}</Text> : null}
            <Text>{reversalStateLabel(orientation, reversalVariant)}</Text>
            <TextInput
              accessibilityLabel="临时卡片备注"
              value={note}
              onChangeText={onNoteChange}
              multiline
              placeholder="临时观察备注（不会自动写入 Reading）"
              placeholderTextColor={theme.colors.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.glassSubtle,
                  borderColor: theme.colors.glassBorder,
                  borderRadius: theme.radii.md,
                  color: theme.colors.textPrimary,
                  padding: theme.spacing.sm,
                },
              ]}
            />
            <Button label="关闭" onPress={onDismiss} />
          </GlassPanel>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    maxWidth: 420,
    width: '100%',
  },
  input: { borderWidth: 1, minHeight: 90, width: '100%' },
});
