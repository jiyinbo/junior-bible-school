<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\JbsAuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'action' => ['nullable', 'string', 'max:120'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'q' => ['nullable', 'string', 'max:191'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $query = JbsAuditLog::query()->with('user')->orderByDesc('id');

        if (! empty($data['action'])) {
            $query->where('action', $data['action']);
        }
        if (! empty($data['user_id'])) {
            $query->where('user_id', $data['user_id']);
        }
        if (! empty($data['from'])) {
            $query->whereDate('created_at', '>=', $data['from']);
        }
        if (! empty($data['to'])) {
            $query->whereDate('created_at', '<=', $data['to']);
        }
        if (! empty($data['q'])) {
            $term = '%'.trim($data['q']).'%';
            $query->where(function ($sub) use ($term): void {
                $sub->where('subject_label', 'like', $term)
                    ->orWhere('actor_name', 'like', $term)
                    ->orWhere('action', 'like', $term);
            });
        }

        $rows = $query->limit(300)->get();

        return response()->json([
            'data' => $rows->map(fn (JbsAuditLog $log) => [
                'id' => $log->id,
                'created_at' => $log->created_at?->toIso8601String(),
                'action' => $log->action,
                'status' => $log->status,
                'actor_name' => $log->actor_name,
                'user_role' => $log->user_role,
                'user_id' => $log->user_id,
                'subject_label' => $log->subject_label,
                'subject_type' => $log->subject_type ? class_basename($log->subject_type) : null,
                'subject_id' => $log->subject_id,
                'old_values' => $log->old_values,
                'new_values' => $log->new_values,
                'metadata' => $log->metadata,
                'http_method' => $log->http_method,
                'route' => $log->route,
            ]),
        ]);
    }

    public function actions(): JsonResponse
    {
        $actions = JbsAuditLog::query()
            ->select('action')
            ->distinct()
            ->orderBy('action')
            ->pluck('action');

        return response()->json(['data' => $actions]);
    }
}
