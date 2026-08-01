<?php

namespace App\Services;

use App\Models\JbsStudentRegistration;

/**
 * Builds the plain-data payload the frontend uses to fill statement-of-result
 * and certificate PDF templates in the browser. Both documents share the same
 * payload so a single fetch feeds either output.
 */
class JbsDocumentDataService
{
    public function __construct(
        private JbsStudentProgressService $progress,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function forRegistration(JbsStudentRegistration $registration): array
    {
        $registration->loadMissing(['session', 'level.modules']);
        $summary = $this->progress->summary($registration);

        $modules = [];
        foreach ($summary['modules'] as $i => $row) {
            $taken = (bool) $row['test_taken'];
            $modules[] = [
                'serial' => $i + 1,
                'name' => $row['module_name'],
                'grade' => $taken && $row['grade_short'] !== null ? $row['grade_short'] : 'NS',
                'taken' => $taken,
            ];
        }

        return [
            'registration_number' => $registration->registration_number,
            'full_name' => $registration->fullName(),
            'first_name' => $registration->first_name,
            'last_name' => $registration->last_name,
            'session_name' => $registration->session->name,
            'level_name' => $registration->level->name,
            // Summer JBS 2026 graduation ceremony date (printed on certificate + statement).
            'issued_on' => '2nd August 2026',
            'overall_grade_label' => $summary['overall_grade_label'],
            'overall_grade_short' => $summary['overall_grade_short'],
            'overall_percent' => $summary['overall_percent'],
            'modules' => $modules,
        ];
    }
}
