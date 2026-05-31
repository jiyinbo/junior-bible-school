import { useEffect, useState } from 'react';
import { IconButton, Stack, TextField } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';

type Props = {
  label?: string;
  value: string;
  onSave: (value: string) => void | Promise<void>;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  /** Allow saving an empty value (e.g. to clear an optional field). */
  allowEmpty?: boolean;
};

export function InlineFieldSave({
  label,
  value,
  onSave,
  disabled,
  fullWidth,
  size = 'small',
  allowEmpty = false,
}: Props) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const changed = draft.trim() !== value.trim();
  const canSave = changed && (allowEmpty || draft.trim() !== '') && !disabled && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave(draft.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack direction="row" spacing={0.5} alignItems="flex-end" sx={{ width: fullWidth ? '100%' : undefined }}>
      <TextField
        label={label}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        size={size}
        fullWidth={fullWidth}
        disabled={disabled || saving}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && canSave) void save();
        }}
      />
      <IconButton
        color="primary"
        size="small"
        disabled={!canSave}
        onClick={() => void save()}
        sx={{ width: 40, height: 40, flexShrink: 0 }}
        aria-label="Save"
      >
        <CheckIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}
