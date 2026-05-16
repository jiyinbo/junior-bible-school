<?php

namespace App\Http\Controllers\Api\V1\Admin;

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

        return response()->json([
            'data' => $this->stats->adminStats($data['jbs_session_id'] ?? null),
        ]);
    }
}
