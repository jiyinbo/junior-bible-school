import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Button,
  createFilterOptions,
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

type UnscoredStudent = {
  id: number;
  registration_number: string;
  first_name: string;
  last_name: string;
  full_name: string;
};

function sessionLevelKey(m: ModuleOption): string {
  return `${m.session}\u0001${m.level}`;
}

function studentLabel(student: UnscoredStudent): string {
  return `${student.registration_number} · ${student.full_name}`;
}

const filterStudents = createFilterOptions<UnscoredStudent>({
  stringify: (option) =>
    `${option.registration_number} ${option.first_name} ${option.last_name} ${option.full_name}`,
});

export function ScoresPage() {
  const { user, isAdmin } = useStaffAuth();
  const canScoreAllModules = isAdmin || user?.role === 'assistant';
  const [modules, setModules] = useState<ModuleOption[]>([]);
  const [levelKey, setLevelKey] = useState('');
  const [moduleId, setModuleId] = useState<number | ''>('');
  const [students, setStudents] = useState<UnscoredStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<UnscoredStudent | null>(null);
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

  const loadStudents = useCallback(async (modId: number) => {
    setLoadingStudents(true);
    try {
      const response = await apiJson<{ data: UnscoredStudent[] }>(
        `/api/v1/staff/scores/unscored-students?jbs_module_id=${modId}`,
      );
      setStudents(response.data);
    } catch {
      setError('Could not load students.');
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  useEffect(() => {
    if (moduleId !== '' && !modulesForLevel.some((m) => m.module.id === moduleId)) {
      setModuleId('');
    }
  }, [levelKey, modulesForLevel, moduleId]);

  useEffect(() => {
    setSelectedStudent(null);
    if (moduleId === '') {
      setStudents([]);
      return;
    }
    void loadStudents(moduleId);
  }, [moduleId, loadStudents]);

  const submitManual = async () => {
    if (!selectedStudent || moduleId === '' || score === '') return;
    setError(null);
    try {
      await apiJson('/api/v1/staff/scores/manual', {
        method: 'POST',
        json: {
          registration_number: selectedStudent.registration_number,
          jbs_module_id: moduleId,
          score: Number(score),
          max_score: 100,
        },
      });
      toastSuccess('Score saved.');
      setSelectedStudent(null);
      setScore('');
      await loadStudents(moduleId);
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
            ? 'Choose session and tier, pick a module, then search for a student who has not been scored yet.'
            : 'Choose tier and module, then search for a student who has not been scored yet.'
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
          <Autocomplete
            options={students}
            value={selectedStudent}
            onChange={(_, option) => setSelectedStudent(option)}
            getOptionLabel={studentLabel}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            filterOptions={filterStudents}
            disabled={moduleId === ''}
            loading={loadingStudents}
            fullWidth
            autoHighlight
            openOnFocus
            noOptionsText={
              moduleId === ''
                ? 'Select a module first'
                : loadingStudents
                  ? 'Loading students…'
                  : 'No unscored students in this tier'
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Student"
                required
                placeholder={
                  moduleId === '' ? 'Select a module first' : 'Search by name or registration number…'
                }
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
          <Button
            variant="contained"
            disabled={!selectedStudent || moduleId === '' || score === ''}
            onClick={() => void submitManual()}
          >
            Save score
          </Button>
        </Stack>
      </Paper>
    </>
  );
}
