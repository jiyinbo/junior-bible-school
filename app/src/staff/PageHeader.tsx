import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function PageHeader({ title, subtitle, action }: Props) {
  return (
  <Box sx={{ mb: 3 }}>
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 2,
        mb: subtitle ? 1 : 0,
      }}
    >
      <Typography variant="h4" sx={{ mb: 0, wordBreak: 'break-word' }}>
        {title}
      </Typography>
      {action}
    </Box>
    {subtitle && (
      <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
        {subtitle}
      </Typography>
    )}
  </Box>
  );
}
