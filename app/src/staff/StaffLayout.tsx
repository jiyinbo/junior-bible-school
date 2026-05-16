import { useState } from 'react';
import { Link as RouterLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import { useStaffAuth } from './StaffAuthContext';
import { navItemsForRole, navSectionsForRole } from './navConfig';

const DRAWER_WIDTH = 260;

export function StaffLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading, logout } = useStaffAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
        <Typography color="text.secondary">Loading…</Typography>
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/staff/login" replace state={{ from: location.pathname }} />;
  }

  const nav = navItemsForRole(user.role);
  const navSections = navSectionsForRole(user.role);

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ gap: 1.5, px: 2 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <SchoolRoundedIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>
            JBS Staff
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user.role === 'admin' ? 'Administrator' : 'Teacher'}
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1, px: 1, py: 1 }}>
        {navSections.map((section) => (
          <Box key={section.id} component="li" sx={{ listStyle: 'none' }}>
            {section.title && (
              <ListSubheader
                disableSticky
                sx={{
                  bgcolor: 'transparent',
                  lineHeight: 2,
                  px: 2,
                  py: 0.5,
                  mt: section.id === 'programme' ? 0 : 1,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                }}
              >
                {section.title}
              </ListSubheader>
            )}
            {section.items.map((item) => {
              const selected =
                item.path === '/staff'
                  ? location.pathname === '/staff'
                  : location.pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <ListItemButton
                  key={item.path}
                  component={RouterLink}
                  to={item.path}
                  selected={selected}
                  onClick={() => setMobileOpen(false)}
                  sx={{ borderRadius: 2, mb: 0.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Icon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              );
            })}
          </Box>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {user.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap display="block">
          {user.email}
        </Typography>
        <Button
          fullWidth
          size="small"
          sx={{ mt: 1.5 }}
          onClick={() => void logout().then(() => navigate('/staff/login', { replace: true }))}
        >
          Log out
        </Button>
        <Button component={RouterLink} to="/" fullWidth size="small" sx={{ mt: 0.5 }}>
          Public site
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: '1.1rem' }}>
            {nav.find((n) =>
              n.path === '/staff' ? location.pathname === '/staff' : location.pathname.startsWith(n.path),
            )?.label ?? 'Staff portal'}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          p: { xs: 2, sm: 3 },
          mt: 8,
          maxWidth: 1100,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
