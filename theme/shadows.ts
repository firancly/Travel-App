import { Platform } from 'react-native';
import { colors } from './colors';

/** Card shadow per spec: opacity 0.06, radius 12, elevation 3. */
export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  // Slightly stronger lift for floating elements (FABs, sheets, pins).
  floating: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
} as const;

/** Hairline border that keeps white-on-white cards crisp, esp. on Android. */
export const hairline = {
  borderWidth: Platform.select({ android: 1, default: 1 }),
  borderColor: colors.border,
} as const;
