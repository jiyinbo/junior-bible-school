<?php

namespace App\Services;

use App\Models\JbsAttendanceLog;
use App\Models\JbsModuleScoreOutcome;
use App\Models\JbsStudentRegistration;

class JbsStudentProgressService
{
    public function __construct(
        private JbsGradingService $grading,
    ) {}

    public function distinctAttendanceDays(JbsStudentRegistration $registration): int
    {
        return (int) JbsAttendanceLog::query()
            ->where('jbs_student_registration_id', $registration->id)
            ->selectRaw('COUNT(DISTINCT attended_on) as days')
            ->value('days');
    }

    public function isLevelCompleted(JbsStudentRegistration $registration): bool
    {
        return (bool) $registration->level_completed;
    }

    public function assertDocumentsAllowed(JbsStudentRegistration $registration): void
    {
        if (! $this->isLevelCompleted($registration)) {
            abort(403, $this->studentCompletionMessage($registration));
        }
    }

    public function studentCompletionMessage(JbsStudentRegistration $registration): string
    {
        if ($this->isLevelCompleted($registration)) {
            return '';
        }

        return 'Your level has not been marked as completed yet. Statement and certificate will be available once an administrator confirms your successful completion for this session.';
    }

    /**
     * @return array<string, mixed>
     */
    public function summary(JbsStudentRegistration $registration): array
    {
        $registration->loadMissing(['session', 'level.modules']);

        $outcomes = JbsModuleScoreOutcome::query()
            ->where('jbs_student_registration_id', $registration->id)
            ->get()
            ->keyBy('jbs_module_id');

        $modules = [];
        $testsTaken = 0;
        $testsPassed = 0;

        foreach ($registration->level->modules as $module) {
            /** @var JbsModuleScoreOutcome|null $outcome */
            $outcome = $outcomes->get($module->id);
            $taken = $outcome !== null;

            if ($taken) {
                $testsTaken++;
            }

            $row = [
                'module_id' => $module->id,
                'module_name' => $module->name,
                'test_taken' => $taken,
                'test_passed' => false,
                'score' => null,
                'max_score' => null,
                'percent' => null,
                'source' => $outcome?->source,
            ];

            if ($outcome !== null) {
                $grade = $this->grading->gradeForScores((float) $outcome->score, (float) $outcome->max_score);
                $row['score'] = (int) round((float) $outcome->score);
                $row['max_score'] = (int) round((float) $outcome->max_score);
                $row['percent'] = $grade['percent'];
                $row['test_passed'] = $grade['passed'];
                if ($grade['passed']) {
                    $testsPassed++;
                }
            }

            $modules[] = $row;
        }

        $testsTotal = $registration->level->modules->count();
        $attendanceDays = $this->distinctAttendanceDays($registration);

        $scoredPercents = array_values(array_filter(
            array_column($modules, 'percent'),
            fn ($p) => $p !== null,
        ));
        $overallPercent = count($scoredPercents) > 0
            ? (int) round(array_sum($scoredPercents) / count($scoredPercents))
            : null;
        $overallGrade = $overallPercent !== null
            ? $this->grading->gradeForPercent($overallPercent)
            : null;

        return [
            'attendance_days' => $attendanceDays,
            'tests_total' => $testsTotal,
            'tests_taken' => $testsTaken,
            'tests_passed' => $testsPassed,
            'level_completed' => $this->isLevelCompleted($registration),
            'level_completed_at' => $registration->level_completed_at,
            'modules' => $modules,
            'overall_percent' => $overallPercent,
            'overall_grade_label' => $overallGrade['grade_label'] ?? null,
            'overall_grade_short' => $overallGrade['grade_short'] ?? null,
            'grading_scale' => $this->grading->gradingKey(),
        ];
    }
}
