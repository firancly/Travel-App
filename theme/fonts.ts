/**
 * The app uses the system sans font (per the TourNet AI design system) — no
 * custom font files are loaded. Weight is applied via `fontWeight`.
 */
export const weights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extra: '800',
} as const;

/**
 * Legacy export kept so existing `import { fonts } from '@/theme'` lines still
 * resolve. No families are set now (system font is used everywhere).
 */
export const fonts = {} as const;
