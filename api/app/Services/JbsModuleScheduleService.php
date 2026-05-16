<?php

namespace App\Services;

use App\Models\JbsModule;
use App\Models\JbsSession;
use App\Models\JbsStudentRegistration;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class JbsModuleScheduleService
{
    /**
     * @param  array{scheduled_date?: string|null, scheduled_start_time?: string|null, scheduled_end_time?: string|null}  $data
     */
    public function validateForSession(JbsSession $session, array $data): void
    {
        $date = $data['scheduled_date'] ?? null;
        $start = $data['scheduled_start_time'] ?? null;
        $end = $data['scheduled_end_time'] ?? null;

        if ($date === null && ($start !== null || $end !== null)) {
            throw ValidationException::withMessages([
                'scheduled_date' => ['Set a date when adding start or end time.'],
            ]);
        }

        if ($start !== null && $end !== null && $start >= $end) {
            throw ValidationException::withMessages([
                'scheduled_end_time' => ['End time must be after start time.'],
            ]);
        }

        if ($date === null) {
            return;
        }

        $day = Carbon::parse($date)->startOfDay();

        if ($session->session_starts_at) {
            $from = $session->session_starts_at->copy()->startOfDay();
            if ($day->lt($from)) {
                throw ValidationException::withMessages([
                    'scheduled_date' => ['Date must be on or after the session start date.'],
                ]);
            }
        }

        if ($session->session_ends_at) {
            $until = $session->session_ends_at->copy()->startOfDay();
            if ($day->gt($until)) {
                throw ValidationException::withMessages([
                    'scheduled_date' => ['Date must be on or before the session end date.'],
                ]);
            }
        }
    }

    public function formatTime(?string $time): ?string
    {
        if ($time === null || $time === '') {
            return null;
        }

        return substr($time, 0, 5);
    }

    /**
     * @return array<string, mixed>
     */
    public function moduleSchedulePayload(JbsModule $module): array
    {
        return [
            'scheduled_date' => $module->scheduled_date?->toDateString(),
            'scheduled_start_time' => $this->formatTime($module->scheduled_start_time),
            'scheduled_end_time' => $this->formatTime($module->scheduled_end_time),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function timetableForRegistration(JbsStudentRegistration $registration): array
    {
        $registration->loadMissing(['session', 'level.modules.assignment.teacher']);

        $modules = $registration->level->modules->sortBy(
            fn (JbsModule $m) => sprintf(
                '%s-%s-%04d',
                $m->scheduled_date?->format('Y-m-d') ?? '9999-12-31',
                $m->scheduled_start_time ?? '99:99:99',
                $m->sort_order,
            ),
        );

        return $modules->map(fn (JbsModule $module) => $this->timetableEntry($module))->values()->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function timetableEntry(JbsModule $module): array
    {
        $start = $this->formatTime($module->scheduled_start_time);
        $end = $this->formatTime($module->scheduled_end_time);

        return [
            'module_id' => $module->id,
            'module_name' => $module->name,
            'teacher_name' => $module->assignment?->teacher?->name,
            'scheduled_date' => $module->scheduled_date?->toDateString(),
            'scheduled_start_time' => $start,
            'scheduled_end_time' => $end,
            'time_label' => $this->timeLabel($start, $end),
            'slot_status' => $this->slotStatus($module),
        ];
    }

    public function timeLabel(?string $start, ?string $end): ?string
    {
        if ($start && $end) {
            return "{$start} – {$end}";
        }
        if ($start) {
            return "from {$start}";
        }
        if ($end) {
            return "until {$end}";
        }

        return null;
    }

    public function slotStatus(JbsModule $module): string
    {
        if (! $module->scheduled_date) {
            return 'unscheduled';
        }

        $today = now()->startOfDay();
        $day = $module->scheduled_date->copy()->startOfDay();

        if ($day->lt($today)) {
            return 'past';
        }
        if ($day->gt($today)) {
            return 'upcoming';
        }

        if ($module->scheduled_start_time && $module->scheduled_end_time) {
            $now = now()->format('H:i:s');
            $start = $module->scheduled_start_time;
            $end = $module->scheduled_end_time;
            if ($now < $start) {
                return 'upcoming';
            }
            if ($now > $end) {
                return 'past';
            }

            return 'ongoing';
        }

        return 'today';
    }

    public function programmePhase(JbsSession $session): string
    {
        if ($session->is_past) {
            return 'past';
        }

        $now = now();

        if ($session->session_starts_at && $now->lt($session->session_starts_at)) {
            return 'upcoming';
        }

        if ($session->session_ends_at && $now->gt($session->session_ends_at)) {
            return 'ended';
        }

        if ($session->session_starts_at || $session->session_ends_at) {
            return 'ongoing';
        }

        return 'ongoing';
    }
}
