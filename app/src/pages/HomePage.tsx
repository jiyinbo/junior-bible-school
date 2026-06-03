import { useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { SUMMER_JBS_INTRO, SummerJbsBrief } from "../components/SummerJbsBrief";
import { usePublicRegistrationOpen } from "../hooks/usePublicRegistrationOpen";
import { PublicHeader } from "../layout/PublicHeader";

const PAGE_TITLE = "Summer Junior Bible School";

const REGISTRATION_CLOSED_HINT =
  "Registration is not open at the moment. Please check back when a session opens.";

function HomePageActions() {
  const { registrationOpen } = usePublicRegistrationOpen();

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1.5}
      sx={{ width: { xs: "100%", sm: "auto" }, flexShrink: 0 }}
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
          <span style={{ width: "100%" }}>
            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled
              sx={{ py: 1.5 }}
            >
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
        sx={{ py: 1.5 }}
      >
        Student portal
      </Button>
    </Stack>
  );
}

export function HomePage() {
  useEffect(() => {
    const previous = document.title;
    document.title = PAGE_TITLE;
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PublicHeader />

      <Box
        component="main"
        sx={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          background: (t) =>
            `linear-gradient(165deg, ${t.palette.background.paper} 0%, ${t.palette.background.default} 45%, ${t.palette.primary.dark}14 100%)`,
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            position: "relative",
            py: { xs: 3, sm: 4, md: 6 },
            px: { xs: 2, sm: 3 },
          }}
        >
          <Typography
            variant="overline"
            color="primary"
            sx={{ letterSpacing: "0.12em", display: "block" }}
          >
            Summer 2026
          </Typography>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: "1.75rem", sm: "2.25rem", md: "2.75rem" },
              lineHeight: { xs: 1.25, md: 1.15 },
              maxWidth: 720,
              mt: 0.5,
            }}
          >
            {PAGE_TITLE}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              mt: { xs: 1.5, md: 2 },
              maxWidth: 720,
              fontSize: { xs: "1rem", sm: "1.0625rem" },
              lineHeight: 1.65,
            }}
          >
            {SUMMER_JBS_INTRO}
          </Typography>

          <Box
            sx={{ mt: { xs: 3, md: 3.5 }, maxWidth: { xs: "100%", sm: 480 } }}
          >
            <HomePageActions />
          </Box>

          <SummerJbsBrief />
        </Container>
      </Box>

      <Box
        component="footer"
        sx={{
          py: 2.5,
          px: { xs: 2, sm: 3 },
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <Container maxWidth="lg" disableGutters>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1, lineHeight: 1.65 }}
          >
            Winners Chapel International Dartford Campus.
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ mt: 2 }}
          >
            © {new Date().getFullYear()} Junior Bible School
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
