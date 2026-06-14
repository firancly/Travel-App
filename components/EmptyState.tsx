import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppText } from './AppText';
import { Button } from './Button';
import { colors, spacing } from '@/theme';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}

export function EmptyState({ icon: Icon, title, message, ctaLabel, onCtaPress }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.circle}>
        <Icon size={36} color={colors.white} strokeWidth={2} />
      </View>
      <AppText variant="cardTitle" center style={styles.title}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" center style={styles.message}>
          {message}
        </AppText>
      ) : null}
      {ctaLabel ? (
        <Button label={ctaLabel} onPress={onCtaPress} style={styles.cta} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    marginBottom: spacing.sm,
  },
  message: {
    maxWidth: 280,
  },
  cta: {
    marginTop: spacing.lg,
    minWidth: 200,
  },
});
