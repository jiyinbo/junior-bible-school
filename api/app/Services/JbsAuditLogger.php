<?php

namespace App\Services;

use App\Models\JbsAuditLog;
use App\Models\JbsLevel;
use App\Models\JbsModule;
use App\Models\JbsSession;
use App\Models\JbsStudentRegistration;
use App\Models\JbsTest;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

class JbsAuditLogger
{
    /** @var list<string> */
    private const SENSITIVE_KEYS = [
        'password',
        'password_confirmation',
        'pin',
        'current_pin',
        'new_pin',
        'new_pin_confirmation',
        'portal_pin',
        'portal_pin_hash',
        'token',
        'remember_token',
    ];

    public function record(
        string $action,
        ?Request $request = null,
        ?Model $subject = null,
        ?string $subjectLabel = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        array $metadata = [],
        string $status = 'success',
        ?User $actor = null,
        ?string $actorName = null,
    ): JbsAuditLog {
        $actor ??= $request?->user();

        if ($subjectLabel === null && $subject !== null) {
            $subjectLabel = $this->defaultSubjectLabel($subject);
        }

        return JbsAuditLog::query()->create([
            'user_id' => $actor?->id,
            'actor_name' => $actorName ?? $actor?->name,
            'user_role' => $actor?->role,
            'action' => $action,
            'http_method' => $request?->method(),
            'route' => $request?->path(),
            'subject_type' => $subject ? $subject::class : null,
            'subject_id' => $subject?->getKey(),
            'subject_label' => $subjectLabel,
            'old_values' => $oldValues !== null ? $this->sanitize($oldValues) : null,
            'new_values' => $newValues !== null ? $this->sanitize($newValues) : null,
            'metadata' => $metadata !== [] ? $metadata : null,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent() ? substr((string) $request->userAgent(), 0, 500) : null,
            'status' => $status,
            'created_at' => now(),
        ]);
    }

    public function created(Request $request, string $action, Model $subject, array $metadata = []): JbsAuditLog
    {
        return $this->record(
            $action,
            $request,
            $subject,
            newValues: $this->snapshot($subject),
            metadata: $metadata,
        );
    }

    public function updated(
        Request $request,
        string $action,
        Model $subject,
        array $oldValues,
        array $newValues,
        array $metadata = [],
    ): JbsAuditLog {
        return $this->record(
            $action,
            $request,
            $subject,
            oldValues: $oldValues,
            newValues: $newValues,
            metadata: $metadata,
        );
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function snapshot(Model $model, array $only = []): array
    {
        $attributes = $only !== [] ? $model->only($only) : $model->getAttributes();

        return $this->sanitize($this->normalizeAttributes($attributes));
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function sanitize(array $data): array
    {
        $out = [];
        foreach ($data as $key => $value) {
            if (in_array($key, self::SENSITIVE_KEYS, true)) {
                $out[$key] = '[redacted]';

                continue;
            }
            if (is_array($value)) {
                $out[$key] = $this->sanitize($value);

                continue;
            }
            $out[$key] = $value;
        }

        return $out;
    }

    private function defaultSubjectLabel(Model $subject): ?string
    {
        return match (true) {
            $subject instanceof JbsStudentRegistration => $subject->registration_number.' · '.$subject->fullName(),
            $subject instanceof User => $subject->email,
            $subject instanceof JbsSession => $subject->name,
            $subject instanceof JbsLevel => $subject->name,
            $subject instanceof JbsModule => $subject->name,
            $subject instanceof JbsTest => 'Test #'.$subject->id,
            default => class_basename($subject).' #'.$subject->getKey(),
        };
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function normalizeAttributes(array $attributes): array
    {
        $normalized = [];
        foreach ($attributes as $key => $value) {
            if ($value instanceof \DateTimeInterface) {
                $normalized[$key] = $value->format('Y-m-d H:i:s');
            } elseif (is_bool($value)) {
                $normalized[$key] = $value;
            } else {
                $normalized[$key] = $value;
            }
        }

        return $normalized;
    }
}
