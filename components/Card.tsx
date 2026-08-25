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
  // The touchable *is* the card, so layout styles passed in (flex, width) apply.
  const cardStyle = [styles.card, noPadding && styles.noPadding, style];

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={cardStyle}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={cardStyle}>{children}</View>;
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
