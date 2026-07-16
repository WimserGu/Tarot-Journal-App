import { Linking } from 'react-native';
import { useRouter } from 'expo-router';
import {
  GlassPanel,
  MoonButton as Button,
  MysticHeader,
  MysticScreen as Screen,
  MysticText as Text,
} from '@/components/mystic';
import { rwsArtworkManifest } from '@/features/tarot/artwork/defaultTarotArtwork';

export default function TarotArtworkAboutScreen() {
  const router = useRouter();
  return (
    <Screen maxWidth={820} scroll>
      <MysticHeader
        eyebrow="牌面主题"
        onBack={() => router.back()}
        subtitle="记录当前牌面资产的作者、来源、许可与版本。"
        title="Rider–Waite–Smith Tarot"
      />
      <GlassPanel variant="elevated">
        <Text variant="subtitle">Pamela Colman Smith</Text>
        <Text>由 Pamela Colman Smith 绘制，A. E. Waite 设计，最初出版于 1909 年。</Text>
        <Text variant="muted">当前版本：{rwsArtworkManifest.assetVersion}</Text>
      </GlassPanel>
      <GlassPanel>
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
      </GlassPanel>
      <GlassPanel variant="subtle">
        <Text variant="subtitle">牌背</Text>
        <Text>{rwsArtworkManifest.cardBackSource}</Text>
        <Text variant="muted">牌背为本 App 的原创对称几何图案，不复制现代商业牌背。</Text>
      </GlassPanel>
    </Screen>
  );
}
