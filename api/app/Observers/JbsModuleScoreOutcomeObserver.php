<?php

namespace App\Observers;

use App\Models\JbsModuleScoreOutcome;
use App\Models\JbsStudentRegistration;
use App\Services\JbsStudentProgressService;

class JbsModuleScoreOutcomeObserver
{
    public function __construct(
        private JbsStudentProgressService $progress,
    ) {}

    public function saved(JbsModuleScoreOutcome $outcome): void
    {
        $this->sync($outcome);
    }

    public function deleted(JbsModuleScoreOutcome $outcome): void
    {
        $this->sync($outcome);
    }

    private function sync(JbsModuleScoreOutcome $outcome): void
    {
        $registration = JbsStudentRegistration::query()->find($outcome->jbs_student_registration_id);
        if ($registration === null) {
            return;
        }

        $this->progress->syncLevelCompletion($registration);
    }
}
