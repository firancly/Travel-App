import { TextStyle } from 'react-native';
import { fonts } from './fonts';
import { colors } from './colors';

/**
 * Typography scale (design spec).
 * Headings: Plus Jakarta Sans · Body: Inter.
 */
export const typography = {
  screenTitle: {
    fontFamily: fonts.jakartaBold,
    fontSize: 28,
    lineHeight: 34,
    color: colors.textPrimary,
  },
  sectionHeader: {
    fontFamily: fonts.jakartaBold,
    fontSize: 20,
    lineHeight: 26,
    color: colors.textPrimary,
  },
  cardTitle: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  body: {
    fontFamily: fonts.interRegular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.body,
  },
  bodyStrong: {
    fontFamily: fonts.interSemiBold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  label: {
    fontFamily: fonts.interMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  caption: {
    fontFamily: fonts.interRegular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
  },
  stat: {
    fontFamily: fonts.jakartaBold,
    fontSize: 36,
    lineHeight: 40,
    color: colors.primary,
  },
  button: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 16,
    lineHeight: 20,
    color: colors.white,
  },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
