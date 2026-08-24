import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '@/components/AppText';
import { colors, shadows, fonts } from '@/theme';

/**
 * Custom map pin.
 *  - default: small green circle with a white center dot (or a stop number)
 *  - selected: larger white circle with a green ring (or a stop number)
 */
export function MapMarker({ selected, number }: { selected?: boolean; number?: number }) {
  if (selected) {
    return (
      <View style={[styles.selectedOuter, shadows.floating]}>
        {number != null ? (
          <AppText style={styles.selectedNumber}>{number}</AppText>
        ) : (
          <View style={styles.selectedInner} />
        )}
      </View>
    );
  }
  return (
    <View style={[styles.outer, shadows.card]}>
      {number != null ? (
        <AppText style={styles.number}>{number}</AppText>
      ) : (
        <View style={styles.innerDot} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: 22,
    height: 22,
    borderRadius: 11,
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
  number: {
    fontWeight: "600",
    fontSize: 11,
    lineHeight: 13,
    color: colors.white,
  },
  selectedNumber: {
    fontWeight: "600",
    fontSize: 13,
    lineHeight: 15,
    color: colors.primary,
  },
});
