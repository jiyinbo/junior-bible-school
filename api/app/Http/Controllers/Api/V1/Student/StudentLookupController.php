<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\JbsAttempt;
use App\Models\JbsStudentRegistration;
use App\Services\JbsStudentProgressService;
use App\Services\JbsTimetableGridService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentLookupController extends Controller
{
    public function __construct(
        private JbsStudentProgressService $progress,
        private JbsTimetableGridService $timetableGrid,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate([
            'registration_number' => ['required', 'string', 'max:191'],
        ]);

        $reg = JbsStudentRegistration::query()
            ->where('registration_number', trim($data['registration_number']))
            ->with(['session', 'level.modules.test', 'level.modules.assignment.teacher'])
            ->first();

        if (! $reg) {
            return response()->json(['message' => 'Registration not found.'], 404);
        }

        $submittedByTestId = JbsAttempt::query()
            ->where('jbs_student_registration_id', $reg->id)
            ->whereNotNull('submitted_at')
            ->get()
            ->keyBy('jbs_test_id');

        $openTests = [];
        $completedTests = [];
        foreach ($reg->level->modules as $module) {
            $test = $module->test;
            if (! $test || ! $test->questions()->exists()) {
                continue;
            }

            $attempt = $submittedByTestId->get($test->id);
            if ($attempt) {
                $completedTests[] = [
                    'test_id' => $test->id,
                    'module_id' => $module->id,
                    'module_name' => $module->name,
                    'submitted_at' => $attempt->submitted_at?->toIso8601String(),
                ];

                continue;
            }

            if ($test->refreshAndCloseIfExpired()->isOpen()) {
                $openTests[] = [
                    'test_id' => $test->id,
                    'module_id' => $module->id,
                    'module_name' => $module->name,
                    'duration_minutes' => $test->duration_minutes,
                    'remaining_seconds' => $test->remainingSeconds(),
                ];
            }
        }

        $summary = $this->progress->studentPortalSummary($reg);
        $completed = $summary['level_completed'];
        $session = $reg->session;
        $this->timetableGrid->ensureDays($session);
        $timetableGrid = $this->timetableGrid->gridForLevel($reg->level);

        return response()->json([
            'data' => [
                'registration_number' => $reg->registration_number,
                'full_name' => $reg->fullName(),
                'session_name' => $session->name,
                'level_name' => $reg->level->name,
                'session_starts_at' => $session->session_starts_at,
                'session_ends_at' => $session->session_ends_at,
                'programme_phase' => $session->programmePhase(),
                'open_tests' => $openTests,
                'completed_tests' => $completedTests,
                'timetable_grid' => $timetableGrid,
                'level_completed' => $completed,
                'programme_completed' => $completed,
                'documents_available' => $completed,
                'progress' => $summary,
                'completion_message' => $completed ? null : $this->progress->studentCompletionMessage($reg),
            ],
        ]);
    }
}
