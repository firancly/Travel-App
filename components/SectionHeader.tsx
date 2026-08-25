import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText } from './AppText';
import { colors, spacing } from '@/theme';

interface SectionHeaderProps {
  title: string;
  /** Optional one-line description under the title (design's section intro). */
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onActionPress,
}: SectionHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <AppText variant="sectionHeader">{title}</AppText>
        {actionLabel ? (
          <TouchableOpacity activeOpacity={0.8} onPress={onActionPress}>
            <AppText style={styles.action}>{actionLabel}</AppText>
          </TouchableOpacity>
        ) : null}
      </View>
      {subtitle ? (
        <AppText variant="body" style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  action: {
    fontWeight: '600',
    fontSize: 13,
    color: colors.primary,
  },
});
