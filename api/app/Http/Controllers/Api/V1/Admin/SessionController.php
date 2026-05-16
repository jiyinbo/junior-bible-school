<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\JbsModule;
use App\Models\JbsSession;
use App\Services\JbsModuleScheduleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SessionController extends Controller
{
    public function __construct(
        private JbsModuleScheduleService $schedule,
    ) {}
    public function index(): JsonResponse
    {
        return response()->json(['data' => JbsSession::query()->orderByDesc('id')->get()]);
    }

    public function show(JbsSession $jbs_session): JsonResponse
    {
        $jbs_session->load([
            'levels.modules.assignment.teacher',
            'levels.modules.test',
        ]);

        return response()->json([
            'data' => [
                'id' => $jbs_session->id,
                'name' => $jbs_session->name,
                'slug' => $jbs_session->slug,
                'registration_opens_at' => $jbs_session->registration_opens_at,
                'registration_closes_at' => $jbs_session->registration_closes_at,
                'session_starts_at' => $jbs_session->session_starts_at,
                'session_ends_at' => $jbs_session->session_ends_at,
                'is_past' => $jbs_session->is_past,
                'levels' => $jbs_session->levels->map(fn ($level) => [
                    'id' => $level->id,
                    'name' => $level->name,
                    'placement_group' => $level->placement_group,
                    'registration_prefix' => $level->registration_prefix,
                    'sort_order' => $level->sort_order,
                    'modules' => $level->modules->map(fn (JbsModule $mod) => array_merge(
                        [
                            'id' => $mod->id,
                            'name' => $mod->name,
                            'sort_order' => $mod->sort_order,
                            'test' => $mod->test ? [
                                'id' => $mod->test->id,
                                'status' => $mod->test->status,
                            ] : null,
                            'assigned_teacher' => $mod->assignment?->teacher ? [
                                'id' => $mod->assignment->teacher->id,
                                'name' => $mod->assignment->teacher->name,
                                'email' => $mod->assignment->teacher->email,
                            ] : null,
                        ],
                        $this->schedule->moduleSchedulePayload($mod),
                    )),
                ]),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'registration_opens_at' => ['nullable', 'date'],
            'registration_closes_at' => ['nullable', 'date', 'after_or_equal:registration_opens_at'],
            'session_starts_at' => ['nullable', 'date'],
            'session_ends_at' => ['nullable', 'date', 'after_or_equal:session_starts_at'],
            'is_past' => ['sometimes', 'boolean'],
        ]);

        $slug = $data['slug'] ?? Str::slug($data['name']).'-'.Str::random(4);

        $session = JbsSession::query()->create([
            'name' => $data['name'],
            'slug' => $slug,
            'registration_opens_at' => $data['registration_opens_at'] ?? null,
            'registration_closes_at' => $data['registration_closes_at'] ?? null,
            'session_starts_at' => $data['session_starts_at'] ?? null,
            'session_ends_at' => $data['session_ends_at'] ?? null,
            'is_past' => $data['is_past'] ?? false,
        ]);

        $this->audit()->created($request, 'session.created', $session);

        return response()->json(['data' => $session], 201);
    }

    public function update(Request $request, JbsSession $jbs_session): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255', 'unique:jbs_sessions,slug,'.$jbs_session->id],
            'registration_opens_at' => ['nullable', 'date'],
            'registration_closes_at' => ['nullable', 'date'],
            'session_starts_at' => ['nullable', 'date'],
            'session_ends_at' => ['nullable', 'date'],
            'is_past' => ['sometimes', 'boolean'],
        ]);

        $keys = array_keys($data);
        $old = $this->audit()->snapshot($jbs_session, $keys);
        $jbs_session->update($data);
        $fresh = $jbs_session->fresh();
        $this->audit()->updated($request, 'session.updated', $fresh, $old, $this->audit()->snapshot($fresh, $keys));

        return response()->json(['data' => $fresh]);
    }
}
