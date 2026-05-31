<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Mail\RegistrationConfirmationMail;
use App\Models\JbsSession;
use App\Services\JbsAuditLogger;
use App\Services\JbsRegistrationService;
use App\Services\JbsRegistrationValidationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use RuntimeException;
use Throwable;

class PublicRegistrationController extends Controller
{
    public function __construct(
        private JbsRegistrationService $registrationService,
        private JbsRegistrationValidationService $validationService,
        private JbsAuditLogger $audit,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $normalized = $this->validationService->normalizeRegistrationPayload($request->all());
        $request->merge($normalized);

        $data = $request->validate([
            'session_slug' => ['required', 'string'],
            'guardian_name' => ['required', 'string', 'max:255'],
            'guardian_relationship' => ['required', 'string', 'max:120'],
            'guardian_phone' => ['required', 'string', 'regex:/^0\d{10}$/'],
            'children' => ['required', 'array', 'min:1'],
            'children.*.jbs_level_id' => ['required', 'integer', 'exists:jbs_levels,id'],
            'children.*.first_name' => ['required', 'string', 'max:120'],
            'children.*.last_name' => ['required', 'string', 'max:120'],
            'children.*.gender' => ['required', 'string', 'in:Male,Female'],
            'children.*.date_of_birth' => ['required', 'date', 'before:today'],
            'children.*.nationality' => ['required', 'string', 'max:120'],
            'children.*.address' => ['required', 'string', 'max:500'],
            'children.*.phone' => ['required', 'string', 'regex:/^0\d{10}$/'],
            'children.*.email' => ['required', 'email', 'max:255'],
            'children.*.born_again' => ['required', 'boolean'],
            'children.*.date_of_new_birth' => ['nullable', 'date', 'before_or_equal:today'],
            'children.*.new_birth_location' => ['nullable', 'string', 'max:255'],
            'children.*.place_of_worship' => ['required', 'string', 'max:255'],
            'children.*.place_of_worship_address' => ['required', 'string', 'max:255'],
            'children.*.pastor_name' => ['required', 'string', 'max:255'],
            'children.*.activity_group' => ['required', 'string', 'max:120'],
            'children.*.current_school' => ['required', 'string', 'max:255'],
            'children.*.current_school_year' => ['required', 'string', 'max:80'],
            'children.*.allergies' => ['nullable', 'string', 'max:500'],
            'children.*.next_of_kin_name' => ['required', 'string', 'max:255'],
        ], $this->validationService->validationMessages());

        $session = JbsSession::query()->where('slug', $data['session_slug'])->firstOrFail();

        $guardian = [
            'guardian_name' => $data['guardian_name'],
            'guardian_relationship' => $data['guardian_relationship'],
            'guardian_phone' => $data['guardian_phone'],
        ];

        try {
            $registrations = $this->registrationService->registerChildren(
                $session,
                $guardian,
                $data['children'],
                false,
            );
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        foreach ($registrations as $reg) {
            $reg->load(['level', 'session']);
        }

        $this->sendConfirmationEmails($registrations);

        $this->audit->record(
            'registration.public_created',
            $request,
            $session,
            subjectLabel: $session->name,
            metadata: [
                'children_count' => count($registrations),
                'registration_numbers' => collect($registrations)->pluck('registration_number')->all(),
            ],
            actorName: 'Public registration',
        );

        return response()->json([
            'data' => collect($registrations)->map(fn ($reg) => [
                'registration_number' => $reg->registration_number,
                'participant_name' => $reg->fullName(),
                'session_name' => $session->name,
                'level_name' => $reg->level->name,
            ])->values(),
        ], 201);
    }

    /**
     * Send a confirmation email per registered child. A delivery failure must
     * never fail the registration itself, so each send is isolated and logged.
     *
     * @param  array<int, \App\Models\JbsStudentRegistration>  $registrations
     */
    private function sendConfirmationEmails(array $registrations): void
    {
        foreach ($registrations as $reg) {
            if (empty($reg->email)) {
                continue;
            }

            try {
                Mail::to($reg->email)->send(new RegistrationConfirmationMail($reg));
            } catch (Throwable $e) {
                Log::error('Failed to send registration confirmation email', [
                    'registration_number' => $reg->registration_number,
                    'email' => $reg->email,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
}
