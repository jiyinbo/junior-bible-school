<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\JbsLevel;
use App\Models\JbsModule;
use App\Models\JbsModuleScoreOutcome;
use App\Models\JbsStudentRegistration;
use App\Services\JbsGradingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScoreAdminController extends Controller
{
    public function __construct(
        private JbsGradingService $grading,
    ) {}

    public function tierBoard(Request $request): JsonResponse
    {
        $data = $request->validate([
            'session' => ['required', 'string'],
            'level' => ['required', 'string'],
        ]);

        $level = JbsLevel::query()
            ->where('name', $data['level'])
            ->whereHas('session', fn ($query) => $query->where('name', $data['session']))
            ->with(['modules' => fn ($query) => $query->orderBy('sort_order')->orderBy('name')])
            ->firstOrFail();

        $user = $request->user();
        if (! $user->isAdmin() && ! $user->isAssistant()) {
            $managesLevel = JbsModule::query()
                ->where('jbs_level_id', $level->id)
                ->whereHas('assignment', fn ($query) => $query->where('user_id', $user->id))
                ->exists();
            abort_unless($managesLevel, 403);
        }

        $modules = $level->modules;
        $moduleIds = $modules->pluck('id')->all();

        $registrations = JbsStudentRegistration::query()
            ->where('jbs_level_id', $level->id)
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->orderBy('registration_number')
            ->get(['id', 'registration_number', 'first_name', 'last_name']);

        $outcomesByRegistration = $registrations->isEmpty() || $moduleIds === []
            ? collect()
            : JbsModuleScoreOutcome::query()
                ->whereIn('jbs_student_registration_id', $registrations->pluck('id'))
                ->whereIn('jbs_module_id', $moduleIds)
                ->get()
                ->groupBy('jbs_student_registration_id');

        $students = $registrations->map(function (JbsStudentRegistration $registration) use ($modules, $outcomesByRegistration) {
            $outcomes = ($outcomesByRegistration->get($registration->id) ?? collect())->keyBy('jbs_module_id');
            $moduleScores = [];
            $scoredPercents = [];
            $overallScore = 0;
            $overallMaxScore = 0;

            foreach ($modules as $module) {
                /** @var JbsModuleScoreOutcome|null $outcome */
                $outcome = $outcomes->get($module->id);
                if ($outcome === null) {
                    $moduleScores[(string) $module->id] = null;

                    continue;
                }

                $score = (int) round((float) $outcome->score);
                $maxScore = (int) round((float) $outcome->max_score);
                $grade = $this->grading->moduleGradeForScores((float) $outcome->score, (float) $outcome->max_score);
                $moduleScores[(string) $module->id] = [
                    'score' => $score,
                    'max_score' => $maxScore,
                    'percent' => $grade['percent'],
                    'grade_short' => $grade['grade_short'],
                ];
                $scoredPercents[] = $grade['percent'];
                $overallScore += $score;
                $overallMaxScore += $maxScore;
            }

            $overallPercent = $this->grading->overallAveragePercent($scoredPercents);
            $overallGrade = $overallPercent !== null
                ? $this->grading->overallGradeForPercent($overallPercent)
                : null;
            $modulesScored = count($scoredPercents);

            return [
                'id' => $registration->id,
                'registration_number' => $registration->registration_number,
                'full_name' => $registration->fullName(),
                'modules' => $moduleScores,
                'modules_scored' => $modulesScored,
                'overall_score' => $overallPercent !== null ? $overallScore : null,
                'overall_max_score' => $overallPercent !== null ? $overallMaxScore : null,
                'overall_percent' => $overallPercent,
                'overall_grade_short' => $overallGrade['grade_short'] ?? null,
                'overall_grade_label' => $overallGrade['grade_label'] ?? null,
            ];
        });

        $scored = $students->filter(fn (array $row) => $row['overall_percent'] !== null);
        $maxModulesScored = (int) $scored->max('modules_scored');
        $atMaxModules = $scored->filter(fn (array $row) => $row['modules_scored'] === $maxModulesScored);

        // If at least 3 students share the highest test count, Top 3 is drawn only from
        // that cohort — fewer tests cannot displace them even at 100%.
        $top3Pool = $atMaxModules->count() >= 3 ? $atMaxModules : $scored;

        $ranked = $top3Pool
            ->sort(function (array $a, array $b) {
                // Higher average % wins; if tied, prefer more modules scored (relevant when
                // the pool still mixes counts because fewer than 3 share the max).
                $cmp = $b['overall_percent'] <=> $a['overall_percent'];
                if ($cmp !== 0) {
                    return $cmp;
                }
                $cmp = $b['modules_scored'] <=> $a['modules_scored'];
                if ($cmp !== 0) {
                    return $cmp;
                }
                $cmp = ($b['overall_score'] ?? 0) <=> ($a['overall_score'] ?? 0);
                if ($cmp !== 0) {
                    return $cmp;
                }

                return strcasecmp($a['full_name'], $b['full_name']);
            })
            ->values();

        // Competition ranking: include everyone whose place is in the top 3
        // (ties share a rank only when % and modules scored match).
        $top3 = collect();
        $rank = 0;
        $previousKey = null;
        foreach ($ranked as $index => $row) {
            $key = $row['overall_percent']."\0".$row['modules_scored'];
            if ($previousKey === null || $key !== $previousKey) {
                $rank = $index + 1;
            }
            if ($rank > 3) {
                break;
            }

            $top3->push([
                'id' => $row['id'],
                'registration_number' => $row['registration_number'],
                'full_name' => $row['full_name'],
                'rank' => $rank,
                'modules_scored' => $row['modules_scored'],
                'overall_score' => $row['overall_score'],
                'overall_max_score' => $row['overall_max_score'],
                'overall_percent' => $row['overall_percent'],
                'overall_grade_short' => $row['overall_grade_short'],
                'overall_grade_label' => $row['overall_grade_label'],
            ]);
            $previousKey = $key;
        }

        return response()->json([
            'data' => [
                'modules' => $modules->map(fn (JbsModule $module) => [
                    'id' => $module->id,
                    'name' => $module->name,
                    'code' => $module->code,
                    'sort_order' => $module->sort_order,
                ])->values(),
                'students' => $students->values(),
                'top3' => $top3->values(),
            ],
        ]);
    }

    public function unscoredStudents(Request $request): JsonResponse
    {
        $data = $request->validate([
            'jbs_module_id' => ['required', 'integer', 'exists:jbs_modules,id'],
        ]);

        $module = JbsModule::query()->findOrFail($data['jbs_module_id']);
        abort_unless($request->user()->managesModule($module), 403);

        $students = JbsStudentRegistration::query()
            ->where('jbs_level_id', $module->jbs_level_id)
            ->whereDoesntHave('scoreOutcomes', fn ($query) => $query->where('jbs_module_id', $module->id))
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->orderBy('registration_number')
            ->limit(500)
            ->get(['id', 'registration_number', 'first_name', 'last_name']);

        return response()->json([
            'data' => $students->map(fn (JbsStudentRegistration $registration) => [
                'id' => $registration->id,
                'registration_number' => $registration->registration_number,
                'first_name' => $registration->first_name,
                'last_name' => $registration->last_name,
                'full_name' => $registration->fullName(),
            ]),
        ]);
    }

    public function manual(Request $request): JsonResponse
    {
        $data = $request->validate([
            'registration_number' => ['required', 'string'],
            'jbs_module_id' => ['required', 'integer', 'exists:jbs_modules,id'],
            'score' => ['required', 'numeric', 'min:0'],
            'max_score' => ['required', 'numeric', 'min:0.01'],
        ]);

        $module = JbsModule::query()->findOrFail($data['jbs_module_id']);
        abort_unless($request->user()->managesModule($module), 403);

        $reg = JbsStudentRegistration::query()
            ->where('registration_number', trim($data['registration_number']))
            ->with('level.modules')
            ->firstOrFail();

        $moduleIds = $reg->level->modules->pluck('id')->all();
        abort_unless(in_array((int) $data['jbs_module_id'], $moduleIds, true), 422, 'Module does not belong to the student level.');

        $existing = JbsModuleScoreOutcome::query()
            ->where('jbs_student_registration_id', $reg->id)
            ->where('jbs_module_id', $data['jbs_module_id'])
            ->first();

        $outcome = JbsModuleScoreOutcome::query()->updateOrCreate(
            [
                'jbs_student_registration_id' => $reg->id,
                'jbs_module_id' => $data['jbs_module_id'],
            ],
            [
                'score' => (int) round((float) $data['score']),
                'max_score' => (int) round((float) $data['max_score']),
                'source' => 'paper',
                'jbs_attempt_id' => null,
                'admin_confirmed_at' => now(),
                'admin_confirmed_by_user_id' => $request->user()->id,
            ],
        );

        $this->audit()->record(
            $existing ? 'score.manual_updated' : 'score.manual_created',
            $request,
            $reg,
            metadata: [
                'module_id' => $module->id,
                'module_name' => $module->name,
                'score' => $outcome->score,
                'max_score' => $outcome->max_score,
            ],
        );

        return response()->json(['data' => $outcome]);
    }
}
