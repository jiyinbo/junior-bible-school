<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\JbsAttempt;
use App\Models\JbsStudentRegistration;
use App\Services\JbsGradingService;
use App\Services\JbsModuleScheduleService;
use App\Services\JbsStudentProgressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentLookupController extends Controller
{
    public function __construct(
        private JbsStudentProgressService $progress,
        private JbsModuleScheduleService $schedule,
        private JbsGradingService $grading,
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
                $score = (int) round((float) $attempt->score);
                $maxScore = (int) round((float) $attempt->max_score);
                $grade = $this->grading->gradeForScores((float) $attempt->score, (float) $attempt->max_score);
                $completedTests[] = [
                    'test_id' => $test->id,
                    'module_id' => $module->id,
                    'module_name' => $module->name,
                    'score' => $score,
                    'max_score' => $maxScore,
                    'percent' => $grade['percent'],
                    'passed' => $grade['passed'],
                    'submitted_at' => $attempt->submitted_at?->toIso8601String(),
                ];

                continue;
            }

            if ($test->isOpen()) {
                $openTests[] = [
                    'test_id' => $test->id,
                    'module_id' => $module->id,
                    'module_name' => $module->name,
                ];
            }
        }

        $summary = $this->progress->summary($reg);
        $completed = $summary['level_completed'];
        $session = $reg->session;
        $programmePhase = $this->schedule->programmePhase($session);
        $timetable = $this->schedule->timetableForRegistration($reg);

        return response()->json([
            'data' => [
                'registration_number' => $reg->registration_number,
                'full_name' => $reg->fullName(),
                'session_name' => $session->name,
                'level_name' => $reg->level->name,
                'session_starts_at' => $session->session_starts_at,
                'session_ends_at' => $session->session_ends_at,
                'programme_phase' => $programmePhase,
                'open_tests' => $openTests,
                'completed_tests' => $completedTests,
                'timetable' => $timetable,
                'level_completed' => $completed,
                'programme_completed' => $completed,
                'documents_available' => $completed,
                'progress' => $summary,
                'completion_message' => $completed ? null : $this->progress->studentCompletionMessage($reg),
            ],
        ]);
    }
}
