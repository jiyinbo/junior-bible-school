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
     * Progress payload for the student portal — completion counts only, no scores or grades.
     *
     * @return array<string, mixed>
     */
    public function studentPortalSummary(JbsStudentRegistration $registration): array
    {
        $summary = $this->summary($registration);

        $modules = array_map(static fn (array $row): array => [
            'module_id' => $row['module_id'],
            'module_name' => $row['module_name'],
            'test_taken' => $row['test_taken'],
        ], $summary['modules']);

        return [
            'attendance_days' => $summary['attendance_days'],
            'tests_total' => $summary['tests_total'],
            'tests_taken' => $summary['tests_taken'],
            'tests_missed' => $summary['tests_missed'],
            'programme_phase' => $summary['programme_phase'],
            'graduation_pending' => $summary['graduation_pending'],
            'eligible_for_graduation' => $summary['eligible_for_graduation'],
            'level_completed' => $summary['level_completed'],
            'modules' => $modules,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function summary(JbsStudentRegistration $registration): array
    {
        $registration->loadMissing(['session', 'level.modules.test']);

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
                'grade_label' => null,
                'grade_short' => null,
                'source' => $outcome?->source,
            ];

            if ($outcome !== null) {
                $grade = $this->grading->moduleGradeForScores((float) $outcome->score, (float) $outcome->max_score);
                $row['score'] = (int) round((float) $outcome->score);
                $row['max_score'] = (int) round((float) $outcome->max_score);
                $row['percent'] = $grade['percent'];
                $row['grade_label'] = $grade['grade_label'];
                $row['grade_short'] = $grade['grade_short'];
                $row['test_passed'] = $grade['passed'];
                if ($grade['passed']) {
                    $testsPassed++;
                }
            }

            $modules[] = $row;
        }

        $testsTotal = $registration->level->modules->count();
        $attendanceDays = $this->distinctAttendanceDays($registration);
        $programmePhase = $registration->session->programmePhase();
        $graduationPending = $this->isGraduationPending($programmePhase, $testsTaken);
        $testsMissed = $graduationPending
            ? 0
            : $this->countMissedTests($registration, $outcomes, $programmePhase);
        $eligibleForGraduation = $graduationPending
            ? null
            : $testsMissed < JbsGradingService::MAX_MISSED_TESTS_FOR_GRADUATION;

        $scoredPercents = array_values(array_filter(
            array_column($modules, 'percent'),
            fn ($p) => $p !== null,
        ));
        $overallPercent = $this->grading->overallAveragePercent($scoredPercents);
        $overallGrade = $overallPercent !== null
            ? $this->grading->overallGradeForPercent($overallPercent)
            : null;

        return [
            'attendance_days' => $attendanceDays,
            'tests_total' => $testsTotal,
            'tests_taken' => $testsTaken,
            'tests_passed' => $testsPassed,
            'tests_missed' => $testsMissed,
            'programme_phase' => $programmePhase,
            'graduation_pending' => $graduationPending,
            'eligible_for_graduation' => $eligibleForGraduation,
            'level_completed' => $this->isLevelCompleted($registration),
            'level_completed_at' => $registration->level_completed_at,
            'modules' => $modules,
            'overall_percent' => $overallPercent,
            'overall_grade_label' => $overallGrade['grade_label'] ?? null,
            'overall_grade_short' => $overallGrade['grade_short'] ?? null,
            'grading_scale' => $this->grading->gradingKey(),
            'module_grading_scale' => $this->grading->moduleGradingKey(),
        ];
    }

    /**
     * Graduation is not assessed until the programme is under way and at least one module is completed.
     */
    private function isGraduationPending(string $programmePhase, int $testsTaken): bool
    {
        if ($programmePhase === 'upcoming') {
            return true;
        }

        if ($testsTaken === 0 && ! in_array($programmePhase, ['ended', 'past'], true)) {
            return true;
        }

        return false;
    }

    /**
     * Tests count as missed only after the programme has started and the test window is closed
     * (or the session has ended) without a recorded result.
     *
     * @param  \Illuminate\Support\Collection<int, JbsModuleScoreOutcome>  $outcomes
     */
    private function countMissedTests(
        JbsStudentRegistration $registration,
        $outcomes,
        string $programmePhase,
    ): int {
        if ($programmePhase === 'upcoming') {
            return 0;
        }

        $missed = 0;

        foreach ($registration->level->modules as $module) {
            $test = $module->test;
            if ($test === null || ! $test->questions()->exists()) {
                continue;
            }

            if ($outcomes->has($module->id)) {
                continue;
            }

            $test->refreshAndCloseIfExpired();

            if (in_array($programmePhase, ['ended', 'past'], true) || ! $test->isOpen()) {
                $missed++;
            }
        }

        return $missed;
    }
}
