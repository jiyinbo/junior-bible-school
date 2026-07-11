<?php

namespace App\Services;

use App\Models\JbsLevel;
use App\Models\JbsSession;
use App\Models\JbsTimetableDay;
use App\Models\JbsTimetableEntry;
use App\Models\JbsTimetablePeriod;
use Carbon\Carbon;

class JbsTimetableGridService
{
    /**
     * Seed day rows from the session date range when none exist yet.
     * Days are editable afterwards (admins can add/remove).
     */
    public function ensureDays(JbsSession $session): void
    {
        if ($session->timetableDays()->exists()) {
            return;
        }

        if (! $session->session_starts_at || ! $session->session_ends_at) {
            return;
        }

        $cursor = $session->session_starts_at->copy()->startOfDay();
        $end = $session->session_ends_at->copy()->startOfDay();
        $order = 0;

        while ($cursor->lte($end) && $order < 60) {
            JbsTimetableDay::query()->create([
                'jbs_session_id' => $session->id,
                'day_date' => $cursor->toDateString(),
                'sort_order' => $order,
            ]);
            $cursor->addDay();
            $order++;
        }
    }

    /**
     * Create a typical JBS day template (columns) for a tier when none exist yet.
     */
    public function seedDefaultPeriods(JbsLevel $level): void
    {
        if ($level->timetablePeriods()->exists()) {
            return;
        }

        $template = [
            ['09:00', '09:30', 'activity', 'DEVOTION', true],
            ['09:30', '10:10', 'teaching', null, false],
            ['10:10', '10:20', 'activity', 'BREAK', true],
            ['10:20', '11:00', 'teaching', null, false],
            ['11:00', '11:10', 'activity', 'TEST', true],
            ['11:10', '11:30', 'activity', 'BREAK', true],
            ['11:30', '12:10', 'teaching', null, false],
            ['12:10', '12:20', 'activity', 'BREAK', true],
            ['12:20', '13:00', 'teaching', null, false],
            ['13:00', '13:10', 'activity', 'TEST', true],
            ['13:10', '14:00', 'activity', 'LUNCH BREAK', true],
            ['14:00', '14:40', 'teaching', null, false],
            ['14:40', '14:50', 'activity', 'BREAK', true],
            ['14:50', '15:30', 'teaching', null, false],
            ['15:30', '15:40', 'activity', 'TEST', true],
            ['15:40', '16:00', 'activity', 'CLEANING & ARRANGEMENT', true],
            ['16:00', null, 'activity', 'HOME TIME', true],
        ];

        foreach ($template as $i => [$start, $end, $kind, $label, $allDays]) {
            JbsTimetablePeriod::query()->create([
                'jbs_level_id' => $level->id,
                'sort_order' => $i,
                'start_time' => $start,
                'end_time' => $end,
                'kind' => $kind,
                'label' => $label,
                'applies_all_days' => $allDays,
            ]);
        }
    }

    public function timeLabel(?string $start, ?string $end): ?string
    {
        $s = $this->fmt($start);
        $e = $this->fmt($end);
        if ($s && $e) {
            return "{$s} - {$e}";
        }

        return $s ?: $e;
    }

    private function hhmm(?string $time): ?string
    {
        if ($time === null || $time === '') {
            return null;
        }

        return substr($time, 0, 5);
    }

    private function fmt(?string $time): ?string
    {
        $hhmm = $this->hhmm($time);
        if ($hhmm === null) {
            return null;
        }

        return preg_replace('/^0(\d:)/', '$1', $hhmm);
    }

    /**
     * Modules in the tier with their code and teacher — feeds grid cells + legend.
     *
     * @return list<array<string, mixed>>
     */
    public function legendForLevel(JbsLevel $level): array
    {
        $level->loadMissing(['modules.assignment.teacher']);

        return $level->modules
            ->sortBy(fn ($m) => [$m->code ?: 'zzz', $m->name])
            ->map(fn ($m) => [
                'module_id' => $m->id,
                'code' => $m->code,
                'name' => $m->name,
                'teacher_name' => $m->assignment?->teacher?->name,
            ])
            ->values()
            ->all();
    }

