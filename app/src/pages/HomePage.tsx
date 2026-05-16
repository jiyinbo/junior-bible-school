import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Container, Stack, Tooltip, Typography } from '@mui/material';
import { usePublicRegistrationOpen } from '../hooks/usePublicRegistrationOpen';
import { PublicHeader } from '../layout/PublicHeader';

const REGISTRATION_CLOSED_HINT =
  'Registration is not open at the moment. Please check back when a session opens.';

export function HomePage() {
  const { registrationOpen } = usePublicRegistrationOpen();
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PublicHeader />

      <Box
        component="main"
        sx={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          background: (t) =>
            `linear-gradient(165deg, ${t.palette.background.paper} 0%, ${t.palette.background.default} 45%, ${t.palette.primary.dark}14 100%)`,
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            position: 'relative',
            py: { xs: 4, sm: 6, md: 10 },
            px: { xs: 2, sm: 3 },
          }}
        >
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '1.75rem', sm: '2.25rem', md: '3rem' },
              lineHeight: { xs: 1.25, md: 1.15 },
              maxWidth: 640,
            }}
          >
            Scripture-centred learning for every age group.
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              mt: { xs: 2, md: 2.5 },
              maxWidth: 560,
              fontSize: { xs: '1rem', sm: '1.125rem' },
              lineHeight: 1.6,
            }}
          >
            Register for the next session, take open tests with your registration number, and download
            results when your programme is complete.
          </Typography>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ mt: { xs: 3, md: 4 }, maxWidth: { xs: '100%', sm: 480 } }}
          >
            {registrationOpen ? (
              <Button
                component={RouterLink}
                to="/register"
                variant="contained"
                size="large"
                fullWidth
                sx={{ py: 1.5 }}
              >
                Start registration
              </Button>
            ) : (
              <Tooltip title={REGISTRATION_CLOSED_HINT}>
                <span style={{ width: '100%' }}>
                  <Button variant="contained" size="large" fullWidth disabled sx={{ py: 1.5 }}>
                    Start registration
                  </Button>
                </span>
              </Tooltip>
            )}
            <Button
              component={RouterLink}
              to="/student"
              variant="outlined"
              size="large"
              fullWidth
              sx={{ py: 1.5, display: { xs: 'none', sm: 'inline-flex' } }}
            >
              Student portal
            </Button>
          </Stack>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: { xs: 4, md: 6 }, lineHeight: 1.6 }}
          >
            Winners Chapel International Dartford Campus.
          </Typography>
        </Container>
      </Box>

      <Box
        component="footer"
        sx={{ py: 2, px: { xs: 2, sm: 3 }, borderTop: 1, borderColor: 'divider' }}
      >
        <Container maxWidth="lg" disableGutters>
          <Typography variant="caption" color="text.secondary">
            © {new Date().getFullYear()} Junior Bible School
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
