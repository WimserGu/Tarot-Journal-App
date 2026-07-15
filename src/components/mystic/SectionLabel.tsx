import { View } from 'react-native';

import { MysticText } from './MysticText';
import { useAppTheme } from '@/theme/useAppTheme';

export function SectionLabel({ description, title }: { description?: string; title: string }) {
  const { theme } = useAppTheme();
  return (
    <View style={{ gap: theme.spacing.xs }}>
      <MysticText variant="sectionTitle">{title}</MysticText>
      {description ? <MysticText variant="caption">{description}</MysticText> : null}
    </View>
  );
}
