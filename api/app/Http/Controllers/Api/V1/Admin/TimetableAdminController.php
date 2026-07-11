<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\JbsLevel;
use App\Models\JbsSession;
use App\Models\JbsTimetableDay;
use App\Models\JbsTimetableEntry;
use App\Models\JbsTimetablePeriod;
use App\Services\JbsTimetableGridService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class TimetableAdminController extends Controller
{
    public function __construct(private JbsTimetableGridService $grid) {}

    public function exportPdf(Request $request, JbsLevel $jbs_level): Response
    {
        $jbs_level->loadMissing('session');
        $this->grid->ensureDays($jbs_level->session);
        $grid = $this->grid->gridForLevel($jbs_level);

        $this->audit()->record('timetable.exported', $request, $jbs_level, metadata: ['tier' => $jbs_level->name]);

        $pdf = Pdf::loadView('pdf.timetable', ['grid' => $grid])->setPaper('a4', 'landscape');

        $slug = preg_replace('/[^a-z0-9]+/i', '-', strtolower($jbs_level->name));

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="jbs-timetable-'.$slug.'.pdf"',
        ]);
    }

    public function sessionGrid(JbsSession $jbs_session): JsonResponse
    {
        $this->grid->ensureDays($jbs_session);
        $jbs_session->load(['levels', 'timetablePeriods', 'timetableDays']);

        return response()->json([
            'data' => [
                'session' => ['id' => $jbs_session->id, 'name' => $jbs_session->name],
                'periods' => $jbs_session->timetablePeriods->map(fn (JbsTimetablePeriod $p) => $this->periodPayload($p))->all(),
                'days' => $jbs_session->timetableDays->map(fn (JbsTimetableDay $d) => $this->dayPayload($d))->all(),
                'tiers' => $jbs_session->levels->map(fn (JbsLevel $l) => ['id' => $l->id, 'name' => $l->name])->all(),
            ],
        ]);
    }

    public function tierGrid(JbsLevel $jbs_level): JsonResponse
    {
        $jbs_level->loadMissing('session');
        $this->grid->ensureDays($jbs_level->session);

        return response()->json(['data' => $this->grid->gridForLevel($jbs_level)]);
    }

    public function seedPeriods(Request $request, JbsSession $jbs_session): JsonResponse
    {
        $this->grid->seedDefaultPeriods($jbs_session);
        $this->audit()->record('timetable.template_seeded', $request, $jbs_session);

        return $this->sessionGrid($jbs_session->fresh());
    }

    public function clearSetup(Request $request, JbsSession $jbs_session): JsonResponse
    {
        $jbs_session->timetablePeriods()->delete();
        $jbs_session->timetableDays()->delete();
        $this->audit()->record('timetable.setup_cleared', $request, $jbs_session);

        return response()->json(['message' => 'Timetable setup cleared.']);
    }

    public function storePeriod(Request $request, JbsSession $jbs_session): JsonResponse
    {
        $data = $this->validatePeriod($request);
        $period = $jbs_session->timetablePeriods()->create($this->periodAttributes($data, $jbs_session));
        $this->audit()->created($request, 'timetable.period_created', $period);

        return response()->json(['data' => $this->periodPayload($period)], 201);
    }

    public function updatePeriod(Request $request, JbsTimetablePeriod $jbs_timetable_period): JsonResponse
    {
        $data = $this->validatePeriod($request, partial: true);
        $jbs_timetable_period->update($this->periodAttributes($data, $jbs_timetable_period->session, partial: true));
        $this->audit()->record('timetable.period_updated', $request, $jbs_timetable_period);

        return response()->json(['data' => $this->periodPayload($jbs_timetable_period->fresh())]);
    }

    public function destroyPeriod(Request $request, JbsTimetablePeriod $jbs_timetable_period): JsonResponse
    {
        $this->audit()->record('timetable.period_deleted', $request, $jbs_timetable_period);
        $jbs_timetable_period->delete();

        return response()->json(['message' => 'Period removed.']);
    }

    public function storeDay(Request $request, JbsSession $jbs_session): JsonResponse
    {
        $data = $request->validate([
            'day_date' => ['required', 'date'],
            'label' => ['nullable', 'string', 'max:120'],
        ]);

        $exists = $jbs_session->timetableDays()->whereDate('day_date', $data['day_date'])->exists();
        if ($exists) {
            return response()->json(['message' => 'That day is already on the timetable.'], 422);
        }

        $order = (int) $jbs_session->timetableDays()->max('sort_order') + 1;
        $day = $jbs_session->timetableDays()->create([
            'day_date' => $data['day_date'],
            'label' => $data['label'] ?? null,
            'sort_order' => $order,
        ]);
        $this->audit()->created($request, 'timetable.day_created', $day);

        return response()->json(['data' => $this->dayPayload($day)], 201);
    }

    public function destroyDay(Request $request, JbsTimetableDay $jbs_timetable_day): JsonResponse
    {
        $this->audit()->record('timetable.day_deleted', $request, $jbs_timetable_day);
        $jbs_timetable_day->delete();

        return response()->json(['message' => 'Day removed.']);
    }

    public function setEntry(Request $request, JbsLevel $jbs_level): JsonResponse
    {
        $data = $request->validate([
            'jbs_timetable_day_id' => ['required', 'integer', 'exists:jbs_timetable_days,id'],
            'jbs_timetable_period_id' => ['required', 'integer', 'exists:jbs_timetable_periods,id'],
            'span' => ['nullable', 'integer', 'min:1', 'max:30'],
            'jbs_module_id' => ['nullable', 'integer', 'exists:jbs_modules,id'],
            'activity_label' => ['nullable', 'string', 'max:120'],
        ]);

        $jbs_level->loadMissing('session');

        $day = JbsTimetableDay::query()->findOrFail($data['jbs_timetable_day_id']);
        $period = JbsTimetablePeriod::query()->findOrFail($data['jbs_timetable_period_id']);
        abort_unless($day->jbs_session_id === $jbs_level->jbs_session_id, 422, 'Day is not in this session.');
        abort_unless($period->jbs_session_id === $jbs_level->jbs_session_id, 422, 'Period is not in this session.');

        $moduleId = $data['jbs_module_id'] ?? null;
        if ($moduleId !== null) {
            $belongs = $jbs_level->modules()->whereKey($moduleId)->exists();
            abort_unless($belongs, 422, 'Module does not belong to this tier.');
        }

        $label = trim((string) ($data['activity_label'] ?? ''));

        // No content -> clear the cell.
        if ($moduleId === null && $label === '') {
            JbsTimetableEntry::query()
                ->where('jbs_level_id', $jbs_level->id)
                ->where('jbs_timetable_day_id', $day->id)
                ->where('jbs_timetable_period_id', $period->id)
                ->delete();

            return response()->json(['data' => $this->grid->gridForLevel($jbs_level->fresh())]);
        }

        JbsTimetableEntry::query()->updateOrCreate(
            [
                'jbs_level_id' => $jbs_level->id,
                'jbs_timetable_day_id' => $day->id,
                'jbs_timetable_period_id' => $period->id,
            ],
            [
                'span' => $data['span'] ?? 1,
                'jbs_module_id' => $moduleId,
                'activity_label' => $moduleId === null ? $label : null,
            ],
        );

        $this->audit()->record('timetable.entry_set', $request, $jbs_level, metadata: [
            'day' => $day->day_date->toDateString(),
            'period_id' => $period->id,
            'module_id' => $moduleId,
            'activity_label' => $moduleId === null ? $label : null,
        ]);

        return response()->json(['data' => $this->grid->gridForLevel($jbs_level->fresh())]);
    }

    private function validatePeriod(Request $request, bool $partial = false): array
    {
        $req = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'start_time' => [$partial ? 'sometimes' : 'nullable', 'nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i'],
            'kind' => [$req, Rule::in(['teaching', 'activity'])],
            'label' => ['nullable', 'string', 'max:120'],
            'applies_all_days' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
    }

    private function periodAttributes(array $data, JbsSession $session, bool $partial = false): array
    {
        $attrs = [];
        foreach (['start_time', 'end_time', 'kind', 'label', 'applies_all_days', 'sort_order'] as $key) {
            if (array_key_exists($key, $data)) {
                $attrs[$key] = $data[$key];
            }
        }
        if (! $partial && ! array_key_exists('sort_order', $attrs)) {
            $attrs['sort_order'] = (int) $session->timetablePeriods()->max('sort_order') + 1;
        }

        return $attrs;
    }

    private function periodPayload(JbsTimetablePeriod $p): array
    {
        return [
            'id' => $p->id,
            'sort_order' => $p->sort_order,
            'start_time' => $p->start_time ? substr($p->start_time, 0, 5) : null,
            'end_time' => $p->end_time ? substr($p->end_time, 0, 5) : null,
            'time_label' => $this->grid->timeLabel($p->start_time, $p->end_time),
            'kind' => $p->kind,
            'label' => $p->label,
            'applies_all_days' => $p->applies_all_days,
        ];
    }

    private function dayPayload(JbsTimetableDay $d): array
    {
        return [
            'id' => $d->id,
            'date' => $d->day_date->toDateString(),
            'date_label' => $d->day_date->format('d/m/Y'),
            'weekday_label' => $d->day_date->format('D'),
            'label' => $d->label,
        ];
    }
}
