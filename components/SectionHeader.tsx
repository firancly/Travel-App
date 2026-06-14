import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText } from './AppText';
import { colors, spacing, fonts } from '@/theme';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export function SectionHeader({ title, actionLabel, onActionPress }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <AppText variant="sectionHeader">{title}</AppText>
      {actionLabel ? (
        <TouchableOpacity activeOpacity={0.8} onPress={onActionPress}>
          <AppText style={styles.action}>{actionLabel}</AppText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  action: {
    fontFamily: fonts.interSemiBold,
    fontSize: 13,
    color: colors.primary,
  },
});
