<?php

namespace App\Services;

use App\Models\JbsLevel;
use App\Models\JbsSession;
use App\Models\JbsStudentRegistration;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class JbsRegistrationService
{
    public function __construct(
        private JbsRegistrationValidationService $validation,
        private JbsStudentPortalPinService $portalPin,
    ) {}

    public function normalizeEmail(string $email): string
    {
        return strtolower(trim($email));
    }

    private function optionalEmail(mixed $email): ?string
    {
        if (! is_string($email) || trim($email) === '') {
            return null;
        }

        return $this->normalizeEmail($email);
    }

    private function optionalPhone(mixed $phone): ?string
    {
        if (! is_string($phone) || trim($phone) === '') {
            return null;
        }

        $normalized = $this->validation->normalizeUkPhone($phone);

        return $normalized !== '' ? $normalized : null;
    }

    public function assertNotAlreadyRegisteredInSession(
        int $sessionId,
        ?string $email,
        ?int $exceptRegistrationId = null,
    ): void {
        if ($email === null || trim($email) === '') {
            return;
        }

        $normalized = $this->normalizeEmail($email);

        $query = JbsStudentRegistration::query()
            ->where('jbs_session_id', $sessionId)
            ->where('email', $normalized);

        if ($exceptRegistrationId !== null) {
            $query->whereKeyNot($exceptRegistrationId);
        }

        if ($query->exists()) {
            throw new RuntimeException(
                'This email address is already registered for this session. Each student may only register once per session.',
            );
        }
    }

    public function issueRegistrationNumber(JbsLevel $level): string
    {
        return DB::transaction(function () use ($level): string {
            /** @var JbsLevel $locked */
            $locked = JbsLevel::query()->whereKey($level->id)->lockForUpdate()->firstOrFail();
            $locked->next_sequence = $locked->next_sequence + 1;
            $locked->save();

            $suffix = str_pad((string) $locked->next_sequence, 4, '0', STR_PAD_LEFT);
            $prefix = $locked->registration_prefix;
            if ($prefix !== '' && ! str_ends_with($prefix, '/')) {
                $prefix .= '/';
            }

            return $prefix.$suffix;
        });
    }

    /**
     * @param  array<string, mixed>  $guardian
     * @param  array<int, array<string, mixed>>  $children
     * @return array<int, JbsStudentRegistration>
     */
    public function registerChildren(
        JbsSession $session,
        array $guardian,
        array $children,
        bool $afterClose = false,
    ): array {
        if (! $afterClose && ! $session->registrationIsOpen()) {
            throw new RuntimeException('Registration is not open for this session.');
        }

        $this->validation->validateGuardian($guardian);
        $this->validation->validateChildren($children);

        foreach ($children as $child) {
            $level = JbsLevel::query()
                ->whereKey($child['jbs_level_id'])
                ->where('jbs_session_id', $session->id)
                ->first();

            if ($level === null) {
                throw new RuntimeException('Selected level is not available for this session.');
            }

            $this->assertNotAlreadyRegisteredInSession($session->id, $child['email']);
        }

        return DB::transaction(function () use ($guardian, $children, $afterClose): array {
            $registrations = [];

            foreach ($children as $child) {
                $level = JbsLevel::query()->whereKey($child['jbs_level_id'])->firstOrFail();
                $registrations[] = $this->createRegistration($level, $guardian, $child, $afterClose);
            }

            return $registrations;
        });
    }

    /**
     * @param  array<string, mixed>  $guardian
     * @param  array<string, mixed>  $child
     */
    public function registerStudent(
        JbsLevel $level,
        array $guardian,
        array $child,
        bool $afterClose = false,
    ): JbsStudentRegistration {
        $session = $level->session;
        if (! $afterClose && ! $session->registrationIsOpen()) {
            throw new RuntimeException('Registration is not open for this session.');
        }

        $this->validation->validateGuardian($guardian);
        $this->validation->validateChildren([$child]);
        $this->assertNotAlreadyRegisteredInSession($session->id, $child['email']);

        return $this->createRegistration($level, $guardian, $child, $afterClose);
    }

    /**
     * @param  array<string, mixed>  $guardian
     * @param  array<string, mixed>  $data
     */
    private function createRegistration(
        JbsLevel $level,
        array $guardian,
        array $data,
        bool $afterClose,
    ): JbsStudentRegistration {
        $registrationNumber = $this->issueRegistrationNumber($level);

        $registration = JbsStudentRegistration::query()->create([
            'jbs_session_id' => $level->jbs_session_id,
            'jbs_level_id' => $level->id,
            'registration_number' => $registrationNumber,
            'first_name' => trim($data['first_name']),
            'last_name' => trim($data['last_name']),
            'email' => $this->optionalEmail($data['email'] ?? null),
            'phone' => $this->optionalPhone($data['phone'] ?? null),
            'guardian_name' => trim($guardian['guardian_name']),
            'guardian_relationship' => trim($guardian['guardian_relationship']),
            'guardian_phone' => $this->validation->normalizeUkPhone($guardian['guardian_phone']),
            'guardian_email' => $this->normalizeEmail($guardian['guardian_email']),
            'gender' => $data['gender'],
            'date_of_birth' => $data['date_of_birth'],
            'nationality' => trim($data['nationality']),
            'address' => trim($data['address']),
            'born_again' => (bool) $data['born_again'],
            'date_of_new_birth' => ! empty($data['date_of_new_birth']) ? $data['date_of_new_birth'] : null,
            'new_birth_location' => isset($data['new_birth_location']) ? trim((string) $data['new_birth_location']) : null,
            'place_of_worship' => trim($data['place_of_worship']),
            'place_of_worship_address' => trim($data['place_of_worship_address']),
            'pastor_name' => trim($data['pastor_name']),
            'activity_group' => isset($data['activity_group']) && trim((string) $data['activity_group']) !== ''
                ? trim((string) $data['activity_group'])
                : null,
            'current_school' => trim($data['current_school']),
            'current_school_year' => trim($data['current_school_year']),
            'allergies' => isset($data['allergies']) && $data['allergies'] !== ''
                ? trim((string) $data['allergies'])
                : null,
            'next_of_kin_name' => trim($data['next_of_kin_name']),
            'next_of_kin_phone' => $this->validation->normalizeUkPhone($data['next_of_kin_phone']),
            'next_of_kin_email' => $this->optionalEmail($data['next_of_kin_email'] ?? null),
            'registered_after_close' => $afterClose,
        ]);

        $this->portalPin->assignRandomPin($registration);

        return $registration;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateStudent(JbsStudentRegistration $registration, array $data): JbsStudentRegistration
    {
        if (array_key_exists('email', $data)) {
            $email = is_string($data['email']) && trim($data['email']) !== ''
                ? $this->normalizeEmail($data['email'])
                : null;
            $this->assertNotAlreadyRegisteredInSession(
                $registration->jbs_session_id,
                $email,
                $registration->id,
            );
            $data['email'] = $email;
        }

        if (isset($data['guardian_email'])) {
            $data['guardian_email'] = $this->normalizeEmail($data['guardian_email']);
        }

        $stringFields = [
            'first_name', 'last_name', 'phone', 'guardian_name', 'guardian_relationship',
            'guardian_phone', 'guardian_email', 'gender', 'nationality', 'address', 'new_birth_location',
            'place_of_worship', 'place_of_worship_address', 'pastor_name', 'activity_group',
            'current_school', 'current_school_year', 'next_of_kin_name', 'next_of_kin_phone', 'next_of_kin_email',
        ];

        foreach ($stringFields as $field) {
            if (isset($data[$field]) && is_string($data[$field])) {
                $data[$field] = trim($data[$field]);
            }
        }

        if (array_key_exists('phone', $data) && ($data['phone'] === null || $data['phone'] === '')) {
            $data['phone'] = null;
        }

        if (array_key_exists('allergies', $data)) {
            $data['allergies'] = $data['allergies'] !== null && $data['allergies'] !== ''
                ? trim((string) $data['allergies'])
                : null;
        }

        $registration->update($data);

        return $registration->fresh();
    }

    /**
     * Move a student to another tier within the same session, reissuing registration number and portal PIN.
     *
     * @return array{
     *     registration: JbsStudentRegistration,
     *     pin: string,
     *     old_registration_number: string,
     *     old_level_name: string,
     * }
     */
    public function changeTier(JbsStudentRegistration $registration, JbsLevel $newLevel): array
    {
        if ($registration->jbs_level_id === $newLevel->id) {
            throw new RuntimeException('Student is already assigned to this tier.');
        }

        if ($newLevel->jbs_session_id !== $registration->jbs_session_id) {
            throw new RuntimeException('Selected tier is not available for this student\'s session.');
        }

        $registration->loadMissing('level');
        $oldRegistrationNumber = $registration->registration_number;
        $oldLevelName = $registration->level->name;

        return DB::transaction(function () use ($registration, $newLevel, $oldRegistrationNumber, $oldLevelName): array {
            $newRegistrationNumber = $this->issueRegistrationNumber($newLevel);
            $pin = $this->portalPin->generatePin();

            $registration->update([
                'jbs_level_id' => $newLevel->id,
                'registration_number' => $newRegistrationNumber,
            ]);

            $this->portalPin->setPin($registration, $pin);

            return [
                'registration' => $registration->fresh(),
                'pin' => $pin,
                'old_registration_number' => $oldRegistrationNumber,
                'old_level_name' => $oldLevelName,
            ];
        });
    }
}
