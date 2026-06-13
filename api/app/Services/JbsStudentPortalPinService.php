<?php

namespace App\Services;

use App\Mail\PortalPinMail;
use App\Models\JbsStudentRegistration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class JbsStudentPortalPinService
{
    /** Plaintext PIN from the most recent assign/set operation (not persisted). */
    public ?string $lastPlainPin = null;

    public function generatePin(): string
    {
        return str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);
    }

    public function setPin(JbsStudentRegistration $registration, string $pin): void
    {
        $registration->portal_pin_hash = Hash::make($pin);
        $registration->save();
        $registration->portalPinPlain = $pin;
        $this->lastPlainPin = $pin;
    }

    public function assignRandomPin(JbsStudentRegistration $registration): string
    {
        $pin = $this->generatePin();
        $this->setPin($registration, $pin);

        return $pin;
    }

    public function verifyPin(JbsStudentRegistration $registration, string $pin): bool
    {
        if ($registration->portal_pin_hash === null) {
            return false;
        }

        return Hash::check($pin, $registration->portal_pin_hash);
    }

    /**
     * @param  list<string>  $with
     */
    public function resolveRegistration(Request $request, array $with = []): JbsStudentRegistration
    {
        $data = $request->validate([
            'registration_number' => ['required', 'string', 'max:191'],
            'pin' => ['required', 'string', 'digits:4'],
        ]);

        $reg = JbsStudentRegistration::query()
            ->where('registration_number', trim($data['registration_number']))
            ->when($with !== [], fn ($query) => $query->with($with))
            ->first();

        if (! $reg || ! $this->verifyPin($reg, $data['pin'])) {
            abort(401, 'Invalid registration number or PIN.');
        }

        return $reg;
    }

    public function emailPin(JbsStudentRegistration $registration, string $pin): void
    {
        $registration->loadMissing(['level', 'session']);

        $recipients = array_values(array_unique(array_filter([
            $registration->email,
            $registration->guardian_email,
        ])));

        foreach ($recipients as $email) {
            try {
                Mail::to($email)->send(new PortalPinMail($registration, $pin));
            } catch (Throwable $e) {
                Log::error('Failed to send portal PIN email', [
                    'registration_number' => $registration->registration_number,
                    'email' => $email,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
}
