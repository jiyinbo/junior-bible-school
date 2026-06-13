<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\JbsLevel;
use App\Models\JbsModule;
use App\Models\JbsModuleScoreOutcome;
use App\Models\JbsStudentRegistration;
use App\Services\JbsIdCardPdfService;
use App\Services\JbsQrService;
use App\Services\JbsRegistrationService;
use App\Services\JbsStudentPortalPinService;
use App\Services\JbsStudentProgressService;
use RuntimeException;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpFoundation\Response;

class RegistrationAdminController extends Controller
{
    public function __construct(
        private JbsStudentProgressService $progress,
        private JbsRegistrationService $registrationService,
        private JbsQrService $qr,
        private JbsIdCardPdfService $idCardPdf,
        private JbsStudentPortalPinService $portalPin,
    ) {}

  /**
     * @return array<string, mixed>
     */
    private function filterParams(Request $request): array
    {
        return $request->validate([
            'jbs_session_id' => ['nullable', 'integer', 'exists:jbs_sessions,id'],
            'jbs_level_id' => ['nullable', 'integer', 'exists:jbs_levels,id'],
            'q' => ['nullable', 'string', 'max:191'],
            'level_completed' => ['nullable', 'boolean'],
            'has_allergies' => ['nullable', 'boolean'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Builder<JbsStudentRegistration>
     */
    private function filteredQuery(array $filters): Builder
    {
        $query = JbsStudentRegistration::query()
            ->with(['session', 'level'])
            ->orderBy('jbs_session_id')
            ->orderBy('jbs_level_id')
            ->orderBy('last_name')
            ->orderBy('first_name');

        if (! empty($filters['jbs_session_id'])) {
            $query->where('jbs_session_id', $filters['jbs_session_id']);
        }
        if (! empty($filters['jbs_level_id'])) {
            $query->where('jbs_level_id', $filters['jbs_level_id']);
        }
        if (! empty($filters['q'])) {
            $q = '%'.trim((string) $filters['q']).'%';
            $query->where(function ($sub) use ($q): void {
                $sub->where('registration_number', 'like', $q)
                    ->orWhere('first_name', 'like', $q)
                    ->orWhere('last_name', 'like', $q)
                    ->orWhere('email', 'like', $q);
            });
        }
        if (array_key_exists('level_completed', $filters)) {
            $query->where('level_completed', $filters['level_completed']);
        }
        if (! empty($filters['has_allergies'])) {
            $query->whereNotNull('allergies')->where('allergies', '!=', '');
        }

        return $query;
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $this->filterParams($request);
        $rows = $this->filteredQuery($filters)->limit(500)->get();

        return response()->json([
            'data' => $rows->map(function (JbsStudentRegistration $reg) {
                $summary = $this->progress->summary($reg);

                return [
                    'id' => $reg->id,
                    'registration_number' => $reg->registration_number,
                    'full_name' => $reg->fullName(),
                    'email' => $reg->email,
                    'session_name' => $reg->session->name,
                    'level_name' => $reg->level->name,
                    'allergies' => $reg->allergies,
                    'level_completed' => $summary['level_completed'],
                    'attendance_days' => $summary['attendance_days'],
                    'tests_taken' => $summary['tests_taken'],
                    'tests_passed' => $summary['tests_passed'],
                    'tests_total' => $summary['tests_total'],
                ];
            }),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $filters = $this->filterParams($request);
        $rows = $this->filteredQuery($filters)->get();

        $this->audit()->record('registration.exported', $request, metadata: [
            'row_count' => $rows->count(),
            'filters' => $filters,
        ]);

        $headers = [
            'Registration number',
            'First name',
            'Last name',
            'Email',
            'Phone',
            'Session',
            'Level',
            'Gender',
            'Date of birth',
            'Nationality',
            'Address',
            'Born again',
            'Date of new birth',
            'New birth location',
            'Place of worship',
            'Worship address',
            'Pastor name',
            'Activity group',
            'Current school',
            'School year',
            'Allergies',
            'Next of kin',
            'Next of kin phone',
            'Next of kin email',
            'Guardian name',
            'Guardian relationship',
            'Guardian phone',
            'Guardian email',
            'Registered after close',
            'Level completed',
            'Attendance days',
            'Tests taken',
            'Tests passed',
            'Tests total',
        ];

        $filename = 'jbs-students-'.now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($rows, $headers): void {
            $out = fopen('php://output', 'w');
            if ($out === false) {
                return;
            }
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, $headers);

            foreach ($rows as $reg) {
                $summary = $this->progress->summary($reg);
                fputcsv($out, [
                    $reg->registration_number,
                    $reg->first_name,
                    $reg->last_name,
                    $reg->email,
                    $reg->phone,
                    $reg->session->name,
                    $reg->level->name,
                    $reg->gender,
                    $reg->date_of_birth?->toDateString(),
                    $reg->nationality,
                    $reg->address,
                    $reg->born_again ? 'Yes' : 'No',
                    $reg->date_of_new_birth?->toDateString(),
                    $reg->new_birth_location,
                    $reg->place_of_worship,
                    $reg->place_of_worship_address,
                    $reg->pastor_name,
                    $reg->activity_group,
                    $reg->current_school,
                    $reg->current_school_year,
                    $reg->allergies,
                    $reg->next_of_kin_name,
                    $reg->next_of_kin_phone,
                    $reg->next_of_kin_email,
                    $reg->guardian_name,
                    $reg->guardian_relationship,
                    $reg->guardian_phone,
                    $reg->guardian_email,
                    $reg->registered_after_close ? 'Yes' : 'No',
                    $summary['level_completed'] ? 'Yes' : 'No',
                    $summary['attendance_days'],
                    $summary['tests_taken'],
                    $summary['tests_passed'],
                    $summary['tests_total'],
                ]);
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function show(JbsStudentRegistration $jbs_student_registration): JsonResponse
    {
        $reg = $jbs_student_registration->load(['session', 'level.modules', 'levelCompletedBy']);
        $summary = $this->progress->summary($reg);

        return response()->json([
            'data' => [
                'id' => $reg->id,
                'registration_number' => $reg->registration_number,
                'first_name' => $reg->first_name,
                'last_name' => $reg->last_name,
                'email' => $reg->email,
                'phone' => $reg->phone,
                'guardian_name' => $reg->guardian_name,
                'guardian_relationship' => $reg->guardian_relationship,
                'guardian_phone' => $reg->guardian_phone,
                'guardian_email' => $reg->guardian_email,
                'gender' => $reg->gender,
                'date_of_birth' => $reg->date_of_birth?->toDateString(),
                'nationality' => $reg->nationality,
                'address' => $reg->address,
                'born_again' => $reg->born_again,
                'date_of_new_birth' => $reg->date_of_new_birth?->toDateString(),
                'new_birth_location' => $reg->new_birth_location,
                'place_of_worship' => $reg->place_of_worship,
                'place_of_worship_address' => $reg->place_of_worship_address,
                'pastor_name' => $reg->pastor_name,
                'activity_group' => $reg->activity_group,
                'current_school' => $reg->current_school,
                'current_school_year' => $reg->current_school_year,
                'allergies' => $reg->allergies,
                'next_of_kin_name' => $reg->next_of_kin_name,
                'next_of_kin_phone' => $reg->next_of_kin_phone,
                'next_of_kin_email' => $reg->next_of_kin_email,
                'session' => [
                    'id' => $reg->session->id,
                    'name' => $reg->session->name,
                ],
                'level' => [
                    'id' => $reg->level->id,
                    'name' => $reg->level->name,
                ],
                'progress' => $summary,
                'level_completed_by' => $reg->levelCompletedBy ? [
                    'id' => $reg->levelCompletedBy->id,
                    'name' => $reg->levelCompletedBy->name,
                ] : null,
            ],
        ]);
    }

    public function update(Request $request, JbsStudentRegistration $jbs_student_registration): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['sometimes', 'string', 'max:120'],
            'last_name' => ['sometimes', 'string', 'max:120'],
            'email' => ['sometimes', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'guardian_name' => ['nullable', 'string', 'max:255'],
            'guardian_relationship' => ['nullable', 'string', 'max:120'],
            'guardian_email' => ['nullable', 'email', 'max:255'],
            'jbs_level_id' => ['sometimes', 'integer', 'exists:jbs_levels,id'],
        ]);

        // Moving a student between tiers is allowed only within the same session.
        if (array_key_exists('jbs_level_id', $data)) {
            $targetLevel = JbsLevel::query()->find($data['jbs_level_id']);
            if (! $targetLevel || $targetLevel->jbs_session_id !== $jbs_student_registration->jbs_session_id) {
                return response()->json([
                    'message' => 'Selected tier is not available for this student\'s session.',
                ], 422);
            }
        }

        $keys = array_keys($data);
        $old = $this->audit()->snapshot($jbs_student_registration, $keys);

        try {
            $reg = $this->registrationService->updateStudent($jbs_student_registration, $data);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $reg->load(['session', 'level', 'levelCompletedBy']);
        $this->audit()->updated($request, 'registration.updated', $reg, $old, $this->audit()->snapshot($reg, $keys));

        return response()->json([
            'data' => [
                'id' => $reg->id,
                'registration_number' => $reg->registration_number,
                'first_name' => $reg->first_name,
                'last_name' => $reg->last_name,
                'email' => $reg->email,
                'phone' => $reg->phone,
                'guardian_name' => $reg->guardian_name,
                'guardian_relationship' => $reg->guardian_relationship,
                'guardian_phone' => $reg->guardian_phone,
                'guardian_email' => $reg->guardian_email,
                'gender' => $reg->gender,
                'date_of_birth' => $reg->date_of_birth?->toDateString(),
                'nationality' => $reg->nationality,
                'address' => $reg->address,
                'born_again' => $reg->born_again,
                'date_of_new_birth' => $reg->date_of_new_birth?->toDateString(),
                'new_birth_location' => $reg->new_birth_location,
                'place_of_worship' => $reg->place_of_worship,
                'place_of_worship_address' => $reg->place_of_worship_address,
                'pastor_name' => $reg->pastor_name,
                'activity_group' => $reg->activity_group,
                'current_school' => $reg->current_school,
                'current_school_year' => $reg->current_school_year,
                'allergies' => $reg->allergies,
                'next_of_kin_name' => $reg->next_of_kin_name,
                'next_of_kin_phone' => $reg->next_of_kin_phone,
                'next_of_kin_email' => $reg->next_of_kin_email,
                'session' => [
                    'id' => $reg->session->id,
                    'name' => $reg->session->name,
                ],
                'level' => [
                    'id' => $reg->level->id,
                    'name' => $reg->level->name,
                ],
                'progress' => $this->progress->summary($reg),
                'level_completed_by' => $reg->levelCompletedBy ? [
                    'name' => $reg->levelCompletedBy->name,
                ] : null,
            ],
        ]);
    }

    public function updateCompletion(Request $request, JbsStudentRegistration $jbs_student_registration): JsonResponse
    {
        $data = $request->validate([
            'level_completed' => ['required', 'boolean'],
        ]);

        $completed = (bool) $data['level_completed'];
        $old = [
            'level_completed' => $jbs_student_registration->level_completed,
            'level_completed_at' => $jbs_student_registration->level_completed_at?->toDateTimeString(),
        ];

        $jbs_student_registration->update([
            'level_completed' => $completed,
            'level_completed_at' => $completed ? now() : null,
            'level_completed_by_user_id' => $completed ? $request->user()->id : null,
        ]);

        $reg = $jbs_student_registration->fresh()->load(['session', 'level', 'levelCompletedBy']);

        $this->audit()->updated(
            $request,
            'registration.completion_updated',
            $reg,
            $old,
            [
                'level_completed' => $reg->level_completed,
                'level_completed_at' => $reg->level_completed_at?->toDateTimeString(),
            ],
        );

        return response()->json([
            'data' => [
                'id' => $reg->id,
                'level_completed' => $reg->level_completed,
                'progress' => $this->progress->summary($reg),
            ],
        ]);
    }

    public function resetPin(Request $request, JbsStudentRegistration $jbs_student_registration): JsonResponse
    {
        $data = $request->validate([
            'pin' => ['nullable', 'string', 'digits:4'],
            'send_email' => ['sometimes', 'boolean'],
        ]);

        $pin = $data['pin'] ?? $this->portalPin->generatePin();
        $this->portalPin->setPin($jbs_student_registration, $pin);

        if ($data['send_email'] ?? true) {
            $this->portalPin->emailPin($jbs_student_registration, $pin);
        }

        $this->audit()->record(
            'registration.portal_pin_reset',
            $request,
            $jbs_student_registration,
            subjectLabel: $jbs_student_registration->registration_number,
            metadata: [
                'emailed' => (bool) ($data['send_email'] ?? true),
            ],
        );

        return response()->json([
            'message' => 'Portal PIN updated.',
            'data' => [
                'pin' => $pin,
            ],
        ]);
    }

    public function updateScore(Request $request, JbsStudentRegistration $jbs_student_registration): JsonResponse
    {
        $data = $request->validate([
            'jbs_module_id' => ['required', 'integer', 'exists:jbs_modules,id'],
            'score' => ['required', 'numeric', 'min:0'],
            'max_score' => ['required', 'numeric', 'min:0.01'],
        ]);

        if ((float) $data['score'] > (float) $data['max_score']) {
            return response()->json(['message' => 'Score cannot be greater than the maximum score.'], 422);
        }

        $module = JbsModule::query()->findOrFail($data['jbs_module_id']);

        $jbs_student_registration->loadMissing('level.modules');
        $moduleIds = $jbs_student_registration->level->modules->pluck('id')->all();
        abort_unless(in_array($module->id, $moduleIds, true), 422, 'Module does not belong to the student tier.');

        $existing = JbsModuleScoreOutcome::query()
            ->where('jbs_student_registration_id', $jbs_student_registration->id)
            ->where('jbs_module_id', $module->id)
            ->first();

        $old = $existing ? [
            'score' => $existing->score,
            'max_score' => $existing->max_score,
            'source' => $existing->source,
        ] : null;

        $outcome = JbsModuleScoreOutcome::query()->updateOrCreate(
            [
                'jbs_student_registration_id' => $jbs_student_registration->id,
                'jbs_module_id' => $module->id,
            ],
            [
                'score' => (int) round((float) $data['score']),
                'max_score' => (int) round((float) $data['max_score']),
                'source' => $existing->source ?? 'paper',
                'admin_confirmed_at' => now(),
                'admin_confirmed_by_user_id' => $request->user()->id,
            ],
        );

        $this->audit()->record(
            $existing ? 'score.admin_updated' : 'score.admin_created',
            $request,
            $jbs_student_registration,
            oldValues: $old,
            newValues: ['score' => $outcome->score, 'max_score' => $outcome->max_score, 'source' => $outcome->source],
            metadata: ['module_id' => $module->id, 'module_name' => $module->name],
        );

        return response()->json([
            'data' => ['progress' => $this->progress->summary($jbs_student_registration->fresh()->load(['session', 'level.modules']))],
        ]);
    }

    public function deleteScore(Request $request, JbsStudentRegistration $jbs_student_registration): JsonResponse
    {
        $data = $request->validate([
            'jbs_module_id' => ['required', 'integer', 'exists:jbs_modules,id'],
        ]);

        $module = JbsModule::query()->findOrFail($data['jbs_module_id']);

        $existing = JbsModuleScoreOutcome::query()
            ->where('jbs_student_registration_id', $jbs_student_registration->id)
            ->where('jbs_module_id', $module->id)
            ->first();

        if ($existing) {
            $this->audit()->record(
                'score.admin_cleared',
                $request,
                $jbs_student_registration,
                oldValues: ['score' => $existing->score, 'max_score' => $existing->max_score, 'source' => $existing->source],
                metadata: ['module_id' => $module->id, 'module_name' => $module->name],
            );
            $existing->delete();
        }

        return response()->json([
            'data' => ['progress' => $this->progress->summary($jbs_student_registration->fresh()->load(['session', 'level.modules']))],
        ]);
    }

    public function statement(Request $request, JbsStudentRegistration $jbs_student_registration): Response
    {
        $reg = $jbs_student_registration->load(['session', 'level.modules']);
        $this->progress->assertDocumentsAllowed($reg);

        $this->audit()->record('registration.document_downloaded', $request, $reg, metadata: ['document' => 'statement']);

        $reg->load(['scoreOutcomes' => fn ($q) => $q->with('module')]);

        $pdf = Pdf::loadView('pdf.statement', ['registration' => $reg])->setPaper('a4', 'portrait');

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="jbs-statement-'.$reg->registration_number.'.pdf"',
        ]);
    }

    public function certificate(Request $request, JbsStudentRegistration $jbs_student_registration): Response
    {
        $reg = $jbs_student_registration->load(['session', 'level']);
        $this->progress->assertDocumentsAllowed($reg);

        $this->audit()->record('registration.document_downloaded', $request, $reg, metadata: ['document' => 'certificate']);

        $pdf = Pdf::loadView('pdf.certificate', ['registration' => $reg])->setPaper('a4', 'landscape');

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="jbs-certificate-'.$reg->registration_number.'.pdf"',
        ]);
    }

    public function idCard(Request $request, JbsStudentRegistration $jbs_student_registration): Response
    {
        $reg = $jbs_student_registration->load(['session', 'level']);
        $this->audit()->record('registration.document_downloaded', $request, $reg, metadata: ['document' => 'id-card']);

        $qr = $this->qr->registrationNumberToDataUri($reg->registration_number);

        $pdf = $this->idCardPdf->make($reg, $qr);

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="jbs-id-card-'.$reg->registration_number.'.pdf"',
        ]);
    }
}
