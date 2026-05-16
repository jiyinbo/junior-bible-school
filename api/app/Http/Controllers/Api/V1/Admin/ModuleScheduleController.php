<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\JbsModule;
use App\Services\JbsModuleScheduleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ModuleScheduleController extends Controller
{
    public function __construct(
        private JbsModuleScheduleService $schedule,
    ) {}

    public function update(Request $request, JbsModule $jbs_module): JsonResponse
    {
        $data = $request->validate([
            'scheduled_date' => ['nullable', 'date'],
            'scheduled_start_time' => ['nullable', 'date_format:H:i'],
            'scheduled_end_time' => ['nullable', 'date_format:H:i'],
        ]);

        $jbs_module->load('level.session');
        $this->schedule->validateForSession($jbs_module->level->session, $data);

        $keys = ['scheduled_date', 'scheduled_start_time', 'scheduled_end_time'];
        $old = $this->audit()->snapshot($jbs_module, $keys);

        $jbs_module->update([
            'scheduled_date' => $data['scheduled_date'] ?? null,
            'scheduled_start_time' => $data['scheduled_start_time'] ?? null,
            'scheduled_end_time' => $data['scheduled_end_time'] ?? null,
        ]);

        $jbs_module->refresh()->load('assignment.teacher', 'test');
        $this->audit()->updated(
            $request,
            'module.schedule_updated',
            $jbs_module,
            $old,
            $this->audit()->snapshot($jbs_module, $keys),
        );

        return response()->json([
            'data' => array_merge(
                [
                    'id' => $jbs_module->id,
                    'name' => $jbs_module->name,
                ],
                $this->schedule->moduleSchedulePayload($jbs_module),
            ),
        ]);
    }
}
