import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { getRouteAccess } from '@/features/auth/routeAccess';
import { colors } from '@/theme/tokens';
import { ThemeProvider } from '@/theme/ThemeProvider';

export const unstable_settings = { initialRouteName: '(tabs)' };

function Navigator() {
  const { status, onboardingCompleted, mode } = useAuth();
  if (status === 'loading')
    return (
      <View
        accessibilityLabel="Loading session"
        accessibilityRole="progressbar"
        style={styles.loading}
      >
        <ActivityIndicator />
        <Text>正在恢复会话…</Text>
      </View>
    );
  const access = getRouteAccess(status, onboardingCompleted);
  return (
    <View style={styles.root}>
      {mode === 'local' && status === 'localDevelopment' ? (
        <View style={styles.banner}>
          <Text>Local Development Mode · Data is stored on this device</Text>
        </View>
      ) : null}
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerShown: false,
        }}
      >
        <Stack.Protected guard={access.publicAuth}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={access.onboarding}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={access.privateData}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="topics" />
          <Stack.Screen name="readings" />
          <Stack.Screen name="questions" />
          <Stack.Screen name="reviews" />
          <Stack.Screen name="followups" />
          <Stack.Screen name="draw" />
          <Stack.Screen name="onboarding-review" />
        </Stack.Protected>
      </Stack>
      <StatusBar style="dark" />
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Navigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
  banner: { backgroundColor: '#fff2c7', paddingHorizontal: 16, paddingVertical: 8 },
});
