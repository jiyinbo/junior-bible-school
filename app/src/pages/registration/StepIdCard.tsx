import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import type { EnrolledParticipant } from './types';

type Props = {
  enrolled: EnrolledParticipant[];
  footer?: ReactNode;
};

export function StepIdCard({ enrolled, footer }: Props) {
  return (
    <Stack spacing={3} alignItems="center">
      <Typography variant="body1" color="text.secondary" textAlign="center">
        Save each registration number or QR code. Bring printed ID cards to JBS if possible.
      </Typography>
      <Grid container spacing={2} justifyContent="center">
        {enrolled.map((p) => (
          <Grid key={p.registration_number} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card variant="outlined" sx={{ maxWidth: 280, mx: 'auto' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="overline" color="primary">
                  {p.session_name}
                </Typography>
                <Typography variant="subtitle2" gutterBottom>
                  {p.level_name}
                </Typography>
                <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
                  <QRCodeSVG value={p.registration_number} size={96} />
                </Box>
                <Typography variant="h6">{p.participant_name}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                  {p.registration_number}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      {footer ?? (
        <Button component={RouterLink} to="/student" variant="contained">
          Open student portal
        </Button>
      )}
    </Stack>
  );
}
