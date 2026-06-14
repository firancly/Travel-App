import React from 'react';
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { colors, radius, spacing, shadows, hairline } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** When provided the whole card becomes tappable. */
  onPress?: () => void;
  /** Remove the default 16px internal padding (e.g. for media-edge cards). */
  noPadding?: boolean;
}

export function Card({ children, style, onPress, noPadding }: CardProps) {
  const content = (
    <View style={[styles.card, noPadding && styles.noPadding, style]}>{children}</View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.base,
    ...shadows.card,
    ...hairline,
  },
  noPadding: {
    padding: 0,
    overflow: 'hidden',
  },
});
