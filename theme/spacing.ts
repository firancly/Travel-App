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

// Radius scale from the TourNet AI design system.
export const radius = {
  sm: 6, // tags, small chips
  md: 10, // feature icon container
  lg: 14, // buttons
  xl: 20, // cards
  xxl: 28, // sheets, large surfaces
  pill: 9999,
} as const;

export type Spacing = keyof typeof spacing;
