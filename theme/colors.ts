/**
 * Color palette for Navigate the Moment.
 * Green / white / mint system per the design spec.
 */
export const colors = {
  // Brand
  primary: '#1B5E35', // buttons, active states, icons, stat numbers
  primaryPressed: '#164C2B',
  mint: '#E8F5EC', // pill/tag backgrounds, subtle fills, icon containers
  mintDeep: '#D5EBDC',

  // Surfaces
  white: '#FFFFFF', // all card + screen backgrounds
  screen: '#FFFFFF',

  // Text
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textMuted: '#A0A0A0',
  body: '#4A4A4A', // body / descriptions

  // Feedback
  alert: '#C0392B', // destructive / warnings only
  star: '#F5A623',

  // Lines & misc
  border: '#F0F0F0', // hairline card border for crispness
  divider: '#EFEFEF',
  grip: '#C0C0C0', // drag handle grip
  sheetHandle: '#E0E0E0', // bottom sheet pill
  skeleton: '#ECECEC',
  skeletonHighlight: '#F6F6F6',
  overlay: 'rgba(17, 24, 19, 0.45)',
} as const;

export type ColorName = keyof typeof colors;
