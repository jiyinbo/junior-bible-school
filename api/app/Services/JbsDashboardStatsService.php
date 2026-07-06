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
    public function __construct(
        private JbsGradingService $grading,
    ) {}

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
            ->whereIn('role', ['admin', 'teacher', 'assistant'])
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
                'staff_assistants' => (int) ($staffCounts['assistant'] ?? 0),
                'level_completed_count' => $this->levelCompletedCount($session->id, true),
                'level_not_completed_count' => $this->levelCompletedCount($session->id, false),
                'open_tests' => $this->openTestsCount($session->id),
                'my_modules' => (int) $levels->sum(fn ($l) => $l->modules->count()),
            ],
            $registrationsByLevel,
            $modulesByLevel,
            $this->attendanceLast7DaysByLevel($session->id, $levels),
            $this->genderByLevel($session->id, $levels),
            $this->genderByLevel($session->id, $levels, completedOnly: true),
            $this->genderTotals($session->id, completedOnly: true),
            $this->nationalityStats($session->id),
            $this->churchStats($session->id),
            $this->gradesByLevel($session->id, $levels),
            $this->allergiesByLevel($session->id, $levels),
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

        $sessionLevels = $session->levels()->orderBy('sort_order')->get();

        return $this->buildPayload(
            $session,
            [
                'attendance_today' => $this->attendanceTodayCount($session->id, $levelIds->all()),
                'registrations_total' => $assignedStudents,
                'levels_count' => $levelIds->count(),
                'modules_count' => $moduleIds->count(),
                'staff_admins' => 0,
                'staff_teachers' => 0,
                'staff_assistants' => 0,
                'level_completed_count' => $this->levelCompletedCount($session->id, true, $levelIds->all()),
                'level_not_completed_count' => $this->levelCompletedCount($session->id, false, $levelIds->all()),
                'open_tests' => $this->openTestsCount($session->id, $moduleIds->all()),
                'my_modules' => $moduleIds->count(),
                'assigned_students' => $assignedStudents,
            ],
            $this->registrationsByLevelForLevels($session, $levelIds),
            $this->modulesByLevelForAssignments($assignments, $session->id),
            $this->attendanceLast7DaysByLevel($session->id, $sessionLevels, $levelIds->all()),
            $this->genderByLevel($session->id, $sessionLevels, $levelIds->all()),
            $this->genderByLevel($session->id, $sessionLevels, $levelIds->all(), completedOnly: true),
            $this->genderTotals($session->id, $levelIds->all(), completedOnly: true),
            $this->nationalityStats($session->id, $levelIds->all()),
            $this->churchStats($session->id, $levelIds->all()),
            $this->gradesByLevel($session->id, $sessionLevels, $levelIds->all()),
            $this->allergiesByLevel($session->id, $sessionLevels, $levelIds->all()),
        );
    }

    /**
     * @param  Collection<int, \App\Models\JbsLevel>|null  $levels
     * @param  list<int>|null  $levelIds
     * @return list<array{level_id: int, level_name: string, boys: int, girls: int, other: int, total: int}>
     */
    private function genderByLevel(
        int $sessionId,
        ?Collection $levels = null,
        ?array $levelIds = null,
        bool $completedOnly = false,
    ): array {
        $levels ??= JbsSession::query()->find($sessionId)?->levels()->orderBy('sort_order')->get() ?? collect();

        if ($levelIds !== null) {
            $levels = $levels->whereIn('id', $levelIds)->values();
        }

        $query = JbsStudentRegistration::query()
            ->where('jbs_session_id', $sessionId)
            ->when($completedOnly, fn ($q) => $q->where('level_completed', true))
            ->when($levelIds !== null, fn ($q) => $q->whereIn('jbs_level_id', $levelIds));

        $rows = $query
            ->selectRaw('jbs_level_id, gender, COUNT(*) as count')
            ->groupBy('jbs_level_id', 'gender')
            ->get()
            ->groupBy('jbs_level_id');

        return $levels->map(function ($level) use ($rows) {
            $genderRows = $rows->get($level->id, collect());
            $counts = $this->genderCountsFromRows($genderRows);

            return [
                'level_id' => $level->id,
                'level_name' => $level->name,
                ...$counts,
            ];
        })->values()->all();
    }

    /**
     * @param  list<int>|null  $levelIds
     * @return array{boys: int, girls: int, other: int, total: int}
     */
    private function genderTotals(int $sessionId, ?array $levelIds = null, bool $completedOnly = false): array
    {
        $query = JbsStudentRegistration::query()
            ->where('jbs_session_id', $sessionId)
            ->when($completedOnly, fn ($q) => $q->where('level_completed', true))
            ->when($levelIds !== null, fn ($q) => $q->whereIn('jbs_level_id', $levelIds));

        $rows = $query
            ->selectRaw('gender, COUNT(*) as count')
            ->groupBy('gender')
            ->get();

        return $this->genderCountsFromRows($rows);
    }

    /**
     * @param  list<int>|null  $levelIds
     * @return list<array{nationality: string, count: int}>
     */
    private function nationalityStats(int $sessionId, ?array $levelIds = null): array
    {
        return JbsStudentRegistration::query()
            ->where('jbs_session_id', $sessionId)
            ->when($levelIds !== null, fn ($q) => $q->whereIn('jbs_level_id', $levelIds))
            ->selectRaw("COALESCE(NULLIF(TRIM(nationality), ''), 'Unknown') as nationality, COUNT(*) as count")
            ->groupBy('nationality')
            ->orderByDesc('count')
            ->orderBy('nationality')
            ->get()
            ->map(fn ($row) => [
                'nationality' => $row->nationality,
                'count' => (int) $row->count,
            ])
            ->values()
            ->all();
    }

    /**
     * @param  list<int>|null  $levelIds
     * @return list<array{church: string, address: string, count: int}>
     */
    private function churchStats(int $sessionId, ?array $levelIds = null): array
    {
        return JbsStudentRegistration::query()
            ->where('jbs_session_id', $sessionId)
            ->when($levelIds !== null, fn ($q) => $q->whereIn('jbs_level_id', $levelIds))
            ->selectRaw("COALESCE(NULLIF(TRIM(place_of_worship), ''), 'Unknown') as church, COALESCE(NULLIF(TRIM(place_of_worship_address), ''), '') as address, COUNT(*) as count")
            ->groupBy('church', 'address')
            ->orderByDesc('count')
            ->orderBy('church')
            ->orderBy('address')
            ->get()
            ->map(fn ($row) => [
                'church' => $row->church,
                'address' => $row->address,
                'count' => (int) $row->count,
            ])
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, \App\Models\JbsLevel>|null  $levels
     * @param  list<int>|null  $levelIds
     * @return list<array{
     *     level_id: int,
     *     level_name: string,
     *     distinction: int,
     *     merit: int,
     *     upper_credit: int,
     *     lower_credit: int,
     *     pass: int,
     *     ungraded: int,
     *     total_graded: int,
     *     boys: array{distinction: int, merit: int, upper_credit: int, lower_credit: int, pass: int, ungraded: int, total_graded: int},
     *     girls: array{distinction: int, merit: int, upper_credit: int, lower_credit: int, pass: int, ungraded: int, total_graded: int}
     * }>
     */
    private function gradesByLevel(int $sessionId, ?Collection $levels = null, ?array $levelIds = null): array
    {
        $levels ??= JbsSession::query()->find($sessionId)?->levels()->orderBy('sort_order')->get() ?? collect();

        if ($levelIds !== null) {
            $levels = $levels->whereIn('id', $levelIds)->values();
        }

        $rowsByLevel = [];
        foreach ($levels as $level) {
            $rowsByLevel[$level->id] = $this->emptyGradeRow($level->id, $level->name);
        }

        $registrations = JbsStudentRegistration::query()
            ->where('jbs_session_id', $sessionId)
            ->when($levelIds !== null, fn ($q) => $q->whereIn('jbs_level_id', $levelIds))
            ->with(['level.modules', 'scoreOutcomes'])
            ->get();

        foreach ($registrations as $registration) {
            if (! isset($rowsByLevel[$registration->jbs_level_id])) {
                continue;
            }

            $levelId = $registration->jbs_level_id;
            $genderKey = match ($registration->gender) {
                'Male' => 'boys',
                'Female' => 'girls',
                default => null,
            };

            $percents = [];
            $outcomes = $registration->scoreOutcomes->keyBy('jbs_module_id');

            foreach ($registration->level->modules as $module) {
                $outcome = $outcomes->get($module->id);
                if ($outcome !== null) {
                    $percents[] = $this->grading->percentFromScores(
                        (float) $outcome->score,
                        (float) $outcome->max_score,
                    );
                }
            }

            $overallPercent = $this->grading->overallAveragePercent($percents);

            $field = null;
            if ($overallPercent !== null) {
                $gradeShort = $this->grading->overallGradeForPercent($overallPercent)['grade_short'];
                $field = match ($gradeShort) {
                    'D' => 'distinction',
                    'M' => 'merit',
                    'UC' => 'upper_credit',
                    'LC' => 'lower_credit',
                    'P' => 'pass',
                    default => null,
                };
            }

            if ($field === null) {
                $rowsByLevel[$levelId]['ungraded']++;
                if ($genderKey !== null) {
                    $rowsByLevel[$levelId][$genderKey]['ungraded']++;
                }

                continue;
            }

            $rowsByLevel[$levelId][$field]++;
            $rowsByLevel[$levelId]['total_graded']++;
            if ($genderKey !== null) {
                $rowsByLevel[$levelId][$genderKey][$field]++;
                $rowsByLevel[$levelId][$genderKey]['total_graded']++;
            }
        }

        return array_values($rowsByLevel);
    }

    /**
     * @return array{
     *     level_id: int,
     *     level_name: string,
     *     distinction: int,
     *     merit: int,
     *     upper_credit: int,
     *     lower_credit: int,
     *     pass: int,
     *     ungraded: int,
     *     total_graded: int,
     *     boys: array{distinction: int, merit: int, upper_credit: int, lower_credit: int, pass: int, ungraded: int, total_graded: int},
     *     girls: array{distinction: int, merit: int, upper_credit: int, lower_credit: int, pass: int, ungraded: int, total_graded: int}
     * }
     */
    private function emptyGradeRow(int $levelId, string $levelName): array
    {
        return [
            'level_id' => $levelId,
            'level_name' => $levelName,
            'distinction' => 0,
            'merit' => 0,
            'upper_credit' => 0,
            'lower_credit' => 0,
            'pass' => 0,
            'ungraded' => 0,
            'total_graded' => 0,
            'boys' => $this->emptyGradeCounts(),
            'girls' => $this->emptyGradeCounts(),
        ];
    }

    /**
     * @return array{distinction: int, merit: int, upper_credit: int, lower_credit: int, pass: int, ungraded: int, total_graded: int}
     */
    private function emptyGradeCounts(): array
    {
        return [
            'distinction' => 0,
            'merit' => 0,
            'upper_credit' => 0,
            'lower_credit' => 0,
            'pass' => 0,
            'ungraded' => 0,
            'total_graded' => 0,
        ];
    }

    /**
     * @return array{boys: int, girls: int, other: int, total: int}
     */
    private function genderCountsFromRows(Collection $rows): array
    {
        $boys = 0;
        $girls = 0;
        $other = 0;

        foreach ($rows as $row) {
            $count = (int) $row->count;
            $gender = $row->gender;

            if ($gender === 'Male') {
                $boys += $count;
            } elseif ($gender === 'Female') {
                $girls += $count;
            } else {
                $other += $count;
            }
        }

        return [
            'boys' => $boys,
            'girls' => $girls,
            'other' => $other,
            'total' => $boys + $girls + $other,
        ];
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

    private function levelCompletedCount(int $sessionId, bool $completed, ?array $levelIds = null): int
    {
        return JbsStudentRegistration::query()
            ->where('jbs_session_id', $sessionId)
            ->where('level_completed', $completed)
            ->when($levelIds !== null, fn ($q) => $q->whereIn('jbs_level_id', $levelIds))
            ->count();
    }

    /**
     * @param  list<int>|null  $moduleIds
     */
    private function openTestsCount(int $sessionId, ?array $moduleIds = null): int
    {
        JbsTest::closeAllExpired();

        $query = JbsTest::query()
            ->where('status', 'open')
            ->whereHas('module.level', fn ($q) => $q->where('jbs_session_id', $sessionId));

        if ($moduleIds !== null) {
            $query->whereIn('jbs_module_id', $moduleIds);
        }

        return $query->count();
    }

    /**
     * @param  Collection<int, \App\Models\JbsLevel>  $levels
     * @param  list<int>|null  $levelIds
     * @return array{
     *     levels: list<array{level_id: int, level_name: string}>,
     *     days: list<array{date: string, counts: list<int>}>,
     *     by_gender: list<array{level_id: int, level_name: string, boys: int, girls: int, total: int}>
     * }
     */
    private function attendanceLast7DaysByLevel(int $sessionId, Collection $levels, ?array $levelIds = null): array
    {
        if ($levelIds !== null) {
            $levels = $levels->whereIn('id', $levelIds)->values();
        }

        $levelList = $levels->map(fn ($level) => [
            'level_id' => $level->id,
            'level_name' => $level->name,
        ])->values()->all();

        $start = Carbon::today()->subDays(6);

        $rows = JbsAttendanceLog::query()
            ->join('jbs_student_registrations as reg', 'reg.id', '=', 'jbs_attendance_logs.jbs_student_registration_id')
            ->where('reg.jbs_session_id', $sessionId)
            ->when($levelIds !== null, fn ($q) => $q->whereIn('reg.jbs_level_id', $levelIds))
            ->where('jbs_attendance_logs.attended_on', '>=', $start)
            ->selectRaw('jbs_attendance_logs.attended_on as attended_on, reg.jbs_level_id as level_id, reg.gender as gender, COUNT(*) as count')
            ->groupBy('jbs_attendance_logs.attended_on', 'reg.jbs_level_id', 'reg.gender')
            ->get();

        $byDate = [];
        $genderByLevel = [];
        foreach ($rows as $row) {
            $date = Carbon::parse($row->attended_on)->toDateString();
            $levelId = (int) $row->level_id;
            $count = (int) $row->count;

            $byDate[$date][$levelId] = ($byDate[$date][$levelId] ?? 0) + $count;

            if ($row->gender === 'Male') {
                $genderByLevel[$levelId]['boys'] = ($genderByLevel[$levelId]['boys'] ?? 0) + $count;
            } elseif ($row->gender === 'Female') {
                $genderByLevel[$levelId]['girls'] = ($genderByLevel[$levelId]['girls'] ?? 0) + $count;
            }
        }

        $days = [];
        for ($i = 0; $i < 7; $i++) {
            $date = $start->copy()->addDays($i)->toDateString();
            $counts = array_map(
                fn (array $level) => (int) ($byDate[$date][$level['level_id']] ?? 0),
                $levelList,
            );
            $days[] = ['date' => $date, 'counts' => $counts];
        }

        $byGender = array_map(function (array $level) use ($genderByLevel) {
            $boys = $genderByLevel[$level['level_id']]['boys'] ?? 0;
            $girls = $genderByLevel[$level['level_id']]['girls'] ?? 0;

            return [
                'level_id' => $level['level_id'],
                'level_name' => $level['level_name'],
                'boys' => $boys,
                'girls' => $girls,
                'total' => $boys + $girls,
            ];
        }, $levelList);

        return [
            'levels' => $levelList,
            'days' => $days,
            'by_gender' => $byGender,
        ];
    }

    /**
     * @param  Collection<int, \App\Models\JbsLevel>|null  $levels
     * @param  list<int>|null  $levelIds
     * @return list<array{level_id: int, level_name: string, count: int, total: int}>
     */
    private function allergiesByLevel(
        int $sessionId,
        ?Collection $levels = null,
        ?array $levelIds = null,
    ): array {
        $levels ??= JbsSession::query()->find($sessionId)?->levels()->orderBy('sort_order')->get() ?? collect();

        if ($levelIds !== null) {
            $levels = $levels->whereIn('id', $levelIds)->values();
        }

        $allergyCounts = JbsStudentRegistration::query()
            ->where('jbs_session_id', $sessionId)
            ->when($levelIds !== null, fn ($q) => $q->whereIn('jbs_level_id', $levelIds))
            ->whereNotNull('allergies')
            ->where('allergies', '!=', '')
            ->selectRaw('jbs_level_id, COUNT(*) as count')
            ->groupBy('jbs_level_id')
            ->pluck('count', 'jbs_level_id');

        $totalCounts = JbsStudentRegistration::query()
            ->where('jbs_session_id', $sessionId)
            ->when($levelIds !== null, fn ($q) => $q->whereIn('jbs_level_id', $levelIds))
            ->selectRaw('jbs_level_id, COUNT(*) as count')
            ->groupBy('jbs_level_id')
            ->pluck('count', 'jbs_level_id');

        return $levels->map(fn ($level) => [
            'level_id' => $level->id,
            'level_name' => $level->name,
            'count' => (int) ($allergyCounts[$level->id] ?? 0),
            'total' => (int) ($totalCounts[$level->id] ?? 0),
        ])->values()->all();
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
     * @param  array{levels: list<array{level_id: int, level_name: string}>, days: list<array{date: string, counts: list<int>}>}  $attendanceLast7DaysByLevel
     * @return array<string, mixed>
     */
    private function buildPayload(
        JbsSession $session,
        array $metrics,
        array $registrationsByLevel,
        array $modulesByLevel,
        array $attendanceLast7DaysByLevel,
        array $genderByLevel = [],
        array $genderCompletedByLevel = [],
        ?array $completedByGender = null,
        array $nationalities = [],
        array $churches = [],
        array $gradesByLevel = [],
        array $allergiesByLevel = [],
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
            'attendance_last_7_days_by_level' => $attendanceLast7DaysByLevel,
            'gender_by_level' => $genderByLevel,
            'gender_completed_by_level' => $genderCompletedByLevel,
            'completed_by_gender' => $completedByGender ?? ['boys' => 0, 'girls' => 0, 'other' => 0, 'total' => 0],
            'nationalities' => $nationalities,
            'churches' => $churches,
            'grades_by_level' => $gradesByLevel,
            'allergies_by_level' => $allergiesByLevel,
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
                'staff_assistants' => 0,
                'level_completed_count' => 0,
                'level_not_completed_count' => 0,
                'open_tests' => 0,
                'my_modules' => 0,
            ],
            'registrations_by_level' => [],
            'modules_by_level' => [],
            'attendance_last_7_days_by_level' => ['levels' => [], 'days' => [], 'by_gender' => []],
            'gender_by_level' => [],
            'gender_completed_by_level' => [],
            'completed_by_gender' => ['boys' => 0, 'girls' => 0, 'other' => 0, 'total' => 0],
            'nationalities' => [],
            'churches' => [],
            'grades_by_level' => [],
            'allergies_by_level' => [],
        ];
    }
}
