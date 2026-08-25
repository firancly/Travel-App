import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppText } from './AppText';
import { colors, spacing, SCREEN_PADDING } from '@/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional icon button on the right of the header. */
  rightIcon?: LucideIcon;
  onRightPress?: () => void;
  /** Custom right-hand slot (e.g. a labelled button); wins over `rightIcon`. */
  right?: React.ReactNode;
}

export function ScreenHeader({
  title,
  subtitle,
  rightIcon: RightIcon,
  onRightPress,
  right,
}: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.titleWrap}>
        <AppText variant="screenTitle">{title}</AppText>
        {subtitle ? (
          <AppText variant="body" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ? (
        <View style={styles.rightSlot}>{right}</View>
      ) : RightIcon ? (
        <TouchableOpacity activeOpacity={0.8} onPress={onRightPress} style={styles.iconBtn}>
          <RightIcon size={20} color={colors.primary} strokeWidth={2.2} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.sm,
    paddingBottom: spacing.base, // content begins 16px below the header
  },
  titleWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
  },
  rightSlot: {
    marginLeft: spacing.md,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
});
