import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppText } from './AppText';
import { colors, spacing, SCREEN_PADDING } from '@/theme';

interface BackHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightIcon?: LucideIcon;
  onRightPress?: () => void;
}

/** Header for stacked screens: back affordance above a left-aligned title. */
export function BackHeader({ title, subtitle, onBack, rightIcon: RightIcon, onRightPress }: BackHeaderProps) {
  const router = useRouter();
  const goBack = onBack ?? (() => router.back());

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity activeOpacity={0.8} onPress={goBack} style={styles.iconBtn}>
          <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.2} />
        </TouchableOpacity>
        {RightIcon ? (
          <TouchableOpacity activeOpacity={0.8} onPress={onRightPress} style={styles.iconBtn}>
            <RightIcon size={20} color={colors.primary} strokeWidth={2.2} />
          </TouchableOpacity>
        ) : null}
      </View>
      <AppText variant="screenTitle">{title}</AppText>
      {subtitle ? (
        <AppText variant="body" style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.sm,
    paddingBottom: spacing.base,
    gap: spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: { color: colors.textSecondary },
});
