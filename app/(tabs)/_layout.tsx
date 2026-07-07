import { Redirect, Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { usePrefsStore } from '@/store/usePrefsStore';
import { TabBar } from '@/navigation/TabBar';

export default function TabsLayout() {
  const onboarded = usePrefsStore((s) => s.onboarded);
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...(props as unknown as BottomTabBarProps)} />}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="plan" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
