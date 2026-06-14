/**
 * Spacing scale — ONLY these values may be used across the app.
 * 4, 8, 12, 16, 20, 24, 32, 48
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Global horizontal padding for every screen. */
export const SCREEN_PADDING = spacing.lg; // 20

/** Standard gap between stacked cards (never let two cards touch). */
export const CARD_GAP = spacing.md; // 12

export const radius = {
  sm: 8, // tag backgrounds, small buttons
  md: 10, // feature icon container
  lg: 12, // primary buttons
  xl: 16, // cards
  pill: 999,
} as const;

export type Spacing = keyof typeof spacing;
