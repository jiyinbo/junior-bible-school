<?php

namespace App\Http\Controllers\Api\V1\Staff;

use App\Http\Controllers\Controller;
use App\Models\JbsModule;
use App\Models\JbsModuleAssignment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MyModulesController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        // Admins and assistants can open tests / score any module, including unassigned ones.
        if ($user->isAdmin() || $user->isAssistant()) {
            $modules = JbsModule::query()
                ->with(['level.session', 'assignment.teacher', 'test'])
                ->join('jbs_levels', 'jbs_levels.id', '=', 'jbs_modules.jbs_level_id')
                ->join('jbs_sessions', 'jbs_sessions.id', '=', 'jbs_levels.jbs_session_id')
                ->orderByDesc('jbs_sessions.id')
                ->orderBy('jbs_levels.sort_order')
                ->orderBy('jbs_modules.sort_order')
                ->orderBy('jbs_modules.name')
                ->select('jbs_modules.*')
                ->limit(300)
                ->get();

            return response()->json([
                'data' => $modules->map(fn (JbsModule $module) => $this->moduleRow(
                    module: $module,
                    assignmentId: $module->assignment?->id,
                    teacherName: $module->assignment?->teacher?->name ?? 'Unassigned',
                )),
            ]);
        }

        $rows = JbsModuleAssignment::query()
            ->with(['module.level.session', 'teacher', 'module.test'])
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        return response()->json([
            'data' => $rows->map(fn (JbsModuleAssignment $assignment) => $this->moduleRow(
                module: $assignment->module,
                assignmentId: $assignment->id,
                teacherName: $assignment->teacher->name,
            )),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function moduleRow(JbsModule $module, ?int $assignmentId, string $teacherName): array
    {
        return [
            'assignment_id' => $assignmentId,
            'module' => [
                'id' => $module->id,
                'name' => $module->name,
                'code' => $module->code,
            ],
            'level' => $module->level->name,
            'session' => $module->level->session->name,
            'teacher' => $teacherName,
            'test_status' => $module->test?->status,
        ];
    }
}
