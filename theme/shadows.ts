import { Platform } from 'react-native';
import { colors } from './colors';

// Elevation scale from the TourNet AI design system (neutral black on the green palette).
export const shadows = {
  // --shadow-card: 0 2px 8px /0.06
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  // --shadow-pop: 0 8px 24px /0.12 — floating elements (FABs, sheets, pins).
  floating: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
} as const;

/** Hairline border that keeps white-on-white cards crisp, esp. on Android. */
export const hairline = {
  borderWidth: Platform.select({ android: 1, default: 1 }),
  borderColor: colors.border,
} as const;
