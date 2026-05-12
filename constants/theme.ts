// ============================================================
// SODALIS — Design System / Theme
// ============================================================

export const Colors = {
  // Base
  background:   '#0D0D0F',
  surface:      '#18181C',
  surfaceHigh:  '#242429',
  border:       '#2E2E36',
  borderLight:  '#3A3A44',

  // Brand
  primary:      '#7C6AF7',
  primaryLight: '#9B8FFF',
  primaryDim:   'rgba(124,106,247,0.15)',

  // Semantic
  success:      '#4ADE80',
  warning:      '#FBBF24',
  error:        '#F87171',
  info:         '#60A5FA',

  // Text
  textPrimary:  '#F4F4F8',
  textSecondary:'#9090A8',
  textTertiary: '#5A5A70',
  textDisabled: '#3A3A50',

  // Group accent colors (palette predefinita)
  accents: [
    '#7C6AF7', // viola
    '#F97316', // arancio
    '#10B981', // verde
    '#F43F5E', // rosso
    '#0EA5E9', // blu
    '#A855F7', // purple
    '#EAB308', // giallo
    '#EC4899', // rosa
  ],
} as const;

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
} as const;

export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 9999,
} as const;

export const FontSize = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  24,
  xxxl: 30,
  huge: 38,
} as const;

export const FontWeight = {
  regular:    '400' as const,
  medium:     '500' as const,
  semibold:   '600' as const,
  bold:       '700' as const,
  extrabold:  '800' as const,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

export const GROUP_EMOJIS = [
  '🍕','🍺','🎉','🔥','⚡','🌙','🎸','🏆',
  '🎯','🐺','🦅','🌊','💀','🚀','🎮','🏄',
] as const;

export const LORE_EMOJIS = ['😂','🔥','💀','❤️','👑','🤌','💯','🫡'] as const;
