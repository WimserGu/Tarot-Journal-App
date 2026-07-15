import { StatusBar } from 'expo-status-bar';
import type { PropsWithChildren, Ref } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme/useAppTheme';

type MysticScreenProps = PropsWithChildren<{
  maxWidth?: number;
  scroll?: boolean;
  scrollRef?: Ref<ScrollView>;
  topGlow?: boolean;
}>;

const STARS = [
  ['12%', '10%'],
  ['79%', '7%'],
  ['91%', '25%'],
  ['23%', '34%'],
  ['68%', '48%'],
] as const;

export function MysticScreen({
  children,
  maxWidth = 1040,
  scroll = false,
  scrollRef,
  topGlow = true,
}: MysticScreenProps) {
  const { theme } = useAppTheme();
  const content = (
    <View
      style={[
        styles.content,
        {
          gap: theme.spacing.lg,
          maxWidth,
          paddingBottom: theme.spacing.xxl,
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.lg,
        },
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.backgroundDeep }]}>
      <StatusBar style="light" />
      <View accessibilityElementsHidden pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.backgroundTop, { backgroundColor: theme.colors.backgroundMid }]} />
        <View style={[styles.backgroundBottom, { backgroundColor: theme.colors.backgroundDeep }]} />
        {topGlow ? (
          <View style={[styles.glow, { backgroundColor: theme.gradients.glow[0] }]} />
        ) : null}
        <View style={[styles.fog, { backgroundColor: theme.colors.glassSubtle }]} />
        {STARS.map(([left, top]) => (
          <View
            key={`${left}-${top}`}
            style={[styles.star, { backgroundColor: theme.colors.star, left, top }]}
          />
        ))}
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            ref={scrollRef}
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backgroundBottom: { bottom: 0, height: '52%', left: 0, position: 'absolute', right: 0 },
  backgroundTop: { height: '62%', left: 0, position: 'absolute', right: 0, top: 0 },
  content: { alignSelf: 'center', flexGrow: 1, width: '100%' },
  fog: {
    borderRadius: 240,
    height: 300,
    left: '-16%',
    position: 'absolute',
    top: '42%',
    transform: [{ rotate: '-12deg' }],
    width: '80%',
  },
  glow: {
    alignSelf: 'center',
    borderRadius: 240,
    height: 390,
    opacity: 0.72,
    position: 'absolute',
    top: -230,
    width: 480,
  },
  keyboard: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  star: { borderRadius: 2, height: 3, position: 'absolute', width: 3 },
});
