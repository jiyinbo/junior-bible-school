import type { ReactNode } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';

/** Horizontal padding when parent Paper uses `p: { xs: 2, md: 0 }` (desktop table flush to edge). */
export function EmptyTableMessage({ children }: { children: ReactNode }) {
  return (
    <Typography color="text.secondary" sx={{ px: { xs: 0, md: 2 }, py: 2.5 }}>
      {children}
    </Typography>
  );
}

type ResponsiveTableLayoutProps = {
  table: ReactNode;
  cards: ReactNode;
  empty?: ReactNode;
  isEmpty?: boolean;
};

export function ResponsiveTableLayout({
  table,
  cards,
  empty,
  isEmpty = false,
}: ResponsiveTableLayoutProps) {
  if (isEmpty && empty) {
    return <>{empty}</>;
  }

  return (
    <>
      <Box sx={{ display: { xs: 'none', md: 'block' }, width: '100%', overflow: 'hidden' }}>
        {table}
      </Box>
      <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' }, width: '100%' }}>
        {cards}
      </Stack>
    </>
  );
}

type ListCardProps = {
  children: ReactNode;
  action?: ReactNode;
};

export function ListCard({ children, action }: ListCardProps) {
  if (action) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
          <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
          <Box sx={{ flexShrink: 0 }}>{action}</Box>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      {children}
    </Paper>
  );
}

type DetailRowProps = {
  label: string;
  children: ReactNode;
};

export function DetailRow({ label, children }: DetailRowProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 2,
        py: 0.35,
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, flexShrink: 0 }}>
        {label}
      </Typography>
      <Box sx={{ textAlign: 'right', minWidth: 0, flex: 1 }}>{children}</Box>
    </Box>
  );
}
