import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, shadows } from '@/theme';

/**
 * Custom map pin.
 *  - default: small green circle with a white center dot
 *  - selected: larger white circle with a green ring
 */
export function MapMarker({ selected }: { selected?: boolean }) {
  if (selected) {
    return (
      <View style={[styles.selectedOuter, shadows.floating]}>
        <View style={styles.selectedInner} />
      </View>
    );
  }
  return (
    <View style={[styles.outer, shadows.card]}>
      <View style={styles.innerDot} />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  innerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  selectedOuter: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  selectedInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
});
