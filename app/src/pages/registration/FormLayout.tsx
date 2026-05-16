import { Children, type ReactNode } from 'react';
import { Box, Grid, Stack, Typography } from '@mui/material';

type FormSectionProps = {
  title: string;
  children: ReactNode;
};

export function FormSection({ title, children }: FormSectionProps) {
  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <Stack spacing={2} sx={{ mt: 1 }}>
        {children}
      </Stack>
    </Box>
  );
}

type FormRowProps = {
  children: ReactNode;
};

/** Responsive row: stacks on xs, equal columns from sm upward (2 or 3 children). */
export function FormRow({ children }: FormRowProps) {
  const items = Children.toArray(children).filter(Boolean);
  const smSize = items.length <= 1 ? 12 : items.length === 2 ? 6 : 4;

  return (
    <Grid container spacing={2}>
      {items.map((child, index) => (
        <Grid key={index} size={{ xs: 12, sm: smSize }}>
          {child}
        </Grid>
      ))}
    </Grid>
  );
}
