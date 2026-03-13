import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3B82F6', // Blue
      light: '#60A5FA',
      dark: '#2563EB',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#F1F5F9', // Light gray
      contrastText: '#1E293B',
    },
    success: {
      main: '#22C55E', // Green
      light: '#4ADE80',
      dark: '#16A34A',
      contrastText: '#ffffff',
    },
    background: {
      default: '#F8FAFC',
      paper: '#ffffff',
    },
    text: {
      primary: '#1E293B',
      secondary: '#64748B',
    },
    error: {
      main: '#EF4444',
    },
    warning: {
      main: '#F59E0B',
    },
    info: {
      main: '#3B82F6',
    },
  },
  typography: {
    fontFamily: "'Space Grotesk', sans-serif",
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 20px',
          boxShadow: '0 2px 4px rgba(59, 130, 246, 0.15)',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(59, 130, 246, 0.25)',
            transform: 'translateY(-1px)',
          },
          transition: 'all 0.2s ease',
        },
        contained: {
          '&:hover': {
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
          },
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
            backgroundColor: 'rgba(59, 130, 246, 0.04)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '& fieldset': {
              borderWidth: '1px',
              borderColor: '#E2E8F0',
            },
            '&:hover fieldset': {
              borderColor: '#3B82F6',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#3B82F6',
              borderWidth: '2px',
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #E2E8F0',
          padding: '16px',
        },
        head: {
          fontWeight: 600,
          backgroundColor: '#F8FAFC',
          color: '#64748B',
          textTransform: 'uppercase',
          fontSize: '0.75rem',
          letterSpacing: '0.05em',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          border: 'none',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          marginBottom: 4,
          '&.Mui-selected': {
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        },
      },
    },
  },
});

export default theme;
