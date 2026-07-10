import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { borderRadii, colors, spacing } from '@/theme/tokens';

export type SelectionOption = {
  id: string;
  label: string;
  description?: string;
};

type SelectionModalProps = {
  emptyMessage: string;
  onClose: () => void;
  onSelect: (id: string) => void;
  options: readonly SelectionOption[];
  title: string;
  visible: boolean;
};

export function SelectionModal({
  emptyMessage,
  onClose,
  onSelect,
  options,
  title,
  visible,
}: SelectionModalProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <Pressable accessibilityLabel="关闭选择器" onPress={onClose} style={styles.backdrop} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text variant="subtitle">{title}</Text>
            <Pressable accessibilityLabel="关闭" onPress={onClose} style={styles.closeButton}>
              <Ionicons color={colors.text} name="close" size={22} />
            </Pressable>
          </View>
          {options.length === 0 ? (
            <Text variant="muted">{emptyMessage}</Text>
          ) : (
            <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
              {options.map((option) => (
                <Pressable
                  accessibilityLabel={option.label}
                  accessibilityRole="button"
                  key={option.id}
                  onPress={() => onSelect(option.id)}
                  style={({ pressed }) => [styles.option, pressed ? styles.pressed : null]}
                >
                  <Text>{option.label}</Text>
                  {option.description ? <Text variant="muted">{option.description}</Text> : null}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(37, 34, 31, 0.35)',
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
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  option: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pressed: {
    opacity: 0.7,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadii.md,
    borderTopRightRadius: borderRadii.md,
    gap: spacing.md,
    maxHeight: '75%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
});
