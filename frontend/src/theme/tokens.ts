export const THEME = {
  colors: {
    primary: '#1E5FBF',
    primaryHover: '#184E9E',
    primaryLight: '#EAF2FF',
    primaryDark: '#133D7C',
    white: '#FFFFFF',
    canvas: '#F8FAFC',
    text: '#1A1A2E',
    textMuted: '#64748B',
    textDim: '#94A3B8',
    border: '#E2E8F0',
    status: {
      success: '#10B981',
      successBg: '#ECFDF5',
      warning: '#F59E0B',
      warningBg: '#FEF3C7',
      danger: '#EF4444',
      dangerBg: '#FEF2F2',
      info: '#3B82F6',
      infoBg: '#EFF6FF',
    }
  },
  typography: {
    fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
    monoFamily: "'JetBrains Mono', monospace",
  },
  spacing: {
    sidebarCollapsedWidth: '64px',
    sidebarExpandedWidth: '240px',
    topbarHeight: '64px',
  },
  shadows: {
    card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
    drawer: '-4px 0 24px rgba(0, 0, 0, 0.12)',
    dropdown: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  }
} as const;
