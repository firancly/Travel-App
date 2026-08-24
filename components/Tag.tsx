import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppText } from './AppText';
import { colors, radius, spacing, fonts } from '@/theme';

interface TagProps {
  label: string;
  icon?: LucideIcon;
  color?: string;
  background?: string;
  style?: StyleProp<ViewStyle>;
}

/** Small uppercase mint pill used for categories / captions. */
export function Tag({ label, icon: Icon, color = colors.primary, background = colors.mint, style }: TagProps) {
  return (
    <View style={[styles.tag, { backgroundColor: background }, style]}>
      {Icon ? <Icon size={12} color={color} strokeWidth={2.4} /> : null}
      <AppText style={[styles.text, { color }]}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: "500",
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
