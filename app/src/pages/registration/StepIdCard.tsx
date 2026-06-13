import { type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Grid, Stack, Typography } from '@mui/material';
import { IdCardActions, IdCardPreview } from '../../components/IdCardPreview';
import type { EnrolledParticipant } from './types';

type Props = {
  enrolled: EnrolledParticipant[];
  footer?: ReactNode;
};

export function StepIdCard({ enrolled, footer }: Props) {
  return (
    <Stack spacing={3} sx={{ width: '100%' }}>
      <Stack spacing={1.5} sx={{ mx: 'auto', width: '100%', textAlign: 'center' }}>
        <Typography variant="h6">
          Congratulations! You are now registered.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Email confirmation has been sent to the email(s) provided. Please check your spam/junk in
          case it lands there.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          The student portal is now live. You will need your registration number to access the portal
          where more information about the programme is available.
        </Typography>
      </Stack>

      <Grid container spacing={3} justifyContent="center" sx={{ width: '100%' }}>
        {enrolled.map((p) => (
          <Grid key={p.registration_number} size={{ xs: 12, sm: 6, md: 4 }}>
            <Stack spacing={2} alignItems="center">
              <IdCardPreview participant={p} />
              <IdCardActions
                registrationNumber={p.registration_number}
                pin={p.portal_pin}
              />
            </Stack>
          </Grid>
        ))}
      </Grid>

      {footer ?? (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button component={RouterLink} to="/student" variant="contained">
            Open student portal
          </Button>
        </Box>
      )}
    </Stack>
  );
}
