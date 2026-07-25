<?php

namespace App\Services;

use App\Mail\AdminBroadcastMail;
use Illuminate\Mail\Mailables\Attachment;
use App\Models\JbsLevel;
use App\Models\JbsSession;
use App\Models\JbsStudentRegistration;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class JbsAdminMailService
{
    public const AUDIENCE_PARENT_ONE = 'parent_one';

    public const AUDIENCE_STUDENT_ONE = 'student_one';

    public const AUDIENCE_PARENTS_TIER = 'parents_tier';

    public const AUDIENCE_PARENTS_SESSION = 'parents_session';

    public const AUDIENCE_STAFF_TEACHERS = 'staff_teachers';

    public const AUDIENCE_STAFF_ADMINS = 'staff_admins';

    public const AUDIENCE_STAFF_ASSISTANTS = 'staff_assistants';

    public const AUDIENCE_STAFF_ALL = 'staff_all';

    /** @return list<string> */
    public static function audienceKeys(): array
    {
        return [
            self::AUDIENCE_PARENT_ONE,
            self::AUDIENCE_STUDENT_ONE,
            self::AUDIENCE_PARENTS_TIER,
            self::AUDIENCE_PARENTS_SESSION,
            self::AUDIENCE_STAFF_TEACHERS,
            self::AUDIENCE_STAFF_ADMINS,
            self::AUDIENCE_STAFF_ASSISTANTS,
            self::AUDIENCE_STAFF_ALL,
        ];
    }

    /**
     * @param  array<string, mixed>  $params
     * @return list<array{email: string, name: string, label: string}>
     */
    public function resolveRecipients(string $audience, array $params): array
    {
        return match ($audience) {
            self::AUDIENCE_PARENT_ONE => $this->parentOne($params),
            self::AUDIENCE_STUDENT_ONE => $this->studentOne($params),
            self::AUDIENCE_PARENTS_TIER => $this->parentsForTier($params),
            self::AUDIENCE_PARENTS_SESSION => $this->parentsForSession($params),
            self::AUDIENCE_STAFF_TEACHERS => $this->staffByRole(['teacher']),
            self::AUDIENCE_STAFF_ADMINS => $this->staffByRole(['admin']),
            self::AUDIENCE_STAFF_ASSISTANTS => $this->staffByRole(['assistant']),
            self::AUDIENCE_STAFF_ALL => $this->staffByRole(['admin', 'teacher', 'assistant']),
            default => throw ValidationException::withMessages([
                'audience' => ['Unknown recipient group.'],
            ]),
        };
    }

    /**
     * @param  list<array{email: string, name: string, label: string}>  $recipients
     * @param  list<Attachment>  $attachments
     * @return array{sent: int, failed: int, failures: list<array{email: string, error: string}>}
     */
    public function send(string $subject, string $body, array $recipients, array $attachments = []): array
    {
        $bodyHtml = nl2br(e($body), false);
        $sent = 0;
        $failed = 0;
        $failures = [];

        foreach ($recipients as $recipient) {
            try {
                Mail::to($recipient['email'])->send(
                    new AdminBroadcastMail($subject, $bodyHtml, $recipient['name'], $attachments),
                );
                $sent++;
            } catch (\Throwable $e) {
                $failed++;
                $failures[] = [
                    'email' => $recipient['email'],
                    'error' => $e->getMessage(),
                ];
            }
        }

        return [
            'sent' => $sent,
            'failed' => $failed,
            'failures' => $failures,
        ];
    }

    /**
     * @param  array<string, mixed>  $params
     * @return list<array{email: string, name: string, label: string}>
     */
    private function parentOne(array $params): array
    {
        $ids = $this->registrationIdsFromParams($params);
        if ($ids === []) {
            throw ValidationException::withMessages([
                'registration_ids' => ['Select at least one student.'],
            ]);
        }

        $regs = JbsStudentRegistration::query()
            ->with(['session', 'level'])
            ->whereIn('id', $ids)
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        if ($regs->count() !== count($ids)) {
            throw ValidationException::withMessages([
                'registration_ids' => ['One or more selected students were not found.'],
            ]);
        }

        $missingEmail = $regs->first(fn (JbsStudentRegistration $reg): bool => $this->normalizeEmail($reg->guardian_email) === null);
        if ($missingEmail !== null) {
            throw ValidationException::withMessages([
                'registration_ids' => [
                    "{$missingEmail->fullName()} ({$missingEmail->registration_number}) has no parent / guardian email on file.",
                ],
            ]);
        }

        return $this->collectParentEmails(
            JbsStudentRegistration::query()->whereIn('id', $ids),
        );
    }

    /**
     * @param  array<string, mixed>  $params
     * @return list<array{email: string, name: string, label: string}>
     */
    private function studentOne(array $params): array
    {
        $ids = $this->registrationIdsFromParams($params);
        if ($ids === []) {
            throw ValidationException::withMessages([
                'registration_ids' => ['Select at least one student.'],
            ]);
        }

        $regs = JbsStudentRegistration::query()
            ->with(['session', 'level'])
            ->whereIn('id', $ids)
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        if ($regs->count() !== count($ids)) {
            throw ValidationException::withMessages([
                'registration_ids' => ['One or more selected students were not found.'],
            ]);
        }

        $missingEmail = $regs->first(fn (JbsStudentRegistration $reg): bool => $this->normalizeEmail($reg->email) === null);
        if ($missingEmail !== null) {
            throw ValidationException::withMessages([
                'registration_ids' => [
                    "{$missingEmail->fullName()} ({$missingEmail->registration_number}) has no student email on file.",
                ],
            ]);
        }

        return $this->collectStudentEmails(
            JbsStudentRegistration::query()->whereIn('id', $ids),
        );
    }

    /**
     * @param  array<string, mixed>  $params
     * @return list<int>
     */
    private function registrationIdsFromParams(array $params): array
    {
        $ids = [];

        if (isset($params['registration_ids']) && is_array($params['registration_ids'])) {
            foreach ($params['registration_ids'] as $id) {
                $ids[] = (int) $id;
            }
        }

        if (isset($params['registration_id']) && $params['registration_id'] !== null && $params['registration_id'] !== '') {
            $ids[] = (int) $params['registration_id'];
        }

        $ids = array_values(array_unique(array_filter($ids, fn (int $id): bool => $id > 0)));

        return $ids;
    }

    /**
     * @param  array<string, mixed>  $params
     * @return list<array{email: string, name: string, label: string}>
     */
    private function parentsForTier(array $params): array
    {
        $sessionId = (int) ($params['jbs_session_id'] ?? 0);
        $levelId = (int) ($params['jbs_level_id'] ?? 0);

        if ($sessionId < 1) {
            throw ValidationException::withMessages([
                'jbs_session_id' => ['Session is required.'],
            ]);
        }
        if ($levelId < 1) {
            throw ValidationException::withMessages([
                'jbs_level_id' => ['Tier is required.'],
            ]);
        }

        $level = JbsLevel::query()->find($levelId);
        if ($level === null || $level->jbs_session_id !== $sessionId) {
            throw ValidationException::withMessages([
                'jbs_level_id' => ['Tier does not belong to the selected session.'],
            ]);
        }

        return $this->collectParentEmails(
            JbsStudentRegistration::query()
                ->where('jbs_session_id', $sessionId)
                ->where('jbs_level_id', $levelId),
        );
    }

    /**
     * @param  array<string, mixed>  $params
     * @return list<array{email: string, name: string, label: string}>
     */
    private function parentsForSession(array $params): array
    {
        $sessionId = (int) ($params['jbs_session_id'] ?? 0);
        if ($sessionId < 1) {
            throw ValidationException::withMessages([
                'jbs_session_id' => ['Session is required.'],
            ]);
        }

        if (! JbsSession::query()->whereKey($sessionId)->exists()) {
            throw ValidationException::withMessages([
                'jbs_session_id' => ['Session not found.'],
            ]);
        }

        return $this->collectParentEmails(
            JbsStudentRegistration::query()->where('jbs_session_id', $sessionId),
        );
    }

    /**
     * @param  Builder<JbsStudentRegistration>  $query
     * @return list<array{email: string, name: string, label: string}>
     */
    private function collectParentEmails(Builder $query): array
    {
        $rows = $query
            ->orderBy('guardian_email')
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get(['guardian_email', 'guardian_name', 'first_name', 'last_name', 'registration_number']);

        /** @var array<string, array{email: string, name: string, students: list<string>}> $byEmail */
        $byEmail = [];

        foreach ($rows as $reg) {
            $email = $this->normalizeEmail($reg->guardian_email);
            if ($email === null) {
                continue;
            }

            if (! isset($byEmail[$email])) {
                $byEmail[$email] = [
                    'email' => $email,
                    'name' => trim((string) $reg->guardian_name) ?: 'Parent / guardian',
                    'students' => [],
                ];
            }

            $byEmail[$email]['students'][] = trim("{$reg->first_name} {$reg->last_name}")
                ." ({$reg->registration_number})";
        }

        $recipients = [];
        foreach ($byEmail as $group) {
            $students = array_values(array_unique($group['students']));
            $recipients[] = [
                'email' => $group['email'],
                'name' => $group['name'],
                'label' => $group['name'].' — '.implode(', ', $students),
            ];
        }

        usort($recipients, fn (array $a, array $b): int => strcasecmp($a['email'], $b['email']));

        return $recipients;
    }

    /**
     * @param  Builder<JbsStudentRegistration>  $query
     * @return list<array{email: string, name: string, label: string}>
     */
    private function collectStudentEmails(Builder $query): array
    {
        $rows = $query
            ->orderBy('email')
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get(['email', 'first_name', 'last_name', 'registration_number']);

        /** @var array<string, array{email: string, name: string, students: list<string>}> $byEmail */
        $byEmail = [];

        foreach ($rows as $reg) {
            $email = $this->normalizeEmail($reg->email);
            if ($email === null) {
                continue;
            }

            $name = trim("{$reg->first_name} {$reg->last_name}") ?: 'Student';
            $detail = "{$name} ({$reg->registration_number})";

            if (! isset($byEmail[$email])) {
                $byEmail[$email] = [
                    'email' => $email,
                    'name' => $name,
                    'students' => [],
                ];
            }

            $byEmail[$email]['students'][] = $detail;
        }

        $recipients = [];
        foreach ($byEmail as $group) {
            $students = array_values(array_unique($group['students']));
            $recipients[] = [
                'email' => $group['email'],
                'name' => $group['name'],
                'label' => implode(', ', $students),
            ];
        }

        usort($recipients, fn (array $a, array $b): int => strcasecmp($a['email'], $b['email']));

        return $recipients;
    }

    /**
     * @param  list<string>  $roles
     * @return list<array{email: string, name: string, label: string}>
     */
    private function staffByRole(array $roles): array
    {
        $users = User::query()
            ->whereIn('role', $roles)
            ->orderBy('name')
            ->get(['name', 'email', 'role']);

        $recipients = [];
        foreach ($users as $user) {
            $email = $this->normalizeEmail($user->email);
            if ($email === null) {
                continue;
            }

            $recipients[] = [
                'email' => $email,
                'name' => $user->name,
                'label' => "{$user->name} ({$user->role})",
            ];
        }

        return $recipients;
    }

    private function normalizeEmail(mixed $email): ?string
    {
        if (! is_string($email)) {
            return null;
        }

        $normalized = strtolower(trim($email));
        if ($normalized === '' || ! filter_var($normalized, FILTER_VALIDATE_EMAIL)) {
            return null;
        }

        return $normalized;
    }
}
