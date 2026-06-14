import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '@/theme';

/** Centered drag pill for @gorhom bottom sheets (40w x 4h, gray). */
export function SheetHandle() {
  return (
    <View style={styles.wrap}>
      <View style={styles.pill} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  pill: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.sheetHandle,
  },
});
