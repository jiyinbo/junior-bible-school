<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\JbsModule;
use App\Models\JbsModuleAssignment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssignmentController extends Controller
{
    public function store(Request $request, JbsModule $jbs_module): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $assignment = JbsModuleAssignment::query()->updateOrCreate(
            ['jbs_module_id' => $jbs_module->id],
            ['user_id' => $data['user_id']],
        );
        $assignment->load('teacher');

        $this->audit()->record(
            'module.teacher_assigned',
            $request,
            $jbs_module,
            metadata: [
                'teacher_user_id' => $data['user_id'],
                'teacher_name' => $assignment->teacher?->name,
            ],
        );

        return response()->json(['data' => $assignment->load('teacher')], 201);
    }
}
