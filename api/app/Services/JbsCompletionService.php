<?php

namespace App\Services;

use App\Models\JbsStudentRegistration;

/**
 * @deprecated Use JbsStudentProgressService — completion is admin-marked on the registration.
 */
class JbsCompletionService
{
    public function __construct(
        private JbsStudentProgressService $progress,
    ) {}

    public function hasCompletedProgramme(JbsStudentRegistration $registration): bool
    {
        return $this->progress->isLevelCompleted($registration);
    }

    public function assertDocumentsAllowed(JbsStudentRegistration $registration): void
    {
        $this->progress->assertDocumentsAllowed($registration);
    }

    /**
     * @return list<string>
     */
    public function completionBlockers(JbsStudentRegistration $registration): array
    {
        if ($this->progress->isLevelCompleted($registration)) {
            return [];
        }

        return [$this->progress->studentCompletionMessage($registration)];
    }
}
