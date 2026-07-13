import { View } from 'react-native';
import { Button } from '@/components/Button';
import { spacing } from '@/theme/tokens';
export function DrawToolbar({
  disabled,
  canFinish,
  onDraw,
  onFinish,
  onObserve,
  onHistory,
}: {
  disabled: boolean;
  canFinish: boolean;
  onDraw: () => void;
  onFinish: () => void;
  onObserve: () => void;
  onHistory: () => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      <Button label="Draw Another" disabled={disabled} onPress={onDraw} />
      <Button label="Finish Session" disabled={!canFinish || disabled} onPress={onFinish} />
      <Button label="Observation Mode" disabled={disabled} onPress={onObserve} />
      <Button label="History" disabled={disabled} onPress={onHistory} />
    </View>
  );
}
