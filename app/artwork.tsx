import { Linking, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { rwsArtworkManifest } from '@/features/tarot/artwork/defaultTarotArtwork';
import { borderRadii, colors, spacing } from '@/theme/tokens';

export default function TarotArtworkAboutScreen() {
  return (
    <Screen scroll>
      <Text variant="eyebrow">牌面主题</Text>
      <Text variant="title">Rider–Waite–Smith Tarot</Text>
      <View style={styles.panel}>
        <Text variant="subtitle">Pamela Colman Smith</Text>
        <Text>由 Pamela Colman Smith 绘制，A. E. Waite 设计，最初出版于 1909 年。</Text>
        <Text variant="muted">当前版本：{rwsArtworkManifest.assetVersion}</Text>
      </View>
      <View style={styles.panel}>
        <Text variant="subtitle">牌面来源</Text>
        <Text>{rwsArtworkManifest.sourceName}</Text>
        <Text variant="muted">{rwsArtworkManifest.licenseLabel}</Text>
        <Text variant="muted">
          78 张牌面均按单个 Wikimedia Commons
          文件页的公共领域标记核验。不同司法辖区的版权期限可能不同，现代重绘、修复和商业版本可能拥有独立权利。
        </Text>
        <Button
          label="打开 Wikimedia Commons 来源"
          onPress={() => void Linking.openURL(rwsArtworkManifest.sourceUrl)}
        />
      </View>
      <View style={styles.panel}>
        <Text variant="subtitle">牌背</Text>
        <Text>{rwsArtworkManifest.cardBackSource}</Text>
        <Text variant="muted">牌背为本 App 的原创对称几何图案，不复制现代商业牌背。</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: borderRadii.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
});
