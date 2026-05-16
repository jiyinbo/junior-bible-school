import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import { usePublicRegistrationOpen } from '../hooks/usePublicRegistrationOpen';

const REGISTRATION_CLOSED_HINT =
  'Registration is not open at the moment. Please check back when a session opens.';

type NavItem = {
  to: string;
  label: string;
  variant: 'text' | 'outlined' | 'contained';
  publicRegistration?: boolean;
};

const navItems: NavItem[] = [
  { to: '/register', label: 'Register', variant: 'text', publicRegistration: true },
  { to: '/student', label: 'Student portal', variant: 'outlined' },
  { to: '/staff/login', label: 'Staff login', variant: 'contained' },
];

export function PublicHeader() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { registrationOpen } = usePublicRegistrationOpen();

  const closeDrawer = () => setDrawerOpen(false);

  const isNavDisabled = (item: NavItem) => item.publicRegistration === true && !registrationOpen;

  const renderNavButton = (item: NavItem, fullWidth = false) => {
    const disabled = isNavDisabled(item);
    const button = (
      <Button
        component={disabled ? 'span' : RouterLink}
        to={disabled ? undefined : item.to}
        variant={item.variant}
        color="primary"
        size="small"
        disabled={disabled}
        fullWidth={fullWidth}
      >
        {item.label}
      </Button>
    );

    if (!disabled) return button;

    return (
      <Tooltip title={REGISTRATION_CLOSED_HINT}>
        <span style={fullWidth ? { width: '100%' } : undefined}>{button}</span>
      </Tooltip>
    );
  };

  return (
    <>
      <AppBar position="sticky" elevation={0} color="inherit">
        <Toolbar
          sx={{
            px: { xs: 1.5, sm: 2 },
            minHeight: { xs: 56, sm: 64 },
            gap: 1,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={{ xs: 1, sm: 1.5 }}
            component={RouterLink}
            to="/"
            sx={{ flexGrow: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}
          >
            <Box
              sx={{
                width: { xs: 36, sm: 40 },
                height: { xs: 36, sm: 40 },
                flexShrink: 0,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
              }}
            >
              <SchoolRoundedIcon sx={{ fontSize: { xs: 20, sm: 22 } }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                component="div"
                noWrap
                sx={{
                  lineHeight: 1.2,
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                }}
              >
                Junior Bible School
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  letterSpacing: '0.04em',
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                Learning portal
              </Typography>
            </Box>
          </Stack>

          {!isMobile && (
            <Stack direction="row" spacing={1} alignItems="center" flexShrink={0}>
              {navItems.map((item) => (
                <span key={item.to}>{renderNavButton(item)}</span>
              ))}
            </Stack>
          )}

          {isMobile && (
            <IconButton
              edge="end"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
              sx={{ flexShrink: 0 }}
            >
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={closeDrawer}
        PaperProps={{ sx: { width: 'min(100vw - 48px, 320px)' } }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Menu
          </Typography>
          <IconButton aria-label="Close menu" onClick={closeDrawer} edge="end">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />
        <List sx={{ px: 1, py: 2 }}>
          {navItems.map((item) => {
            const disabled = isNavDisabled(item);
            const row = (
              <ListItemButton
                component={disabled ? 'div' : RouterLink}
                to={disabled ? undefined : item.to}
                onClick={disabled ? undefined : closeDrawer}
                disabled={disabled}
                sx={{ borderRadius: 2, py: 1.25 }}
              >
                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600 }} />
              </ListItemButton>
            );

            return (
              <ListItem key={item.to} disablePadding sx={{ mb: 1 }}>
                {disabled ? (
                  <Tooltip title={REGISTRATION_CLOSED_HINT} placement="left">
                    <span style={{ width: '100%' }}>{row}</span>
                  </Tooltip>
                ) : (
                  row
                )}
              </ListItem>
            );
          })}
        </List>
      </Drawer>
    </>
  );
}
