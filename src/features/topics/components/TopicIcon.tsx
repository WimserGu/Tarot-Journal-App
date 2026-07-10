import { Ionicons } from '@expo/vector-icons';

import type { TopicIcon as TopicIconValue } from '@/domain/types';
import { colors } from '@/theme/tokens';

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

export function TopicIcon({ icon, color = colors.accent, size = 24 }: TopicIconProps) {
  return <Ionicons color={color} name={iconNames[icon]} size={size} />;
}
