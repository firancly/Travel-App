import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { colors, radius, spacing, fonts } from '@/theme';
import type { BookingStatus } from '@/types';

const STYLES: Record<BookingStatus, { bg: string; fg: string; dot: string }> = {
  Confirmed: { bg: colors.mint, fg: colors.primary, dot: colors.primary },
  Pending: { bg: '#FFF3DF', fg: '#B7791F', dot: '#E0A526' },
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  const s = STYLES[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <View style={[styles.dot, { backgroundColor: s.dot }]} />
      <AppText style={[styles.text, { color: s.fg }]}>{status}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontFamily: fonts.interSemiBold,
    fontSize: 12,
  },
});
