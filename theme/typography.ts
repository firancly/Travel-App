import { TextStyle } from 'react-native';
import { colors } from './colors';

/**
 * Typography scale ported from the TourNet AI design system.
 * System sans (no custom families) — weight via fontWeight.
 * Colors kept on the app's green/white palette.
 */
export const typography = {
  // display-md
  screenTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  // h2
  sectionHeader: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  // h3
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  // body-md
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    color: colors.body,
  },
  // label-lg
  bodyStrong: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  // label-sm (uppercase eyebrow)
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  // caption
  caption: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '400',
    color: colors.textMuted,
  },
  // display-lg
  stat: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    color: colors.primary,
  },
  // label-lg on buttons
  button: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.white,
  },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
