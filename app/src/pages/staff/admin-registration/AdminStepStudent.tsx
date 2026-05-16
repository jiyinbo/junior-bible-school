import { useState } from 'react';
import { Box, Button, Stack } from '@mui/material';
import { FormSection } from '../../registration/FormLayout';
import { LevelCourseField } from '../../registration/LevelCourseField';
import { StudentRegistrationFields } from '../../registration/StudentRegistrationFields';
import type { ChildForm, LevelOption } from '../../registration/types';
import { normalizeChildContacts, validateChild } from '../../registration/validation';

type Props = {
  levels: LevelOption[];
  child: ChildForm;
  onChildChange: (patch: Partial<ChildForm>) => void;
  onBack: () => void;
  onNext: () => void;
};

export function AdminStepStudent({ levels, child, onChildChange, onBack, onNext }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const patchChild = (patch: Partial<ChildForm>) => {
    onChildChange(patch);
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(patch).forEach((k) => delete next[k]);
      return next;
    });
  };

  const handleNext = () => {
    const nextErrors = validateChild(child, levels);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      onChildChange(normalizeChildContacts(child));
      onNext();
    }
  };

  return (
    <Stack spacing={3}>
      <FormSection title="Course">
        <LevelCourseField
          levels={levels}
          value={child.jbs_level_id}
          onChange={(id) => patchChild({ jbs_level_id: id })}
          error={errors.jbs_level_id ?? errors.level}
          label="Course / level"
          disabled={levels.length === 0}
        />
      </FormSection>

      <StudentRegistrationFields values={child} errors={errors} onChange={patchChild} />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Button onClick={onBack}>Back</Button>
        <Button variant="contained" onClick={handleNext}>
          Next
        </Button>
      </Box>
    </Stack>
  );
}
