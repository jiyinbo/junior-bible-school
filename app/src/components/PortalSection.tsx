import type { ReactNode } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Typography,
} from '@mui/material';

type PortalSectionProps = {
  title: string;
  subtitle?: string;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  trailing?: ReactNode;
  children: ReactNode;
};

export function PortalSection({
  title,
  subtitle,
  expanded,
  onExpandedChange,
  trailing,
  children,
}: PortalSectionProps) {
  return (
    <Accordion
      expanded={expanded}
      onChange={(_, exp) => onExpandedChange(exp)}
      disableGutters
      sx={{
        '&:before': { display: 'none' },
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: { xs: 2, sm: 3 } }}>
        <Box sx={{ flex: 1, minWidth: 0, pr: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography component="span" fontWeight={600}>
              {title}
            </Typography>
            {trailing}
          </Box>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: { xs: 2, sm: 3 }, pt: 0, pb: 3 }}>{children}</AccordionDetails>
    </Accordion>
  );
}
