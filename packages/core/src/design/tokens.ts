// Nexus Design System Tokens (Code Implementation)

export interface ThemeColors {
  bgApp: string;
  bgSurface: string;
  bgSurfaceElevated: string;
  bgSurfaceHover: string;
  bgSurfaceActive: string;
  borderSubtle: string;
  borderMedium: string;
  borderFocus: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  tradeBuy: string;
  tradeBuyHover: string;
  tradeBuySubtle: string;
  tradeBuyGlow: string;
  tradeSell: string;
  tradeSellHover: string;
  tradeSellSubtle: string;
  tradeSellGlow: string;
  badgeLive: string;
  badgePaper: string;
  badgeDev: string;
  accentPrimary: string;
  accentHover: string;
  accentGlow: string;
}

export const DARK_THEME: ThemeColors = {
  bgApp: '#080b0f',
  bgSurface: '#0f141c',
  bgSurfaceElevated: '#161d28',
  bgSurfaceHover: '#1e2634',
  bgSurfaceActive: '#252f40',
  borderSubtle: '#1c2430',
  borderMedium: '#2a3547',
  borderFocus: '#3b82f6',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textTertiary: '#64748b',
  textDisabled: '#334155',
  tradeBuy: '#10b981',
  tradeBuyHover: '#059669',
  tradeBuySubtle: 'rgba(16, 185, 129, 0.12)',
  tradeBuyGlow: 'rgba(16, 185, 129, 0.25)',
  tradeSell: '#f43f5e',
  tradeSellHover: '#e11d48',
  tradeSellSubtle: 'rgba(244, 63, 94, 0.12)',
  tradeSellGlow: 'rgba(244, 63, 94, 0.25)',
  badgeLive: '#10b981',
  badgePaper: '#f59e0b',
  badgeDev: '#8b5cf6',
  accentPrimary: '#2563eb',
  accentHover: '#1d4ed8',
  accentGlow: 'rgba(37, 99, 235, 0.3)',
};

export const LIGHT_THEME: ThemeColors = {
  bgApp: '#f4f6f9',
  bgSurface: '#ffffff',
  bgSurfaceElevated: '#ffffff',
  bgSurfaceHover: '#f1f5f9',
  bgSurfaceActive: '#e2e8f0',
  borderSubtle: '#e2e8f0',
  borderMedium: '#cbd5e1',
  borderFocus: '#2563eb',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textTertiary: '#64748b',
  textDisabled: '#cbd5e1',
  tradeBuy: '#059669',
  tradeBuyHover: '#047857',
  tradeBuySubtle: 'rgba(5, 150, 105, 0.1)',
  tradeBuyGlow: 'rgba(5, 150, 105, 0.2)',
  tradeSell: '#dc2626',
  tradeSellHover: '#b91c1c',
  tradeSellSubtle: 'rgba(220, 38, 38, 0.1)',
  tradeSellGlow: 'rgba(220, 38, 38, 0.2)',
  badgeLive: '#059669',
  badgePaper: '#d97706',
  badgeDev: '#7c3aed',
  accentPrimary: '#2563eb',
  accentHover: '#1d4ed8',
  accentGlow: 'rgba(37, 99, 235, 0.2)',
};

export const SPACING = {
  xxs: '2px',
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
} as const;

export const TYPOGRAPHY = {
  fontSans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontMono: "'JetBrains Mono', 'Fira Code', 'Roboto Mono', monospace",
} as const;
