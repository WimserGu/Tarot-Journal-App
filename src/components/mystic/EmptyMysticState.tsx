import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { GlassPanel } from './GlassPanel';
import { MoonButton } from './MoonButton';
import { MysticText } from './MysticText';
import { useAppTheme } from '@/theme/useAppTheme';

export function EmptyMysticState({
  actionLabel,
  description,
  onAction,
  title,
}: {
  actionLabel?: string;
  description: string;
  onAction?: () => void;
  title: string;
}) {
  const { theme } = useAppTheme();
  return (
    <GlassPanel style={{ alignItems: 'center' }} variant="subtle">
      <Ionicons color={theme.icons.secondary} name="moon-outline" size={28} />
      <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
        <MysticText variant="cardTitle">{title}</MysticText>
        <MysticText style={{ textAlign: 'center' }} variant="caption">
          {description}
        </MysticText>
      </View>
      {actionLabel && onAction ? <MoonButton label={actionLabel} onPress={onAction} /> : null}
    </GlassPanel>
  );
}
