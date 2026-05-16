import type { ReactNode } from 'react';
import { Button, Stack, type ButtonProps, type StackProps } from '@mui/material';

const INPUT_ROW_HEIGHT = 40;

type RowProps = {
  children: ReactNode;
} & StackProps;

/** Fields and actions in one row; actions align with the input box, not helper text below. */
export function InlineFormRow({ children, sx, ...stackProps }: RowProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      alignItems={{ xs: 'stretch', sm: 'flex-end' }}
      flexWrap="wrap"
      useFlexGap
      sx={sx}
      {...stackProps}
    >
      {children}
    </Stack>
  );
}

/** Contained action aligned to small outlined fields in an InlineFormRow. */
export function FormRowButton({ sx, size = 'small', ...props }: ButtonProps) {
  return (
    <Button
      size={size}
      variant="contained"
      sx={{
        flexShrink: 0,
        alignSelf: { xs: 'stretch', sm: 'flex-end' },
        ...(size === 'small'
          ? { height: INPUT_ROW_HEIGHT, minHeight: INPUT_ROW_HEIGHT }
          : undefined),
        boxShadow: 1,
        ...sx,
      }}
      {...props}
    />
  );
}
