import { alpha, createTheme, type PaletteMode, type Theme } from '@mui/material/styles';

const ink = '#0f1f33';
const slate = '#1a3352';
const parchment = '#faf8f4';
const gold = '#b8923a';
const night = '#0c1522';
const nightPaper = '#152338';

export function createSchoolTheme(mode: PaletteMode): Theme {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#8eb4e0' : slate,
        light: isDark ? '#b3cdef' : '#2a4a73',
        dark: isDark ? '#5a84b5' : ink,
        contrastText: isDark ? ink : '#ffffff',
      },
      secondary: {
        main: gold,
        light: '#d4b76a',
        dark: '#8a6d2a',
        contrastText: ink,
      },
      background: {
        default: isDark ? night : parchment,
        paper: isDark ? nightPaper : '#ffffff',
      },
      text: {
        primary: isDark ? '#e8eef6' : '#141c28',
        secondary: isDark ? '#9aabbf' : '#4a5568',
      },
      divider: alpha(isDark ? '#ffffff' : ink, isDark ? 0.12 : 0.08),
    },
    typography: {
      fontFamily: '"Plus Jakarta Sans", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      h1: {
        fontWeight: 700,
        letterSpacing: '-0.02em',
        lineHeight: 1.15,
      },
      h2: {
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },
      h3: {
        fontWeight: 600,
        letterSpacing: '-0.01em',
      },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      subtitle1: {
        fontWeight: 500,
        letterSpacing: '0.01em',
      },
      subtitle2: {
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        fontSize: '0.75rem',
      },
      button: {
        fontWeight: 600,
        letterSpacing: '0.02em',
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 10,
            paddingInline: 20,
          },
          containedPrimary: {
            boxShadow: isDark ? 'none' : `0 4px 14px ${alpha(slate, 0.35)}`,
            '&:hover': {
              boxShadow: isDark ? 'none' : `0 6px 20px ${alpha(slate, 0.45)}`,
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            border: `1px solid ${alpha(isDark ? '#ffffff' : ink, isDark ? 0.1 : 0.06)}`,
            boxShadow: isDark ? 'none' : `0 4px 24px ${alpha(ink, 0.06)}`,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          rounded: {
            borderRadius: 16,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backdropFilter: 'blur(12px)',
            backgroundColor: alpha(isDark ? nightPaper : '#ffffff', 0.88),
            color: isDark ? '#e8eef6' : ink,
            borderBottom: `1px solid ${alpha(isDark ? '#ffffff' : ink, isDark ? 0.1 : 0.06)}`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: isDark ? nightPaper : '#ffffff',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            borderRadius: 8,
          },
        },
      },
    },
  });
}

/** Default light theme (useful for non-reactive imports / tests). */
export const schoolTheme = createSchoolTheme('light');
