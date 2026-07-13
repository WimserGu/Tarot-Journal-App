import { Modal, Pressable, StyleSheet, TextInput } from 'react-native';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, spacing } from '@/theme/tokens';
export function FocusCardModal({
  visible,
  title,
  name,
  orientation,
  note,
  onNoteChange,
  onDismiss,
}: {
  visible: boolean;
  title: string;
  name: string;
  orientation: string;
  note: string;
  onNoteChange: (value: string) => void;
  onDismiss: () => void;
}) {
  return (
    <Modal transparent visible={visible} onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={() => undefined}>
          <Text variant="subtitle">{title}</Text>
          <Text variant="title">{name}</Text>
          <Text>{orientation}</Text>
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
    backgroundColor: colors.background,
    gap: spacing.md,
    maxWidth: 420,
    padding: spacing.lg,
    width: '100%',
  },
  input: { borderColor: colors.border, borderWidth: 1, minHeight: 90, padding: spacing.sm },
});
