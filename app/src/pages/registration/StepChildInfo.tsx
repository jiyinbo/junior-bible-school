import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { FormSection } from './FormLayout';
import { LevelCourseField } from './LevelCourseField';
import { StudentRegistrationFields } from './StudentRegistrationFields';
import type { ChildForm, LevelOption } from './types';
import { emptyChild } from './types';
import { normalizeChildContacts, validateChild } from './validation';

type Props = {
  levels: LevelOption[];
  children: ChildForm[];
  onChildrenChange: (children: ChildForm[]) => void;
  onBack: () => void;
  onNext: () => void;
};

export function StepChildInfo({ levels, children, onChildrenChange, onBack, onNext }: Props) {
  const [draft, setDraft] = useState<ChildForm>(emptyChild);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [listError, setListError] = useState<string | null>(null);

  const patchDraft = (patch: Partial<ChildForm>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(patch).forEach((k) => delete next[k]);
      return next;
    });
  };

  const addChild = () => {
    const nextErrors = validateChild(draft, levels);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onChildrenChange([...children, normalizeChildContacts(draft)]);
    setDraft(emptyChild());
    setErrors({});
    setListError(null);
  };

  const removeChild = (index: number) => {
    onChildrenChange(children.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    if (children.length === 0) {
      setListError('Please add at least one child.');
      return;
    }
    setListError(null);
    onNext();
  };

  return (
    <Stack spacing={3}>
      <FormSection title="Course">
        <LevelCourseField
          levels={levels}
          value={draft.jbs_level_id}
          onChange={(id) => patchDraft({ jbs_level_id: id })}
          error={errors.jbs_level_id}
          label="Course / level"
        />
      </FormSection>

      <StudentRegistrationFields values={draft} errors={errors} onChange={patchDraft} />

      <Button variant="outlined" onClick={addChild}>
        Add child
      </Button>

      {children.length > 0 && (
        <>
          <Divider />
          <Typography variant="subtitle2">Children added</Typography>
          <List dense disablePadding>
            {children.map((c, idx) => {
              const levelName = levels.find((l) => l.id === c.jbs_level_id)?.name ?? '—';
              return (
                <ListItem
                  key={`${c.email}-${idx}`}
                  secondaryAction={
                    <IconButton edge="end" aria-label="Remove child" onClick={() => removeChild(idx)}>
                      <DeleteOutlineIcon />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={`${c.first_name} ${c.last_name}`}
                    secondary={`${levelName} · ${c.email}`}
                  />
                </ListItem>
              );
            })}
          </List>
        </>
      )}

      {listError && <Alert severity="warning">{listError}</Alert>}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Button onClick={onBack}>Back</Button>
        <Button variant="contained" onClick={handleNext}>
          Next
        </Button>
      </Box>
    </Stack>
  );
}
