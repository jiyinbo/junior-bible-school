import type { ReactNode } from 'react';
import { IconButton, Paper, Stack, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

export function EditableDetailSection({
  title,
  onEdit,
  canEdit = true,
  children,
}: {
  title: string;
  onEdit?: () => void;
  canEdit?: boolean;
  children: ReactNode;
}) {
  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="h6">{title}</Typography>
        {canEdit && onEdit ? (
          <IconButton size="small" aria-label={`Edit ${title}`} onClick={onEdit}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        ) : null}
      </Stack>
      <Stack spacing={0.5}>{children}</Stack>
    </Paper>
  );
}
