import type { ReactNode } from 'react';
import { Box, Paper, Typography } from '@mui/material';

export type ProgressStatItem = {
  id: string;
  label: string;
  value: ReactNode;
  detail?: string;
  valueColor?: string;
};

type ProgressSummaryStripProps = {
  items: ProgressStatItem[];
};

function ProgressStat({ label, value, detail, valueColor }: Omit<ProgressStatItem, 'id'>) {
  return (
    <Box
      sx={{
        flex: '1 1 11rem',
        minWidth: 0,
        px: { xs: 1.5, sm: 2 },
        py: 1.5,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}
      >
        {label}
      </Typography>
      <Typography
        component="div"
        variant="subtitle1"
        fontWeight={700}
        sx={{ color: valueColor ?? 'text.primary', lineHeight: 1.35, mt: 0.25 }}
      >
        {value}
      </Typography>
      {detail && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.35, lineHeight: 1.35 }}>
          {detail}
        </Typography>
      )}
    </Box>
  );
}

export function ProgressSummaryStrip({ items }: ProgressSummaryStripProps) {
  if (items.length === 0) return null;

  return (
    <Paper
      variant="outlined"
      sx={{
        mb: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        flexWrap: { md: 'wrap' },
      }}
    >
      {items.map((item, index) => (
        <Box
          key={item.id}
          sx={{
            display: 'flex',
            flex: { md: '1 1 11rem' },
            minWidth: 0,
            borderRight: {
              md: index < items.length - 1 ? 1 : 0,
            },
            borderColor: { md: 'divider' },
            borderBottom: {
              xs: index < items.length - 1 ? 1 : 0,
              md: 0,
            },
          }}
        >
          <ProgressStat {...item} />
        </Box>
      ))}
    </Paper>
  );
}
