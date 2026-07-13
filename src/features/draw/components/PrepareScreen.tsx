import { View } from 'react-native';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';

export function PrepareScreen({
  question,
  spread,
  count,
  reversalMode,
  onStart,
}: {
  question: string;
  spread: string;
  count: number;
  reversalMode: string;
  onStart: () => void;
}) {
  return (
    <View>
      <Text variant="subtitle">准备抽牌</Text>
      <Text>问题：{question || '稍后写入你的日记'}</Text>
      <Text>牌阵：{spread}</Text>
      <Text>牌数：{count}</Text>
      <Text>逆位模式：{reversalMode}</Text>
      <Text variant="muted">
        Take a moment.{`\n`}Focus on the question you wish to explore.{`\n`}When ready,{`\n`}begin
        the draw.
      </Text>
      <Button label="Start Drawing" onPress={onStart} />
    </View>
  );
}
