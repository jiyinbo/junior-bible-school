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

        if (! $user->isAdmin()) {
            $query->where('user_id', $user->id);
        }

        $rows = $query->orderByDesc('id')->limit($user->isAdmin() ? 300 : 100)->get();

        return response()->json([
            'data' => $rows->map(fn (JbsModuleAssignment $a) => [
                'assignment_id' => $a->id,
                'module' => [
                    'id' => $a->module->id,
                    'name' => $a->module->name,
                ],
                'level' => $a->module->level->name,
                'session' => $a->module->level->session->name,
                'teacher' => $a->teacher->name,
                'test_status' => $a->module->test?->status,
            ]),
        ]);
    }
}
