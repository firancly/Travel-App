import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Home, Compass, CalendarRange, User } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { AppText } from '@/components';
import { colors, fonts, spacing } from '@/theme';

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

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom, height: 60 + insets.bottom }]}>
      {state.routes.map((route, index) => {
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
      })}
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
  label: {
    fontFamily: fonts.interMedium,
    fontSize: 11,
  },
});
