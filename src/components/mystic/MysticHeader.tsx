import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { MysticText } from './MysticText';
import { useAppTheme } from '@/theme/useAppTheme';

export function MysticHeader({
  action,
  onBack,
  subtitle,
  title,
}: {
  action?: React.ReactNode;
  onBack?: () => void;
  subtitle?: string;
  title: string;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={{ gap: theme.spacing.md }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md }}>
        {onBack ? (
          <Pressable
            accessibilityLabel="返回"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onBack}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: theme.colors.glass,
              borderColor: theme.colors.glassBorder,
              borderRadius: theme.radii.pill,
              borderWidth: 1,
              height: 46,
              justifyContent: 'center',
              opacity: pressed ? theme.opacity.pressed : 1,
              width: 46,
            })}
          >
            <Ionicons color={theme.icons.primary} name="arrow-back" size={22} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <MysticText variant="pageTitle">{title}</MysticText>
          {subtitle ? <MysticText variant="caption">{subtitle}</MysticText> : null}
        </View>
        {action}
      </View>
    </View>
  );
}
