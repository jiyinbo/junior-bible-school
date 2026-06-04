<?php

namespace App\Services;

use App\Models\JbsLevel;
use Carbon\Carbon;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class JbsRegistrationValidationService
{
    public const UK_PHONE_PATTERN = '/^0\d{10}$/';

    public const PLACEMENT_BASIC_10_12 = 'basic_10_12';

    public const PLACEMENT_BASIC_TEENS = 'basic_teens';

    public const PLACEMENT_ADVANCED = 'advanced';

    public const PLACEMENT_TEENS_MASTERCLASS = 'teens_masterclass';

    public const MIN_AGE = 10;

    /**
     * @return array<string, mixed>
     */
    public function guardianRules(): array
    {
        return [
            'guardian_name' => ['required', 'string', 'max:255'],
            'guardian_relationship' => ['required', 'string', 'max:120'],
            'guardian_phone' => ['required', 'string', 'regex:'.self::UK_PHONE_PATTERN],
            'guardian_email' => ['required', 'email', 'max:255'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function childRules(): array
    {
        return [
            'jbs_level_id' => ['required', 'integer', 'exists:jbs_levels,id'],
            'first_name' => ['required', 'string', 'max:120'],
            'last_name' => ['required', 'string', 'max:120'],
            'gender' => ['required', 'string', 'in:Male,Female'],
            'date_of_birth' => ['required', 'date', 'before:today'],
            'nationality' => ['required', 'string', 'max:120'],
            'address' => ['required', 'string', 'max:500'],
            'phone' => ['nullable', 'string', 'regex:'.self::UK_PHONE_PATTERN],
            'email' => ['nullable', 'email', 'max:255'],
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
            'next_of_kin_phone' => ['required', 'string', 'regex:'.self::UK_PHONE_PATTERN],
            'next_of_kin_email' => ['nullable', 'email', 'max:255'],
        ];
    }

    /**
     * @param  array<string, mixed>  $guardian
     */
    public function validateGuardian(array $guardian): void
    {
        if (isset($guardian['guardian_phone']) && is_string($guardian['guardian_phone'])) {
            $guardian['guardian_phone'] = $this->normalizeUkPhone($guardian['guardian_phone']);
        }
        if (isset($guardian['guardian_email']) && is_string($guardian['guardian_email'])) {
            $guardian['guardian_email'] = strtolower(trim($guardian['guardian_email']));
        }

        Validator::make($guardian, $this->guardianRules(), $this->validationMessages())->validate();
    }

    /**
     * @param  array<int, array<string, mixed>>  $children
     */
    public function validateChildren(array $children): void
    {
        if (count($children) < 1) {
            throw ValidationException::withMessages([
                'children' => ['Please add at least one child.'],
            ]);
        }

        foreach ($children as $index => $child) {
            $child = $this->normalizeOptionalChildContacts($child);

            $validator = Validator::make($child, $this->childRules(), $this->validationMessages());
            $validator->validate();

            $this->assertChildPlacementRules($child, "children.{$index}");
        }
    }

    /**
     * @param  array<string, mixed>  $child
     */
    public function assertChildPlacementRules(array $child, string $errorPrefix = 'child'): void
    {
        $dob = Carbon::parse($child['date_of_birth']);
        $age = $dob->age;

        if ($age < self::MIN_AGE) {
            throw ValidationException::withMessages([
                "{$errorPrefix}.date_of_birth" => [
                    'Children attending Junior Bible School must be at least '.self::MIN_AGE.' years old.',
                ],
            ]);
        }

        $level = JbsLevel::query()->findOrFail($child['jbs_level_id']);
        $group = $level->placement_group;

        if ($group === null) {
            return;
        }

        if ($age < 13 && $group !== self::PLACEMENT_BASIC_10_12) {
            throw ValidationException::withMessages([
                "{$errorPrefix}.jbs_level_id" => [
                    'Children under 13 can only register for the Basic (10–12) class.',
                ],
            ]);
        }
    }

    public function ageFromDateOfBirth(string $dateOfBirth): int
    {
        return Carbon::parse($dateOfBirth)->age;
    }

    public function normalizeUkPhone(string $phone): string
    {
        $s = preg_replace('/[\s\-\(\)\.]/', '', trim($phone)) ?? '';
        if (str_starts_with($s, '+44')) {
            $s = '0'.substr($s, 3);
        } elseif (str_starts_with($s, '0044')) {
            $s = '0'.substr($s, 4);
        }

        return preg_replace('/\D/', '', $s) ?? '';
    }

    /**
     * @param  array<string, mixed>  $child
     * @return array<string, mixed>
     */
    public function normalizeOptionalChildContacts(array $child): array
    {
        if (isset($child['phone']) && is_string($child['phone'])) {
            $phone = $this->normalizeUkPhone($child['phone']);
            $child['phone'] = $phone !== '' ? $phone : null;
        }

        if (isset($child['email']) && is_string($child['email'])) {
            $email = strtolower(trim($child['email']));
            $child['email'] = $email !== '' ? $email : null;
        }

        if (isset($child['next_of_kin_phone']) && is_string($child['next_of_kin_phone'])) {
            $child['next_of_kin_phone'] = $this->normalizeUkPhone($child['next_of_kin_phone']);
        }

        if (isset($child['next_of_kin_email']) && is_string($child['next_of_kin_email'])) {
            $email = strtolower(trim($child['next_of_kin_email']));
            $child['next_of_kin_email'] = $email !== '' ? $email : null;
        }

        return $child;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function normalizeRegistrationPayload(array $payload): array
    {
        if (isset($payload['guardian_phone']) && is_string($payload['guardian_phone'])) {
            $payload['guardian_phone'] = $this->normalizeUkPhone($payload['guardian_phone']);
        }

        if (isset($payload['guardian_email']) && is_string($payload['guardian_email'])) {
            $payload['guardian_email'] = strtolower(trim($payload['guardian_email']));
        }

        if (isset($payload['phone']) && is_string($payload['phone'])) {
            $payload['phone'] = $this->normalizeUkPhone($payload['phone']);
        }

        if (isset($payload['email']) && is_string($payload['email'])) {
            $payload['email'] = strtolower(trim($payload['email']));
        }

        if (isset($payload['children']) && is_array($payload['children'])) {
            foreach ($payload['children'] as $index => $child) {
                if (! is_array($child)) {
                    continue;
                }
                $payload['children'][$index] = $this->normalizeOptionalChildContacts($child);
            }
        }

        return $payload;
    }

    /**
     * @return array<string, string>
     */
    public function validationMessages(): array
    {
        return [
            'guardian_name.required' => 'The parent / guardian full name is required.',
            'next_of_kin_name.required' => 'The next of kin full name is required.',
            'children.*.next_of_kin_name.required' => 'The next of kin full name is required for each student.',
            'next_of_kin_phone.regex' => 'The next of kin phone must be a valid UK number (11 digits starting with 0).',
            'children.*.next_of_kin_phone.regex' => 'The next of kin phone must be a valid UK number (11 digits starting with 0).',
            'next_of_kin_email.email' => 'Enter a valid next of kin email address.',
            'children.*.next_of_kin_email.email' => 'Enter a valid next of kin email address for each student.',
            'guardian_phone.regex' => 'The parent or guardian phone must be a valid UK number (11 digits starting with 0).',
            'guardian_email.email' => 'Enter a valid parent or guardian email address.',
            'phone.regex' => 'The phone number must be a valid UK number (11 digits starting with 0).',
            'children.*.phone.regex' => 'Each child phone must be a valid UK number (11 digits starting with 0).',
            'email.email' => 'Enter a valid email address.',
            'children.*.email.email' => 'Enter a valid email address for each child.',
        ];
    }
}
