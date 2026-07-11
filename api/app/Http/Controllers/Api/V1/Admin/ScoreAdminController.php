<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\JbsModule;
use App\Models\JbsModuleScoreOutcome;
use App\Models\JbsStudentRegistration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScoreAdminController extends Controller
{
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
