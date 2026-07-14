import { View } from 'react-native';
import { DeckCardBack } from './CardArtwork';

export function FaceDownCard({
  label,
  size = 'river',
}: {
  label: string;
  size?: 'river' | 'table';
}) {
  return (
    <View>
      <DeckCardBack accessibilityLabel={`${label}，未揭示的塔罗牌`} size={size} />
    </View>
  );
}
