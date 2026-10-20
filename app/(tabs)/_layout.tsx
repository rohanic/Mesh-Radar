import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/theme/ThemeProvider';
import { useMesh } from '@/state/mesh';
import { Icon } from '@/ui/icons/Icon';

/** Four tabs (section 6): Radar opens by default because finding people is the job. */
export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  const unread = useMesh((s) => Object.values(s.unread).reduce((a, b) => a + b, 0));
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border, height: theme.elder ? 76 : 64, paddingBottom: 8 },
        tabBarLabelStyle: { fontFamily: theme.fonts.bold, fontSize: theme.size('caption') },
      }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.radar'), tabBarIcon: ({ color }) => <Icon name="radar" color={String(color)} /> }} />
      <Tabs.Screen
        name="chat"
        options={{ title: t('tabs.chat'), tabBarBadge: unread > 0 ? unread : undefined, tabBarIcon: ({ color }) => <Icon name="message-circle" color={String(color)} /> }}
      />
      <Tabs.Screen name="events" options={{ title: t('tabs.events'), tabBarIcon: ({ color }) => <Icon name="calendar" color={String(color)} /> }} />
      <Tabs.Screen name="me" options={{ title: t('tabs.me'), tabBarIcon: ({ color }) => <Icon name="user" color={String(color)} /> }} />
    </Tabs>
  );
}
