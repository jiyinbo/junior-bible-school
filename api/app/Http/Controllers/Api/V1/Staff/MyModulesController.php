<?php

namespace App\Http\Controllers\Api\V1\Staff;

use App\Http\Controllers\Controller;
use App\Models\JbsModuleAssignment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MyModulesController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = JbsModuleAssignment::query()->with(['module.level.session', 'teacher']);

        // Admins and assistants can score any module, so they see all assignments.
        $seesAllModules = $user->isAdmin() || $user->isAssistant();
        if (! $seesAllModules) {
            $query->where('user_id', $user->id);
        }

        $rows = $query->orderByDesc('id')->limit($seesAllModules ? 300 : 100)->get();

        return response()->json([
            'data' => $rows->map(fn (JbsModuleAssignment $a) => [
                'assignment_id' => $a->id,
                'module' => [
                    'id' => $a->module->id,
                    'name' => $a->module->name,
                    'code' => $a->module->code,
                ],
                'level' => $a->module->level->name,
                'session' => $a->module->level->session->name,
                'teacher' => $a->teacher->name,
                'test_status' => $a->module->test?->status,
            ]),
        ]);
    }
}
