import { Ionicons } from '@expo/vector-icons';

import type { TopicIcon as TopicIconValue } from '@/domain/types';
import { useAppTheme } from '@/theme/useAppTheme';

const iconNames: Record<TopicIconValue, keyof typeof Ionicons.glyphMap> = {
  book: 'book-outline',
  briefcase: 'briefcase-outline',
  compass: 'compass-outline',
  heart: 'heart-outline',
  moon: 'moon-outline',
  sparkles: 'sparkles-outline',
};

type TopicIconProps = {
  icon: TopicIconValue;
  color?: string;
  size?: number;
};

export function TopicIcon({ icon, color, size = 24 }: TopicIconProps) {
  const { theme } = useAppTheme();
  return <Ionicons color={color ?? theme.colors.primarySoft} name={iconNames[icon]} size={size} />;
}
