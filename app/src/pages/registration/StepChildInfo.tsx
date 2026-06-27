import { useRef, useState } from 'react';
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
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { FormSection } from './FormLayout';
import { LevelCourseField, TierPlacementGuide } from './LevelCourseField';
import { StudentRegistrationFields } from './StudentRegistrationFields';
import type { ChildForm, LevelOption } from './types';
import { emptyChild } from './types';
import { normalizeChildContacts, validateChild } from './validation';

type Props = {
  levels: LevelOption[];
  addedChildren: ChildForm[];
  onAddedChildrenChange: (children: ChildForm[]) => void;
  onBack: () => void;
  onNext: () => void;
};

function childListSecondary(child: ChildForm, levelName: string): string {
  const parts = [levelName];
  if (child.email.trim()) parts.push(child.email.trim());
  else if (child.phone.trim()) parts.push(child.phone.trim());
  return parts.join(' · ');
}

function scrollToFirstFormError(container: HTMLElement | null) {
  if (!container) return;
  const target =
    container.querySelector('.Mui-error') ??
    container.querySelector('[aria-invalid="true"]');
  target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function StepChildInfo({
  levels,
  addedChildren,
  onAddedChildrenChange,
  onBack,
  onNext,
}: Props) {
  const formRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<ChildForm>(emptyChild);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [listError, setListError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  // Bumped whenever the draft is swapped out so the contact fields remount and
  // drop their internal "touched" state — otherwise a fresh empty form would
  // re-show blur validation errors (e.g. required next-of-kin phone) left over
  // from the previous child.
  const [formInstance, setFormInstance] = useState(0);

  const patchDraft = (patch: Partial<ChildForm>) => {
    const nextDraft = { ...draft, ...patch };
    setDraft(nextDraft);
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(patch).forEach((k) => delete next[k]);
      // Tier and date of birth are interdependent (the under-13 placement rule).
      // When either changes, refresh the partner field's error so a stale
      // failure clears once the conflict is resolved — without introducing new
      // errors for fields the user hasn't tried to submit yet.
      if ('date_of_birth' in patch || 'jbs_level_id' in patch) {
        const recomputed = validateChild(nextDraft, levels);
        (['date_of_birth', 'jbs_level_id'] as const).forEach((key) => {
          if (next[key]) {
            if (recomputed[key]) next[key] = recomputed[key];
            else delete next[key];
          }
        });
      }
      return next;
    });
    setSaveMessage(null);
  };

  const resetDraft = () => {
    setDraft(emptyChild());
    setEditingIndex(null);
    setErrors({});
    setFormInstance((n) => n + 1);
  };

  const saveChild = () => {
    setSaveMessage(null);
    setListError(null);

    const nextErrors = validateChild(draft, levels);
    setErrors(nextErrors);
    const errorCount = Object.keys(nextErrors).length;
    if (errorCount > 0) {
      setListError(
        errorCount === 1
          ? 'Please fix the highlighted field below, then try again.'
          : `Please fix the ${errorCount} highlighted fields below, then try again.`,
      );
      requestAnimationFrame(() => scrollToFirstFormError(formRef.current));
      return;
    }

    const normalized = {
      ...normalizeChildContacts(draft),
      has_allergies: draft.has_allergies,
      allergies: draft.has_allergies ? draft.allergies.trim() : '',
    };
    const displayName = `${normalized.first_name} ${normalized.last_name}`.trim();

    if (editingIndex !== null) {
      onAddedChildrenChange(
        addedChildren.map((c, i) => (i === editingIndex ? normalized : c)),
      );
      setSaveMessage(`Saved changes for ${displayName}.`);
    } else {
      onAddedChildrenChange([...addedChildren, normalized]);
      setSaveMessage(`Added ${displayName} to your registration.`);
    }
    resetDraft();
    requestAnimationFrame(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const startEdit = (index: number) => {
    const child = addedChildren[index];
    setDraft({
      ...child,
      has_allergies: child.has_allergies ?? Boolean(child.allergies.trim()),
      allergies: child.allergies,
    });
    setEditingIndex(index);
    setErrors({});
    setListError(null);
    setSaveMessage(null);
    setFormInstance((n) => n + 1);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const cancelEdit = () => {
    resetDraft();
    setSaveMessage(null);
  };

  const removeChild = (index: number) => {
    onAddedChildrenChange(addedChildren.filter((_, i) => i !== index));
    if (editingIndex === index) {
      resetDraft();
    } else if (editingIndex !== null && index < editingIndex) {
      setEditingIndex(editingIndex - 1);
    }
    setSaveMessage(null);
  };

  const handleNext = () => {
    if (editingIndex !== null) {
      setListError('Save or cancel your edits before continuing.');
      return;
    }
    if (addedChildren.length === 0) {
      setListError('Please add at least one child.');
      return;
    }
    setListError(null);
    onNext();
  };

  return (
    <Stack spacing={3}>
      <TierPlacementGuide />

      <Box ref={formRef} key={formInstance}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {editingIndex !== null
            ? 'Edit child details'
            : addedChildren.length > 0
              ? 'Add another child'
              : 'Add a child'}
        </Typography>

        <Stack spacing={3}>
          <FormSection title="Tier">
            <LevelCourseField
              levels={levels}
              value={draft.jbs_level_id}
              onChange={(id) => patchDraft({ jbs_level_id: id })}
              error={errors.jbs_level_id}
              label="Tier"
            />
          </FormSection>

          <StudentRegistrationFields values={draft} errors={errors} onChange={patchDraft} />

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            <Button type="button" variant="outlined" onClick={saveChild} disabled={levels.length === 0}>
              {editingIndex !== null
                ? 'Save changes'
                : addedChildren.length > 0
                  ? 'Add another child'
                  : 'Add child'}
            </Button>
            {editingIndex !== null && (
              <Button type="button" variant="text" onClick={cancelEdit}>
                Cancel edit
              </Button>
            )}
          </Box>
        </Stack>
      </Box>

      {levels.length === 0 && (
        <Alert severity="info">No tiers are available for this session. Go back and choose another session.</Alert>
      )}

      {saveMessage && (
        <Alert severity="success" onClose={() => setSaveMessage(null)}>
          {saveMessage}
        </Alert>
      )}

      {listError && <Alert severity="warning">{listError}</Alert>}

      {addedChildren.length > 0 && (
        <Box ref={listRef}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2">Children added ({addedChildren.length})</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Add another child above, or continue with Next when you're done.
          </Typography>
          <List dense disablePadding sx={{ mt: 1 }}>
            {addedChildren.map((c, idx) => {
              const levelName = levels.find((l) => l.id === c.jbs_level_id)?.name ?? '—';
              const isEditing = editingIndex === idx;
              return (
                <ListItem
                  key={`${idx}-${c.first_name}-${c.last_name}`}
                  sx={{
                    bgcolor: isEditing ? 'action.hover' : 'grey.50',
                    borderRadius: 1,
                    mb: 0.5,
                  }}
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        edge="end"
                        aria-label={`Edit ${c.first_name} ${c.last_name}`}
                        onClick={() => startEdit(idx)}
                        disabled={isEditing}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label={`Remove ${c.first_name} ${c.last_name}`}
                        onClick={() => removeChild(idx)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={`${c.first_name} ${c.last_name}${isEditing ? ' (editing above)' : ''}`}
                    secondary={childListSecondary(c, levelName)}
                  />
                </ListItem>
              );
            })}
          </List>
        </Box>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Button type="button" onClick={onBack}>
          Back
        </Button>
        <Button type="button" variant="contained" onClick={handleNext}>
          Next
        </Button>
      </Box>
    </Stack>
  );
}
