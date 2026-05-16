import { Card, CardContent, Typography } from '@mui/material';
import type { ReactNode } from 'react';

type MetricCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  color?: 'primary' | 'warning' | 'success' | 'default';
  icon?: ReactNode;
};

export function MetricCard({ label, value, hint, color = 'default', icon }: MetricCardProps) {
  const valueColor =
    color === 'warning' ? 'warning.main' : color === 'success' ? 'success.main' : 'text.primary';

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.3 }}>
          {label}
        </Typography>
        <Typography variant="h4" sx={{ color: valueColor, fontWeight: 700, lineHeight: 1.2 }}>
          {value}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 'auto' }}>
            {hint}
          </Typography>
        )}
        {icon}
      </CardContent>
    </Card>
  );
}
