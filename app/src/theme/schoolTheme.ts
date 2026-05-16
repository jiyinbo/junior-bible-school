import { alpha, createTheme } from '@mui/material/styles';

const ink = '#0f1f33';
const slate = '#1a3352';
const parchment = '#faf8f4';
const gold = '#b8923a';

export const schoolTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: slate,
      light: '#2a4a73',
      dark: ink,
      contrastText: '#ffffff',
    },
    secondary: {
      main: gold,
      light: '#d4b76a',
      dark: '#8a6d2a',
      contrastText: ink,
    },
    background: {
      default: parchment,
      paper: '#ffffff',
    },
    text: {
      primary: '#141c28',
      secondary: '#4a5568',
    },
    divider: alpha(ink, 0.08),
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
          boxShadow: `0 4px 14px ${alpha(slate, 0.35)}`,
          '&:hover': {
            boxShadow: `0 6px 20px ${alpha(slate, 0.45)}`,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${alpha(ink, 0.06)}`,
          boxShadow: `0 4px 24px ${alpha(ink, 0.06)}`,
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
          backgroundColor: alpha('#ffffff', 0.85),
          color: ink,
          borderBottom: `1px solid ${alpha(ink, 0.06)}`,
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
