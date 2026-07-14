import { Modal, Pressable, StyleSheet, TextInput } from 'react-native';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, spacing } from '@/theme/tokens';
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
  return (
    <Modal transparent visible={visible} onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={() => undefined}>
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
            style={styles.input}
          />
          <Button label="Close" onPress={onDismiss} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: '#00000088',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: spacing.md,
    maxWidth: 420,
    padding: spacing.lg,
    width: '100%',
  },
  input: { borderColor: colors.border, borderWidth: 1, minHeight: 90, padding: spacing.sm },
});
