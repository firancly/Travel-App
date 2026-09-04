import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Home, Compass, CalendarRange, User, Plus } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { AppText } from '@/components';
import { colors, fonts, spacing, radius, shadows } from '@/theme';
import { useTripsStore } from '@/store/useTripsStore';

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  discover: Compass,
  plan: CalendarRange,
  profile: User,
};

const LABELS: Record<string, string> = {
  home: 'Home',
  discover: 'Discover',
  plan: 'My Plan',
  profile: 'Profile',
};

function TabButton({
  routeName,
  focused,
  onPress,
}: {
  routeName: string;
  focused: boolean;
  onPress: () => void;
}) {
  const Icon = ICONS[routeName] ?? Home;
  const color = focused ? colors.primary : colors.textMuted;

  // Active icon scales up to 1.1 with a spring on press/focus.
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(focused ? 1.1 : 1, { damping: 13, stiffness: 220 }) }],
  }));

  return (
    <TouchableOpacity style={styles.tab} activeOpacity={0.8} onPress={onPress}>
      <Animated.View style={animStyle}>
        <Icon size={20} color={color} strokeWidth={focused ? 2.4 : 2} />
      </Animated.View>
      <AppText style={[styles.label, { color }]}>{LABELS[routeName] ?? routeName}</AppText>
    </TouchableOpacity>
  );
}

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const startNewTrip = useTripsStore((s) => s.startNewTrip);

  const mid = Math.ceil(state.routes.length / 2);
  const left = state.routes.slice(0, mid);
  const right = state.routes.slice(mid);

  const renderTab = (route: (typeof state.routes)[number]) => {
    const index = state.routes.indexOf(route);
    const focused = state.index === index;
    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };
    return (
      <TabButton key={route.key} routeName={route.name} focused={focused} onPress={onPress} />
    );
  };

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom, height: 60 + insets.bottom }]}>
      {left.map(renderTab)}

      <View style={styles.fabSlot}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={startNewTrip}
          style={styles.fab}
        >
          <Plus size={26} color={colors.white} strokeWidth={2.4} />
        </TouchableOpacity>
        <AppText style={styles.fabLabel}>New trip</AppText>
      </View>

      {right.map(renderTab)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: spacing.sm,
  },
  fabSlot: {
    width: 76,
    alignItems: 'center',
  },
  fab: {
    width: 54,
    height: 54,
    marginTop: -24,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
  },
  fabLabel: {
    marginTop: 2,
    fontWeight: '600',
    fontSize: 10,
    color: colors.textMuted,
  },
  label: {
    fontWeight: "500",
    fontSize: 11,
  },
});
