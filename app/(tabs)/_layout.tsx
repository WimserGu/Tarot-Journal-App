import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useAppTheme } from '@/theme/useAppTheme';

type TabIconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: TabIconName) {
  function TabIcon({ color, size }: { color: string; size: number }) {
    return <Ionicons name={name} size={size} color={color} />;
  }

  return TabIcon;
}

export default function TabsLayout() {
  const { theme } = useAppTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.moonlight,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: theme.typography.caption,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: theme.colors.backgroundDeep,
          borderTopColor: theme.colors.glassBorder,
          height: 68,
          paddingBottom: theme.spacing.sm,
          paddingTop: theme.spacing.xs,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: tabIcon('home-outline'),
        }}
      />
      <Tabs.Screen
        name="topics"
        options={{
          title: 'Topics',
          tabBarIcon: tabIcon('albums-outline'),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: tabIcon('analytics-outline'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: tabIcon('settings-outline'),
        }}
      />
    </Tabs>
  );
}
