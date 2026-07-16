import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MysticText as Text } from '@/components/mystic';
import { useAppTheme } from '@/theme/useAppTheme';

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
  const { theme } = useAppTheme();
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="关闭选择器"
          onPress={onClose}
          style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.backgroundMid,
              borderColor: theme.colors.glassBorder,
              borderTopLeftRadius: theme.radii.xl,
              borderTopRightRadius: theme.radii.xl,
              gap: theme.spacing.md,
              paddingHorizontal: theme.spacing.lg,
              paddingTop: theme.spacing.lg,
            },
          ]}
        >
          <View style={styles.header}>
            <Text variant="subtitle">{title}</Text>
            <Pressable accessibilityLabel="关闭" onPress={onClose} style={styles.closeButton}>
              <Ionicons color={theme.icons.primary} name="close" size={22} />
            </Pressable>
          </View>
          {options.length === 0 ? (
            <Text variant="muted">{emptyMessage}</Text>
          ) : (
            <ScrollView
              contentContainerStyle={[styles.list, { gap: theme.spacing.sm }]}
              keyboardShouldPersistTaps="handled"
            >
              {options.map((option) => (
                <Pressable
                  accessibilityLabel={option.label}
                  accessibilityRole="button"
                  key={option.id}
                  onPress={() => onSelect(option.id)}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      borderBottomColor: theme.colors.divider,
                      opacity: pressed ? theme.opacity.pressed : 1,
                      paddingVertical: theme.spacing.md,
                    },
                  ]}
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
    paddingBottom: 24,
  },
  option: {
    borderBottomWidth: 1,
    gap: 4,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderWidth: 1,
    maxHeight: '75%',
  },
});
