import { useState } from "react";
import { Link as RouterLink, Navigate, useNavigate } from "react-router-dom";
import {
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { parseApiError } from "../../api/http";
import { useStaffAuth } from "../../staff/StaffAuthContext";

export function StaffLoginPage() {
  const nav = useNavigate();
  const { login, user } = useStaffAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to="/staff" replace />;
  }

  const submit = async () => {
    setError(null);
    try {
      await login(email, password);
      nav("/staff", { replace: true });
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Button component={RouterLink} to="/" sx={{ mb: 2 }}>
        ← Home
      </Button>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Staff login
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Admins and teachers use the same portal. Your role controls which menu
          items you see.
        </Typography>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        <Stack spacing={2}>
          <TextField
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            onKeyDown={(e) => e.key === "Enter" && void submit()}
          />
          <Button variant="contained" onClick={() => void submit()}>
            Sign in
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
