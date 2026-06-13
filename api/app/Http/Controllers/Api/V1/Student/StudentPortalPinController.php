<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\JbsStudentRegistration;
use App\Services\JbsStudentPortalPinService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentPortalPinController extends Controller
{
    public function __construct(
        private JbsStudentPortalPinService $portalPin,
    ) {}

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'registration_number' => ['required', 'string', 'max:191'],
            'current_pin' => ['required', 'string', 'digits:4'],
            'new_pin' => ['required', 'string', 'digits:4', 'different:current_pin'],
            'new_pin_confirmation' => ['required', 'same:new_pin'],
        ]);

        $reg = JbsStudentRegistration::query()
            ->where('registration_number', trim($data['registration_number']))
            ->first();

        if (! $reg || ! $this->portalPin->verifyPin($reg, $data['current_pin'])) {
            return response()->json(['message' => 'Invalid registration number or PIN.'], 401);
        }

        $this->portalPin->setPin($reg, $data['new_pin']);

        return response()->json(['message' => 'PIN updated successfully.']);
    }
}
