import React, { useEffect, useState } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius as themeRadius, spacing } from '@/theme';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Shimmering placeholder block (expo-linear-gradient + reanimated). */
export function Skeleton({ width = '100%', height = 16, radius = 8, style }: SkeletonProps) {
  const [w, setW] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [progress]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -w + progress.value * (2 * w) }],
  }));

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[styles.base, { width, height, borderRadius: radius }, style]}
    >
      {w > 0 ? (
        <AnimatedGradient
          colors={[colors.skeleton, colors.skeletonHighlight, colors.skeleton]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[StyleSheet.absoluteFill, { width: w }, animStyle]}
        />
      ) : null}
    </View>
  );
}

/** Card-shaped skeleton used in list loading states. */
export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Skeleton width={44} height={44} radius={12} />
        <View style={styles.col}>
          <Skeleton width="70%" height={14} />
          <Skeleton width="45%" height={12} />
        </View>
      </View>
      <Skeleton width="100%" height={12} style={{ marginTop: spacing.md }} />
      <Skeleton width="85%" height={12} style={{ marginTop: spacing.sm }} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.skeleton,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: themeRadius.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  col: {
    flex: 1,
    gap: spacing.sm,
  },
});
