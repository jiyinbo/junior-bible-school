<?php

namespace App\Services;

use App\Models\JbsStudentRegistration;

/**
 * Builds the plain-data payload the frontend uses to render the statement of
 * result and certificate PDFs entirely in the browser. Both documents share
 * the same payload so a single fetch feeds either output.
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
                'grade' => $taken && $row['grade_short'] !== null ? $row['grade_short'] : '—',
                'taken' => $taken,
            ];
        }

        $issuedOn = $registration->level_completed_at ?? now();

        return [
            'registration_number' => $registration->registration_number,
            'full_name' => $registration->fullName(),
            'first_name' => $registration->first_name,
            'last_name' => $registration->last_name,
            'session_name' => $registration->session->name,
            'level_name' => $registration->level->name,
            'issued_on' => $issuedOn->format('j F Y'),
            'overall_grade_label' => $summary['overall_grade_label'],
            'overall_grade_short' => $summary['overall_grade_short'],
            'overall_percent' => $summary['overall_percent'],
            'modules' => $modules,
        ];
    }
}
