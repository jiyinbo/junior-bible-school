<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\JbsLevel;
use App\Models\JbsSession;
use App\Services\JbsRegistrationService;
use App\Services\JbsRegistrationValidationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class RegistrationController extends Controller
{
    public function __construct(
        private JbsRegistrationService $registrationService,
        private JbsRegistrationValidationService $validationService,
    ) {}

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $normalized = $this->validationService->normalizeRegistrationPayload($request->all());
        $request->merge($normalized);

        $data = $request->validate([
            'jbs_session_id' => ['required', 'integer', 'exists:jbs_sessions,id'],
            'jbs_level_id' => ['required', 'integer', 'exists:jbs_levels,id'],
            'guardian_name' => ['required', 'string', 'max:255'],
            'guardian_relationship' => ['required', 'string', 'max:120'],
            'guardian_phone' => ['required', 'string', 'regex:/^0\d{10}$/'],
            'first_name' => ['required', 'string', 'max:120'],
            'last_name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'regex:/^0\d{10}$/'],
            'gender' => ['required', 'string', 'in:Male,Female'],
            'date_of_birth' => ['required', 'date', 'before:today'],
            'nationality' => ['required', 'string', 'max:120'],
            'address' => ['required', 'string', 'max:500'],
            'born_again' => ['required', 'boolean'],
            'date_of_new_birth' => ['nullable', 'date', 'before_or_equal:today'],
            'new_birth_location' => ['nullable', 'string', 'max:255'],
            'place_of_worship' => ['required', 'string', 'max:255'],
            'place_of_worship_address' => ['required', 'string', 'max:255'],
            'pastor_name' => ['required', 'string', 'max:255'],
            'activity_group' => ['required', 'string', 'max:120'],
            'current_school' => ['required', 'string', 'max:255'],
            'current_school_year' => ['required', 'string', 'max:80'],
            'allergies' => ['nullable', 'string', 'max:500'],
            'next_of_kin_name' => ['required', 'string', 'max:255'],
        ], $this->validationService->validationMessages());

        $session = JbsSession::query()->findOrFail($data['jbs_session_id']);
        $level = JbsLevel::query()->whereKey($data['jbs_level_id'])->where('jbs_session_id', $session->id)->firstOrFail();

        $guardian = [
            'guardian_name' => $data['guardian_name'],
            'guardian_relationship' => $data['guardian_relationship'],
            'guardian_phone' => $data['guardian_phone'],
        ];

        $child = $data;
        unset($child['jbs_session_id']);

        try {
            $registration = $this->registrationService->registerStudent($level, $guardian, $child, true);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $this->audit()->created($request, 'registration.admin_created', $registration, [
            'registered_after_close' => true,
        ]);

        return response()->json(['data' => ['registration_number' => $registration->registration_number]], 201);
    }
}
