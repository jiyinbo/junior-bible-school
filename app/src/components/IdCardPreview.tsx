import { useState } from 'react';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { parseApiError, printPdf } from '../api/http';
import type { EnrolledParticipant } from '../pages/registration/types';

const NAVY = '#1a3352';
const CARD_WIDTH = 240;
const LOGO_WATERMARK_SRC = '/logo.png';

function sessionSubtitle(name: string): string {
  return name.replace(/\s*-\s*\d{4}\s*$/, '').trim() || name;
}

function sessionYear(name: string): string {
  const match = name.match(/\d{4}/);
  return match ? match[0] : String(new Date().getFullYear());
}

export function IdCardPreview({ participant: p }: { participant: EnrolledParticipant }) {
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
      <Box
        sx={{
          bgcolor: NAVY,
          color: '#fff',
          px: 1.5,
          py: 1,
          flexShrink: 0,
          textAlign: 'center',
        }}
      >
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

      <Box
        sx={{
          position: 'relative',
          px: 1.5,
          py: 0.75,
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          <Box
            component="img"
            src={LOGO_WATERMARK_SRC}
            alt=""
            sx={{ width: '59%', maxWidth: 142, opacity: 0.07 }}
          />
        </Box>

        <Box sx={{ position: 'relative', zIndex: 1 }}>
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
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mx: 2,
              mb: 0.5,
            }}
          >
            <Box sx={{ flex: 1, borderBottom: `1px solid ${NAVY}` }} />
            <Typography sx={{ fontSize: '0.55rem', color: NAVY, lineHeight: 1 }}>●</Typography>
            <Box sx={{ flex: 1, borderBottom: `1px solid ${NAVY}` }} />
          </Box>
          <Typography
            sx={{
              fontSize: '0.55rem',
              fontWeight: 700,
              color: NAVY,
              letterSpacing: 0.5,
            }}
          >
            TIER
          </Typography>
          <Typography
            sx={{
              fontSize: '0.65rem',
              fontWeight: 700,
              lineHeight: 1.2,
              mb: 0.5,
            }}
          >
            {p.level_name}
          </Typography>
          <Box sx={{ borderBottom: `1px solid ${NAVY}`, mx: 2, mb: 0.5 }} />
          <Typography
            sx={{
              fontSize: '0.55rem',
              fontWeight: 700,
              color: NAVY,
              letterSpacing: 0.5,
            }}
          >
            CAMPUS
          </Typography>
          <Typography
            sx={{
              fontSize: '0.6rem',
              fontWeight: 700,
              lineHeight: 1.2,
              pb: 0.25,
            }}
          >
            Winners Chapel International
            <br />
            Dartford Campus
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          bgcolor: NAVY,
          color: '#fff',
          py: 1,
          px: 1,
          flexShrink: 0,
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            fontWeight: 700,
            letterSpacing: 1,
            lineHeight: 1.2,
            fontSize: '1.1rem',
          }}
        >
          {year}
        </Typography>
      </Box>
    </Box>
  );
}

export function IdCardActions({
  registrationNumber,
  pin,
}: {
  registrationNumber: string;
  pin: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const body = { registration_number: registrationNumber, pin };

  const print = async () => {
    setBusy(true);
    setError(null);
    try {
      await printPdf('/api/v1/student/documents/id-card', body);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={1} alignItems="center" sx={{ width: '100%' }}>
      <Button
        size="small"
        variant="outlined"
        startIcon={<PrintOutlinedIcon />}
        disabled={busy}
        onClick={() => void print()}
      >
        {busy ? 'Preparing…' : 'Download / Print'}
      </Button>
      {error && (
        <Alert severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      )}
    </Stack>
  );
}

type IdCardDialogProps = {
  open: boolean;
  onClose: () => void;
  participant: EnrolledParticipant;
  pin: string;
};

export function IdCardDialog({ open, onClose, participant, pin }: IdCardDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Your ID card</DialogTitle>
      <DialogContent>
        <Stack spacing={2} alignItems="center" sx={{ pt: 1 }}>
          <IdCardPreview participant={participant} />
          <IdCardActions registrationNumber={participant.registration_number} pin={pin} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
