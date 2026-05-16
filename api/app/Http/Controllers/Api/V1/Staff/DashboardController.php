<?php

namespace App\Http\Controllers\Api\V1\Staff;

use App\Http\Controllers\Controller;
use App\Services\JbsDashboardStatsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(
        private JbsDashboardStatsService $stats,
    ) {}

    public function stats(Request $request): JsonResponse
    {
        $data = $request->validate([
            'jbs_session_id' => ['nullable', 'integer', 'exists:jbs_sessions,id'],
        ]);

        $user = $request->user();
        abort_unless($user, 401);

        $payload = $user->isAdmin()
            ? $this->stats->adminStats($data['jbs_session_id'] ?? null)
            : $this->stats->teacherStats($user->id, $data['jbs_session_id'] ?? null);

        return response()->json(['data' => $payload]);
    }
}
