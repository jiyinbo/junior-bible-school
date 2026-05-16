<?php

namespace App\Http\Controllers\Api\V1\Staff;

use App\Http\Controllers\Controller;
use App\Models\JbsAttendanceLog;
use App\Models\JbsSession;
use App\Models\JbsStudentRegistration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function status(): JsonResponse
    {
        $ongoing = JbsSession::query()
            ->orderByDesc('id')
            ->get()
            ->filter(fn (JbsSession $s) => $s->isSessionRunning())
            ->values();

        return response()->json([
            'data' => [
                'can_record' => $ongoing->isNotEmpty(),
                'ongoing_sessions' => $ongoing->map(fn (JbsSession $s) => [
                    'id' => $s->id,
                    'name' => $s->name,
                    'session_starts_at' => $s->session_starts_at,
                    'session_ends_at' => $s->session_ends_at,
                ]),
            ],
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'jbs_session_id' => ['nullable', 'integer', 'exists:jbs_sessions,id'],
            'jbs_level_id' => ['nullable', 'integer', 'exists:jbs_levels,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $query = JbsAttendanceLog::query()->with(['registration.session', 'registration.level', 'recordedBy']);

        if (! empty($data['jbs_session_id'])) {
            $query->whereHas('registration', fn ($q) => $q->where('jbs_session_id', $data['jbs_session_id']));
        }
        if (! empty($data['jbs_level_id'])) {
            $query->whereHas('registration', fn ($q) => $q->where('jbs_level_id', $data['jbs_level_id']));
        }
        if (! empty($data['from'])) {
            $query->whereDate('attended_on', '>=', $data['from']);
        }
        if (! empty($data['to'])) {
            $query->whereDate('attended_on', '<=', $data['to']);
        }

        $rows = $query->orderByDesc('recorded_at')->orderByDesc('id')->limit(500)->get();

        return response()->json([
            'data' => $rows->map(fn (JbsAttendanceLog $l) => [
                'id' => $l->id,
                'attended_on' => $l->attended_on->toDateString(),
                'recorded_at' => ($l->recorded_at ?? $l->created_at)->toIso8601String(),
                'registration_number' => $l->registration->registration_number,
                'student_name' => $l->registration->fullName(),
                'session' => $l->registration->session->name,
                'level' => $l->registration->level->name,
                'recorded_by' => $l->recordedBy->name,
            ]),
        ]);
    }

    public function scan(Request $request): JsonResponse
    {
        $data = $request->validate([
            'registration_number' => ['required', 'string', 'max:191'],
        ]);

        $reg = JbsStudentRegistration::query()
            ->where('registration_number', trim($data['registration_number']))
            ->with('session')
            ->firstOrFail();

        $session = $reg->session;

        if (! JbsSession::query()->get()->contains(fn (JbsSession $s) => $s->isSessionRunning())) {
            return response()->json([
                'message' => 'There is no programme session running right now. Attendance cannot be recorded.',
            ], 422);
        }

        if (! $session->isSessionRunning()) {
            return response()->json([
                'message' => 'This student\'s session is not running today. Attendance cannot be recorded.',
            ], 422);
        }

        $now = now();
        $date = $now->toDateString();

        $log = JbsAttendanceLog::query()->firstOrCreate(
            [
                'jbs_student_registration_id' => $reg->id,
                'attended_on' => $date,
            ],
            [
                'recorded_at' => $now,
                'recorded_by_user_id' => $request->user()->id,
            ],
        );

        if ($log->wasRecentlyCreated) {
            $this->audit()->record(
                'attendance.recorded',
                $request,
                $reg,
                metadata: [
                    'attended_on' => $date,
                    'attendance_log_id' => $log->id,
                ],
            );

            return response()->json([
                'message' => 'Attendance recorded.',
                'data' => [
                    'attended_on' => $date,
                    'recorded_at' => $log->recorded_at?->toIso8601String() ?? $now->toIso8601String(),
                    'student_name' => $reg->fullName(),
                ],
            ], 201);
        }

        return response()->json([
            'message' => 'Attendance already logged for today.',
            'data' => [
                'attended_on' => $date,
                'recorded_at' => ($log->recorded_at ?? $log->created_at)->toIso8601String(),
                'student_name' => $reg->fullName(),
            ],
        ]);
    }

    public function sessionsIndex(): JsonResponse
    {
        return response()->json([
            'data' => JbsSession::query()->orderByDesc('id')->get([
                'id', 'name', 'slug', 'is_past', 'session_starts_at', 'session_ends_at',
            ]),
        ]);
    }
}
