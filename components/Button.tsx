import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppText } from './AppText';
import { colors, radius, spacing, fonts } from '@/theme';

type Variant = 'primary' | 'secondary' | 'pill';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  /** Primary/secondary default to full width; pill is content width. */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon: Icon,
  disabled,
  loading,
  fullWidth,
  style,
}: ButtonProps) {
  const isPill = variant === 'pill';
  const isSecondary = variant === 'secondary';
  const wide = fullWidth ?? !isPill;

  const textColor = variant === 'primary' ? colors.white : colors.primary;
  const iconSize = isPill ? 16 : 18;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        isPill ? styles.pill : styles.full,
        variant === 'primary' && styles.primary,
        isSecondary && styles.secondary,
        wide && !isPill && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.content}>
          {Icon ? <Icon size={iconSize} color={textColor} strokeWidth={2.2} /> : null}
          <AppText
            style={[
              isPill ? styles.pillText : styles.label,
              { color: textColor },
            ]}
          >
            {label}
          </AppText>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  full: {
    height: 52,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  pill: {
    backgroundColor: colors.mint,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  label: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 16,
  },
  pillText: {
    fontFamily: fonts.interSemiBold,
    fontSize: 13,
    color: colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
});
