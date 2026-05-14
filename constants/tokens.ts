// ============================================================================
// SODALIS — Design Tokens
// Ispirato a Notion/Linear: palette zinc, tipografia con gerarchia chiara,
// spaziatura su griglia 4px, raggi sobri 8-12px
// ============================================================================

export type Colors = {
  // Backgrounds
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  // Borders
  border: string;
  borderStrong: string;
  // Text
  text: string;
  textSub: string;
  textHint: string;
  // Accent (purple)
  accent: string;
  accentBright: string;
  accentMuted: string;
  // Status
  success: string;
  successMuted: string;
  warn: string;
  warnMuted: string;
  danger: string;
  dangerMuted: string;
  teal: string;
  tealMuted: string;
  gold: string;
  goldMuted: string;
  // Speciali
  tabBar: string;
  overlay: string;
};

export const dark: Colors = {
  bg:           '#0b0b0d',
  surface:      '#141417',
  surface2:     '#1d1d21',
  surface3:     '#26262b',
  border:       '#27272b',
  borderStrong: '#3f3f46',
  text:         '#f2f2f2',
  textSub:      '#8c8c96',
  textHint:     '#4a4a52',
  accent:       '#7c3aed',
  accentBright: '#8b5cf6',
  accentMuted:  '#7c3aed20',
  success:      '#10b981',
  successMuted: '#10b98120',
  warn:         '#f59e0b',
  warnMuted:    '#f59e0b20',
  danger:       '#ef4444',
  dangerMuted:  '#ef444420',
  teal:         '#14b8a6',
  tealMuted:    '#14b8a620',
  gold:         '#f59e0b',
  goldMuted:    '#f59e0b20',
  tabBar:       '#0b0b0d',
  overlay:      'rgba(0,0,0,0.65)',
};

export const light: Colors = {
  bg:           '#f9f9fb',
  surface:      '#ffffff',
  surface2:     '#f3f3f6',
  surface3:     '#e9e9ee',
  border:       '#e2e2e8',
  borderStrong: '#c8c8d2',
  text:         '#0a0a0d',
  textSub:      '#5a5a68',
  textHint:     '#9a9aaa',
  accent:       '#7c3aed',
  accentBright: '#6d28d9',
  accentMuted:  '#7c3aed12',
  success:      '#059669',
  successMuted: '#05966912',
  warn:         '#d97706',
  warnMuted:    '#d9770612',
  danger:       '#dc2626',
  dangerMuted:  '#dc262612',
  teal:         '#0d9488',
  tealMuted:    '#0d948812',
  gold:         '#d97706',
  goldMuted:    '#d9770612',
  tabBar:       '#ffffff',
  overlay:      'rgba(0,0,0,0.4)',
};

// Tipografia
export const type = {
  size: {
    xs: 11, sm: 13, base: 15, md: 16,
    lg: 18, xl: 22, '2xl': 26, '3xl': 32,
  } as const,
  weight: {
    normal:   '400' as const,
    medium:   '500' as const,
    semibold: '600' as const,
    bold:     '700' as const,
    black:    '800' as const,
  } as const,
};

// Spaziatura (griglia 4px)
export const space = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20,
  '2xl': 24, '3xl': 32, '4xl': 40,
} as const;

// Raggi
export const radius = {
  sm: 6, md: 8, lg: 10, xl: 14,
  '2xl': 20, full: 999,
} as const;
