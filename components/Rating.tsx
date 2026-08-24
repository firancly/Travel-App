import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { AppText } from './AppText';
import { colors, fonts, spacing } from '@/theme';

interface RatingProps {
  rating: number;
  reviews?: number;
}

export function Rating({ rating, reviews }: RatingProps) {
  return (
    <View style={styles.row}>
      <Star size={14} color={colors.star} fill={colors.star} strokeWidth={0} />
      <AppText style={styles.value}>{rating.toFixed(1)}</AppText>
      {reviews != null ? (
        <AppText style={styles.reviews}>({reviews.toLocaleString()})</AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  value: {
    fontWeight: "600",
    fontSize: 13,
    color: colors.textPrimary,
  },
  reviews: {
    fontWeight: "400",
    fontSize: 12,
    color: colors.textMuted,
  },
});
