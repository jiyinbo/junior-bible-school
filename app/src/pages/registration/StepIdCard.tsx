import { useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import {
  Alert,
  Box,
  Button,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { downloadPdf, parseApiError, printPdf } from '../../api/http';
import type { EnrolledParticipant } from './types';

const NAVY = '#1a3352';
const CARD_WIDTH = 240;

type Props = {
  enrolled: EnrolledParticipant[];
  footer?: ReactNode;
};

function sessionSubtitle(name: string): string {
  return name.replace(/\s*-\s*\d{4}\s*$/, '').trim() || name;
}

function sessionYear(name: string): string {
  const match = name.match(/\d{4}/);
  return match ? match[0] : String(new Date().getFullYear());
}

function IdCardPreview({ participant: p }: { participant: EnrolledParticipant }) {
  const year = sessionYear(p.session_name);

  return (
    <Box
      sx={{
        width: CARD_WIDTH,
        maxWidth: '100%',
        mx: 'auto',
        borderRadius: 1.5,
        overflow: 'hidden',
        border: `2px solid ${NAVY}`,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#fff',
        boxShadow: 2,
      }}
    >
      <Box sx={{ bgcolor: NAVY, color: '#fff', px: 1.5, py: 1, flexShrink: 0, textAlign: 'center' }}>
        <Typography
          sx={{
            display: 'block',
            fontSize: '0.65rem',
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            lineHeight: 1.2,
          }}
        >
          Junior Bible School
        </Typography>
        <Typography
          sx={{
            display: 'block',
            fontSize: '0.6rem',
            opacity: 0.95,
            lineHeight: 1.25,
            mt: 0.25,
            wordBreak: 'break-word',
          }}
        >
          {sessionSubtitle(p.session_name)}
        </Typography>
      </Box>

      <Box sx={{ px: 1.5, py: 0.75, textAlign: 'center', flexShrink: 0 }}>
        <Box
          sx={{
            width: 32,
            height: 9,
            mx: 'auto',
            mb: 0.75,
            borderRadius: 5,
            border: '1px solid #b8c0cc',
            bgcolor: '#eef1f5',
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5 }}>
          <Box sx={{ border: `2px solid ${NAVY}`, p: 0.25, lineHeight: 0 }}>
            <QRCodeSVG value={p.registration_number} size={76} />
          </Box>
        </Box>
        <Typography
          sx={{
            fontSize: '0.65rem',
            fontWeight: 700,
            color: NAVY,
            fontFamily: 'monospace',
            mb: 0.4,
            wordBreak: 'break-all',
          }}
        >
          {p.registration_number}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: NAVY,
            textTransform: 'uppercase',
            lineHeight: 1.15,
            mb: 0.5,
            wordBreak: 'break-word',
          }}
        >
          {p.participant_name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, mb: 0.5 }}>
          <Box sx={{ flex: 1, borderBottom: `1px solid ${NAVY}` }} />
          <Typography sx={{ fontSize: '0.55rem', color: NAVY, lineHeight: 1 }}>●</Typography>
          <Box sx={{ flex: 1, borderBottom: `1px solid ${NAVY}` }} />
        </Box>
        <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: NAVY, letterSpacing: 0.5 }}>
          LEVEL
        </Typography>
        <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, lineHeight: 1.2, mb: 0.5 }}>
          {p.level_name}
        </Typography>
        <Box sx={{ borderBottom: `1px solid ${NAVY}`, mx: 2, mb: 0.5 }} />
        <Typography sx={{ fontSize: '0.55rem', fontWeight: 700, color: NAVY, letterSpacing: 0.5 }}>
          CAMPUS
        </Typography>
        <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, lineHeight: 1.2, pb: 0.25 }}>
          Winners Chapel International
          <br />
          Dartford Campus
        </Typography>
      </Box>

      <Box sx={{ bgcolor: NAVY, color: '#fff', py: 1, px: 1, flexShrink: 0, textAlign: 'center' }}>
        <Typography sx={{ fontWeight: 700, letterSpacing: 1, lineHeight: 1.2, fontSize: '1.1rem' }}>
          {year}
        </Typography>
      </Box>
    </Box>
  );
}

function IdCardActions({ registrationNumber }: { registrationNumber: string }) {
  const [busy, setBusy] = useState<'download' | 'print' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const filename = `jbs-id-card-${registrationNumber.replace(/\//g, '-')}.pdf`;
  const body = { registration_number: registrationNumber };

  const download = async () => {
    setBusy('download');
    setError(null);
    try {
      await downloadPdf('/api/v1/student/documents/id-card', body, filename);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setBusy(null);
    }
  };

  const print = async () => {
    setBusy('print');
    setError(null);
    try {
      await printPdf('/api/v1/student/documents/id-card', body);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Stack spacing={1} alignItems="center" sx={{ width: '100%' }}>
      <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center" useFlexGap>
        <Button
          size="small"
          variant="outlined"
          startIcon={<DownloadOutlinedIcon />}
          disabled={busy !== null}
          onClick={() => void download()}
        >
          {busy === 'download' ? 'Downloading…' : 'Download PDF'}
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<PrintOutlinedIcon />}
          disabled={busy !== null}
          onClick={() => void print()}
        >
          {busy === 'print' ? 'Preparing…' : 'Print'}
        </Button>
      </Stack>
      {error && (
        <Alert severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      )}
    </Stack>
  );
}

export function StepIdCard({ enrolled, footer }: Props) {
  return (
    <Stack spacing={3} sx={{ width: '100%' }}>
      <Stack spacing={1.5} sx={{ maxWidth: 640, mx: 'auto' }}>
        <Typography variant="h6" textAlign="center">
          Congratulations! You are now registered.
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Email confirmation has been sent to the email(s) provided. Please check your spam/junk in
          case it lands there.
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          The student portal is now live. You will need your registration number to access the
          portal where more information about the programme is available.
        </Typography>
      </Stack>

      <Grid container spacing={3} justifyContent="center" sx={{ width: '100%' }}>
        {enrolled.map((p) => (
          <Grid key={p.registration_number} size={{ xs: 12, sm: 6, md: 4 }}>
            <Stack spacing={2} alignItems="center">
              <IdCardPreview participant={p} />
              <IdCardActions registrationNumber={p.registration_number} />
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
