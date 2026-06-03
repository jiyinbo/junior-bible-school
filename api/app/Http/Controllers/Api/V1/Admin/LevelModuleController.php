<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\JbsLevel;
use App\Models\JbsModule;
use App\Models\JbsSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LevelModuleController extends Controller
{
    public function storeLevel(Request $request, JbsSession $jbs_session): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'placement_group' => ['nullable', 'string', 'max:40', 'in:basic_10_12,basic_teens,advanced,teens_masterclass'],
            'registration_prefix' => ['required', 'string', 'max:255'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'min_attendance_days' => ['nullable', 'integer', 'min:0', 'max:366'],
        ]);

        $level = $jbs_session->levels()->create([
            'name' => $data['name'],
            'placement_group' => $data['placement_group'] ?? null,
            'registration_prefix' => $data['registration_prefix'],
            'next_sequence' => 0,
            'sort_order' => $data['sort_order'] ?? 0,
            'min_attendance_days' => $data['min_attendance_days'] ?? null,
        ]);

        $this->audit()->created($request, 'level.created', $level, ['session_id' => $jbs_session->id]);

        return response()->json(['data' => $level], 201);
    }

    public function storeModule(Request $request, JbsLevel $jbs_level): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:32'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $module = $jbs_level->modules()->create([
            'name' => trim($data['name']),
            'code' => $this->normalizeCode($data['code'] ?? null),
            'sort_order' => $data['sort_order'] ?? 0,
        ]);

        $this->audit()->created($request, 'module.created', $module, ['level_id' => $jbs_level->id]);

        return response()->json(['data' => $module->load('test')], 201);
    }

    public function updateLevel(Request $request, JbsLevel $jbs_level): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'placement_group' => ['nullable', 'string', 'max:40', 'in:basic_10_12,basic_teens,advanced,teens_masterclass'],
            'registration_prefix' => ['sometimes', 'string', 'max:32'],
        ]);

        if (isset($data['registration_prefix'])) {
            $data['registration_prefix'] = trim($data['registration_prefix']);
        }

        $keys = array_keys($data);
        $old = $this->audit()->snapshot($jbs_level, $keys);
        $jbs_level->update($data);
        $fresh = $jbs_level->fresh();
        $this->audit()->updated($request, 'level.updated', $fresh, $old, $this->audit()->snapshot($fresh, $keys));

        return response()->json(['data' => $fresh]);
    }

    public function updateModule(Request $request, JbsModule $jbs_module): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'code' => ['sometimes', 'nullable', 'string', 'max:32'],
        ]);

        $payload = [];
        if (array_key_exists('name', $data)) {
            $payload['name'] = trim($data['name']);
        }
        if (array_key_exists('code', $data)) {
            $payload['code'] = $this->normalizeCode($data['code']);
        }

        $keys = array_keys($payload);
        $old = $this->audit()->snapshot($jbs_module, $keys);
        $jbs_module->update($payload);
        $fresh = $jbs_module->fresh();
        $this->audit()->updated($request, 'module.updated', $fresh, $old, $this->audit()->snapshot($fresh, $keys));

        return response()->json(['data' => $fresh]);
    }

    public function destroyModule(Request $request, JbsModule $jbs_module): JsonResponse
    {
        $snapshot = $this->audit()->snapshot($jbs_module, ['id', 'jbs_level_id', 'name', 'code', 'sort_order']);
        $label = $jbs_module->name;
        $levelId = $jbs_module->jbs_level_id;

        $jbs_module->delete();

        $this->audit()->record(
            'module.deleted',
            $request,
            subject: null,
            subjectLabel: $label,
            oldValues: $snapshot,
            metadata: ['level_id' => $levelId],
        );

        return response()->json(['message' => 'Module deleted.']);
    }

    private function normalizeCode(?string $code): ?string
    {
        if ($code === null) {
            return null;
        }
        $trimmed = trim($code);

        return $trimmed === '' ? null : $trimmed;
    }
}
