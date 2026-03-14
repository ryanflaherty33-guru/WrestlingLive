export const COLORS = {
  // Primary palette
  primary: '#1B3A5C',        // Deep navy blue
  primaryLight: '#2C5F8A',   // Lighter blue
  primaryDark: '#0F2440',    // Darker navy

  // Accent colors
  accent: '#E8A838',         // Gold/amber
  accentLight: '#F0C060',    // Light gold
  accentDark: '#C08820',     // Dark gold

  // Mat colors
  matRed: '#C4342D',
  matBlue: '#2856A3',
  matGray: '#A0A8B0',

  // Status colors
  success: '#38A848',
  danger: '#D04040',
  warning: '#E89020',
  info: '#3888D0',

  // Neutrals
  background: '#F0F2F5',
  card: '#FFFFFF',
  cardDark: '#E8EAF0',
  text: '#1A1A2E',
  textLight: '#6B7280',
  textWhite: '#FFFFFF',
  border: '#D0D4DC',

  // Stat bar colors
  statHigh: '#38A848',
  statMid: '#E89020',
  statLow: '#D04040',
};

export const FONTS = {
  title: { fontSize: 24, fontWeight: 'bold' as const, color: COLORS.text },
  subtitle: { fontSize: 18, fontWeight: '600' as const, color: COLORS.text },
  body: { fontSize: 15, color: COLORS.text },
  small: { fontSize: 13, color: COLORS.textLight },
  button: { fontSize: 16, fontWeight: '600' as const, color: COLORS.textWhite },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
