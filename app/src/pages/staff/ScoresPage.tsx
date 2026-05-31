import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  MenuItem,
  Paper,
  Stack,
  TextField,
} from '@mui/material';
import { toastSuccess } from '../../feedback/toast';
import { apiJson, parseApiError } from '../../api/http';
import { PageHeader } from '../../staff/PageHeader';
import { useStaffAuth } from '../../staff/StaffAuthContext';

type ModuleOption = {
  module: { id: number; name: string };
  session: string;
  level: string;
};

type LevelOption = {
  key: string;
  label: string;
};

function sessionLevelKey(m: ModuleOption): string {
  return `${m.session}\u0001${m.level}`;
}

export function ScoresPage() {
  const { user, isAdmin } = useStaffAuth();
  const canScoreAllModules = isAdmin || user?.role === 'assistant';
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [regNum, setRegNum] = useState('');
  const [levelKey, setLevelKey] = useState('');
  const [moduleId, setModuleId] = useState<number | ''>('');
  const [score, setScore] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiJson<{ data: ModuleOption[] }>('/api/v1/staff/my-modules')
      .then((r) => setModules(r.data))
      .catch(() => setError('Could not load modules.'));
  }, []);

  const levelOptions = useMemo((): LevelOption[] => {
    const map = new Map<string, LevelOption>();
    for (const m of modules) {
      const key = sessionLevelKey(m);
      if (!map.has(key)) {
        map.set(key, { key, label: `${m.session} · ${m.level}` });
      }
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [modules]);

  const modulesForLevel = useMemo(() => {
    if (!levelKey) return [];
    return modules
      .filter((m) => sessionLevelKey(m) === levelKey)
      .sort((a, b) => a.module.name.localeCompare(b.module.name));
  }, [modules, levelKey]);

  const selectedModule = useMemo(
    () => modulesForLevel.find((m) => m.module.id === moduleId) ?? null,
    [modulesForLevel, moduleId],
  );

  useEffect(() => {
    if (moduleId !== '' && !modulesForLevel.some((m) => m.module.id === moduleId)) {
      setModuleId('');
    }
  }, [levelKey, modulesForLevel, moduleId]);

  const submitManual = async () => {
    if (!regNum.trim() || moduleId === '') return;
    setError(null);
    try {
      await apiJson('/api/v1/staff/scores/manual', {
        method: 'POST',
        json: {
          registration_number: regNum.trim(),
          jbs_module_id: moduleId,
          score: Number(score),
          max_score: 100,
        },
      });
      toastSuccess('Score saved.');
      setRegNum('');
      setScore('');
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Enter scores"
        subtitle={
          canScoreAllModules
            ? 'Record paper test results for any module. Choose session and tier, then search for the module.'
            : 'Record paper test results for your assigned modules. Choose tier, then search for the module.'
        }
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, maxWidth: 520 }}>
        <Stack spacing={2}>
          <TextField
            label="Registration number"
            value={regNum}
            onChange={(e) => setRegNum(e.target.value)}
            fullWidth
          />
          <TextField
            select
            label="Session · tier"
            value={levelKey}
            onChange={(e) => {
              setLevelKey(e.target.value);
              setModuleId('');
            }}
            fullWidth
            required
            helperText="Pick the course tier first to shorten the module list"
          >
            {levelOptions.map((l) => (
              <MenuItem key={l.key} value={l.key}>
                {l.label}
              </MenuItem>
            ))}
          </TextField>
          <Autocomplete
            options={modulesForLevel}
            value={selectedModule}
            onChange={(_, option) => setModuleId(option?.module.id ?? '')}
            getOptionLabel={(option) => option.module.name}
            isOptionEqualToValue={(a, b) => a.module.id === b.module.id}
            disabled={!levelKey}
            fullWidth
            autoHighlight
            openOnFocus
            noOptionsText={levelKey ? 'No modules for this tier' : 'Select a tier first'}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Module"
                required
                placeholder={levelKey ? 'Type to search…' : 'Select a tier first'}
              />
            )}
          />
          <TextField
            label="Score"
            type="number"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            inputProps={{ min: 0, max: 100 }}
            helperText="Out of 100"
            fullWidth
          />
          <Button variant="contained" onClick={() => void submitManual()}>
            Save score
          </Button>
        </Stack>
      </Paper>
    </>
  );
}