    /**
     * Build the full timetable grid (columns x rows with merged cells) for a tier.
     *
     * @return array<string, mixed>
     */
    public function gridForLevel(JbsLevel $level): array
    {
        $level->loadMissing(['session', 'modules.assignment.teacher', 'timetablePeriods']);
        $session = $level->session;

        /** @var list<JbsTimetablePeriod> $periods */
        $periods = $level->timetablePeriods->values()->all();
        /** @var list<JbsTimetableDay> $days */
        $days = $session->timetableDays()->get()->values()->all();

        $periodIndex = [];
        foreach ($periods as $i => $period) {
            $periodIndex[$period->id] = $i;
        }

        $modulesById = $level->modules->keyBy('id');

        $entries = JbsTimetableEntry::query()
            ->where('jbs_level_id', $level->id)
            ->get();

        $rowCount = count($days);
        $colCount = count($periods);

        // grid[d][p] = null | cell descriptor
        $grid = [];
        for ($d = 0; $d < $rowCount; $d++) {
            $grid[$d] = array_fill(0, max($colCount, 0), null);
        }

        $dayIndex = [];
        foreach ($days as $i => $day) {
            $dayIndex[$day->id] = $i;
        }

        // Place explicit entries.
        foreach ($entries as $entry) {
            if (! isset($dayIndex[$entry->jbs_timetable_day_id], $periodIndex[$entry->jbs_timetable_period_id])) {
                continue;
            }
            $d = $dayIndex[$entry->jbs_timetable_day_id];
            $p = $periodIndex[$entry->jbs_timetable_period_id];
            $span = max(1, min((int) $entry->span, $colCount - $p));

            $module = $entry->jbs_module_id ? $modulesById->get($entry->jbs_module_id) : null;

            if ($module) {
                $cell = [
                    'type' => 'module',
                    'module_id' => $module->id,
                    'code' => $module->code,
                    'name' => $module->name,
                    'teacher_name' => $module->assignment?->teacher?->name,
                    'col_span' => $span,
                ];
            } else {
                $cell = [
                    'type' => 'activity',
                    'label' => $entry->activity_label,
                    'col_span' => $span,
                ];
            }
            $cell['origin'] = true;
            $grid[$d][$p] = $cell;
            for ($k = 1; $k < $span; $k++) {
                $grid[$d][$p + $k] = ['covered' => true];
            }
        }

        // Fill remaining cells: all-day activity columns auto-fill; others blank.
        for ($d = 0; $d < $rowCount; $d++) {
            for ($p = 0; $p < $colCount; $p++) {
                if ($grid[$d][$p] !== null) {
                    continue;
                }
                $period = $periods[$p];
                if ($period->applies_all_days) {
                    $grid[$d][$p] = [
                        'type' => 'activity',
                        'label' => $period->label,
                        'col_span' => 1,
                        'origin' => true,
                        'structural' => true,
                    ];
                } else {
                    $grid[$d][$p] = [
                        'type' => 'empty',
                        'col_span' => 1,
                        'origin' => true,
                    ];
                }
            }
        }

        // Vertical merge of identical adjacent cells in a column (skip empties).
        $consumed = [];
        for ($p = 0; $p < $colCount; $p++) {
            for ($d = 0; $d < $rowCount; $d++) {
                $cell = $grid[$d][$p];
                if ($cell === null || ($cell['covered'] ?? false) || ($cell['origin'] ?? false) !== true) {
                    continue;
                }
                if (($cell['type'] ?? '') === 'empty') {
                    continue;
                }
                $rowSpan = 1;
                $key = $this->cellKey($cell);
                for ($d2 = $d + 1; $d2 < $rowCount; $d2++) {
                    $next = $grid[$d2][$p];
                    if ($next === null || ($next['covered'] ?? false) || ($next['origin'] ?? false) !== true) {
                        break;
                    }
                    if ($this->cellKey($next) !== $key) {
                        break;
                    }
                    $rowSpan++;
                    $consumed["{$d2}-{$p}"] = true;
                }
                $grid[$d][$p]['row_span'] = $rowSpan;
            }
        }

        // Emit rows.
        $rows = [];
        for ($d = 0; $d < $rowCount; $d++) {
            $day = $days[$d];
            $cells = [];
            for ($p = 0; $p < $colCount; $p++) {
                $cell = $grid[$d][$p];
                if ($cell === null || ($cell['covered'] ?? false) || isset($consumed["{$d}-{$p}"])) {
                    continue;
                }
                $cells[] = [
                    'period_id' => $periods[$p]->id,
                    'type' => $cell['type'],
                    'code' => $cell['code'] ?? null,
                    'name' => $cell['name'] ?? null,
                    'label' => $cell['label'] ?? null,
                    'teacher_name' => $cell['teacher_name'] ?? null,
                    'module_id' => $cell['module_id'] ?? null,
                    'col_span' => $cell['col_span'] ?? 1,
                    'row_span' => $cell['row_span'] ?? 1,
                    'structural' => $cell['structural'] ?? false,
                ];
            }
            $rows[] = [
                'day_id' => $day->id,
                'date' => $day->day_date->toDateString(),
                'date_label' => $day->day_date->format('d/m/Y'),
                'weekday_label' => $day->day_date->format('D'),
                'label' => $day->label,
                'cells' => $cells,
            ];
        }

        return [
            'tier' => ['id' => $level->id, 'name' => $level->name],
            'session' => ['id' => $session->id, 'name' => $session->name],
            'periods' => array_map(fn (JbsTimetablePeriod $p) => [
                'id' => $p->id,
                'sort_order' => $p->sort_order,
                'start_time' => $this->hhmm($p->start_time),
                'end_time' => $this->hhmm($p->end_time),
                'time_label' => $this->timeLabel($p->start_time, $p->end_time),
                'kind' => $p->kind,
                'label' => $p->label,
                'applies_all_days' => $p->applies_all_days,
            ], $periods),
            'days' => array_map(fn (JbsTimetableDay $day) => [
                'id' => $day->id,
                'date' => $day->day_date->toDateString(),
                'date_label' => $day->day_date->format('d/m/Y'),
                'weekday_label' => $day->day_date->format('D'),
                'label' => $day->label,
            ], $days),
            'rows' => $rows,
            'entries' => $entries->map(function (JbsTimetableEntry $entry) use ($modulesById) {
                $module = $entry->jbs_module_id ? $modulesById->get($entry->jbs_module_id) : null;

                return [
                    'day_id' => $entry->jbs_timetable_day_id,
                    'period_id' => $entry->jbs_timetable_period_id,
                    'span' => (int) $entry->span,
                    'module_id' => $entry->jbs_module_id,
                    'code' => $module?->code,
                    'name' => $module?->name,
                    'activity_label' => $entry->activity_label,
                ];
            })->values()->all(),
            'legend' => $this->legendForLevel($level),
        ];
    }

    private function cellKey(array $cell): string
    {
        return implode('|', [
            $cell['type'] ?? '',
            $cell['module_id'] ?? '',
            $cell['label'] ?? '',
            $cell['col_span'] ?? 1,
        ]);
    }
}
