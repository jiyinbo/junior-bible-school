<?php

namespace App\Services;

use App\Models\JbsAttendanceLog;
use App\Models\JbsModuleAssignment;
use App\Models\JbsSession;
use App\Models\JbsStudentRegistration;
use App\Models\JbsTest;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class JbsDashboardStatsService
{
    public function resolveSession(?int $sessionId): ?JbsSession
    {
        if ($sessionId) {
            return JbsSession::query()->find($sessionId);
        }

        return JbsSession::query()
            ->where('is_past', false)
            ->orderByDesc('id')
            ->first()
            ?? JbsSession::query()->orderByDesc('id')->first();
    }

    /**
     * @return array<string, mixed>
     */
    public function adminStats(?int $sessionId): array
    {
        $session = $this->resolveSession($sessionId);

        if (! $session) {
            return $this->emptyPayload(null);
        }

        $session->load(['levels.modules']);

        $levels = $session->levels;
        $registrationsByLevel = $levels->map(fn ($level) => [
            'level_id' => $level->id,
            'level_name' => $level->name,
            'count' => $level->registrations()->count(),
        ])->values()->all();

        $modulesByLevel = $levels->map(fn ($level) => [
            'level_id' => $level->id,
            'level_name' => $level->name,
            'module_count' => $level->modules()->count(),
        ])->values()->all();

        $staffCounts = User::query()
            ->whereIn('role', ['admin', 'teacher'])
            ->selectRaw('role, COUNT(*) as count')
            ->groupBy('role')
            ->pluck('count', 'role');

        return $this->buildPayload(
            $session,
            [
                'attendance_today' => $this->attendanceTodayCount($session->id),
                'registrations_total' => $session->registrations()->count(),
                'levels_count' => $levels->count(),
                'modules_count' => (int) $levels->sum(fn ($l) => $l->modules->count()),
                'staff_admins' => (int) ($staffCounts['admin'] ?? 0),
                'staff_teachers' => (int) ($staffCounts['teacher'] ?? 0),
                'level_completed_count' => $this->levelCompletedCount($session->id, true),
                'level_not_completed_count' => $this->levelCompletedCount($session->id, false),
                'open_tests' => $this->openTestsCount($session->id),
                'my_modules' => (int) $levels->sum(fn ($l) => $l->modules->count()),
            ],
            $registrationsByLevel,
            $modulesByLevel,
            $this->attendanceLast7Days($session->id),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function teacherStats(int $userId, ?int $sessionId = null): array
    {
        $assignments = JbsModuleAssignment::query()
            ->where('user_id', $userId)
            ->with(['module.level.session'])
            ->get();

        if ($assignments->isEmpty()) {
            return $this->emptyPayload(null, [
                'my_modules' => 0,
                'assigned_students' => 0,
                'attendance_today' => 0,
                'level_completed_count' => 0,
                'level_not_completed_count' => 0,
                'open_tests' => 0,
            ]);
        }

        $session = $sessionId
            ? JbsSession::query()->find($sessionId)
            : $assignments->first()->module->level->session;

        if (! $session) {
            return $this->emptyPayload(null);
        }

        $moduleIds = $assignments
            ->filter(fn (JbsModuleAssignment $a) => $a->module->level->jbs_session_id === $session->id)
            ->pluck('jbs_module_id')
            ->unique()
            ->values();

        $levelIds = $assignments
            ->filter(fn (JbsModuleAssignment $a) => $a->module->level->jbs_session_id === $session->id)
            ->pluck('module.jbs_level_id')
            ->unique()
            ->values();

        $assignedStudents = $session->registrations()
            ->whereIn('jbs_level_id', $levelIds)
            ->count();

        return $this->buildPayload(
            $session,
            [
                'attendance_today' => $this->attendanceTodayCount($session->id, $levelIds->all()),
                'registrations_total' => $assignedStudents,
                'levels_count' => $levelIds->count(),
                'modules_count' => $moduleIds->count(),
                'staff_admins' => 0,
                'staff_teachers' => 0,
                'level_completed_count' => 0,
                'level_not_completed_count' => 0,
                'open_tests' => $this->openTestsCount($session->id, $moduleIds->all()),
                'my_modules' => $moduleIds->count(),
                'assigned_students' => $assignedStudents,
            ],
            $this->registrationsByLevelForLevels($session, $levelIds),
            $this->modulesByLevelForAssignments($assignments, $session->id),
            $this->attendanceLast7Days($session->id, $levelIds->all()),
        );
    }

    /**
     * @param  list<int>|null  $levelIds
     */
    private function attendanceTodayCount(int $sessionId, ?array $levelIds = null): int
    {
        $query = JbsAttendanceLog::query()
            ->whereDate('attended_on', today())
            ->whereHas('registration', function ($q) use ($sessionId, $levelIds): void {
                $q->where('jbs_session_id', $sessionId);
                if ($levelIds !== null) {
                    $q->whereIn('jbs_level_id', $levelIds);
                }
            });

        return $query->count();
    }

    private function levelCompletedCount(int $sessionId, bool $completed): int
    {
        return JbsStudentRegistration::query()
            ->where('jbs_session_id', $sessionId)
            ->where('level_completed', $completed)
            ->count();
    }

    /**
     * @param  list<int>|null  $moduleIds
     */
    private function openTestsCount(int $sessionId, ?array $moduleIds = null): int
    {
        $query = JbsTest::query()
            ->where('status', 'open')
            ->whereHas('module.level', fn ($q) => $q->where('jbs_session_id', $sessionId));

        if ($moduleIds !== null) {
            $query->whereIn('jbs_module_id', $moduleIds);
        }

        return $query->count();
    }

    /**
     * @param  list<int>|null  $levelIds
     * @return list<array{date: string, count: int}>
     */
    private function attendanceLast7Days(int $sessionId, ?array $levelIds = null): array
    {
        $start = Carbon::today()->subDays(6);

        $rows = JbsAttendanceLog::query()
            ->where('attended_on', '>=', $start)
            ->whereHas('registration', function ($q) use ($sessionId, $levelIds): void {
                $q->where('jbs_session_id', $sessionId);
                if ($levelIds !== null) {
                    $q->whereIn('jbs_level_id', $levelIds);
                }
            })
            ->selectRaw('attended_on, COUNT(*) as count')
            ->groupBy('attended_on')
            ->orderBy('attended_on')
            ->get()
            ->keyBy(fn ($row) => Carbon::parse($row->attended_on)->toDateString());

        $days = [];
        for ($i = 0; $i < 7; $i++) {
            $date = $start->copy()->addDays($i)->toDateString();
            $days[] = [
                'date' => $date,
                'count' => (int) ($rows[$date]->count ?? 0),
            ];
        }

        return $days;
    }

    /**
     * @param  Collection<int, int>  $levelIds
     * @return list<array{level_id: int, level_name: string, count: int}>
     */
    private function registrationsByLevelForLevels(JbsSession $session, Collection $levelIds): array
    {
        return $session->levels()
            ->whereIn('id', $levelIds)
            ->withCount('registrations')
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($level) => [
                'level_id' => $level->id,
                'level_name' => $level->name,
                'count' => $level->registrations_count,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array{level_id: int, level_name: string, module_count: int}>
     */
    private function modulesByLevelForAssignments(Collection $assignments, int $sessionId): array
    {
        return $assignments
            ->filter(fn (JbsModuleAssignment $a) => $a->module->level->jbs_session_id === $sessionId)
            ->groupBy(fn (JbsModuleAssignment $a) => $a->module->level_id)
            ->map(function (Collection $group) {
                $level = $group->first()->module->level;

                return [
                    'level_id' => $level->id,
                    'level_name' => $level->name,
                    'module_count' => $group->count(),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @param  array<string, int|float>  $metrics
     * @param  list<array{level_id: int, level_name: string, count: int}>  $registrationsByLevel
     * @param  list<array{level_id: int, level_name: string, module_count: int}>  $modulesByLevel
     * @param  list<array{date: string, count: int}>  $attendanceLast7Days
     * @return array<string, mixed>
     */
    private function buildPayload(
        JbsSession $session,
        array $metrics,
        array $registrationsByLevel,
        array $modulesByLevel,
        array $attendanceLast7Days,
    ): array {
        return [
            'session' => [
                'id' => $session->id,
                'name' => $session->name,
                'slug' => $session->slug,
                'is_past' => $session->is_past,
                'registration_is_open' => $session->registrationIsOpen(),
            ],
            'metrics' => $metrics,
            'registrations_by_level' => $registrationsByLevel,
            'modules_by_level' => $modulesByLevel,
            'attendance_last_7_days' => $attendanceLast7Days,
        ];
    }

    /**
     * @param  array<string, int|float>|null  $metrics
     * @return array<string, mixed>
     */
    private function emptyPayload(?JbsSession $session, ?array $metrics = null): array
    {
        return [
            'session' => $session ? [
                'id' => $session->id,
                'name' => $session->name,
                'slug' => $session->slug,
                'is_past' => $session->is_past,
                'registration_is_open' => $session->registrationIsOpen(),
            ] : null,
            'metrics' => $metrics ?? [
                'attendance_today' => 0,
                'registrations_total' => 0,
                'levels_count' => 0,
                'modules_count' => 0,
                'staff_admins' => 0,
                'staff_teachers' => 0,
                'level_completed_count' => 0,
                'level_not_completed_count' => 0,
                'open_tests' => 0,
                'my_modules' => 0,
            ],
            'registrations_by_level' => [],
            'modules_by_level' => [],
            'attendance_last_7_days' => [],
        ];
    }
}
