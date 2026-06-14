import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, radius } from '@/theme';

interface FeatureIconProps {
  icon: LucideIcon;
  /** Container size; icon is sized proportionally. Default 40 (spec). */
  size?: number;
  color?: string;
  background?: string;
  style?: StyleProp<ViewStyle>;
}

/** Lucide icon inside a rounded mint square (40x40, radius 10 by spec). */
export function FeatureIcon({
  icon: Icon,
  size = 40,
  color = colors.primary,
  background = colors.mint,
  style,
}: FeatureIconProps) {
  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, backgroundColor: background, borderRadius: radius.md },
        style,
      ]}
    >
      <Icon size={Math.round(size * 0.55)} color={color} strokeWidth={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
