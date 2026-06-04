<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\JbsAttempt;
use App\Models\JbsModuleScoreOutcome;
use App\Models\JbsQuestion;
use App\Models\JbsStudentRegistration;
use App\Models\JbsTest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StudentTestController extends Controller
{
    private function resolveRegistration(Request $request): JbsStudentRegistration
    {
        $num = trim((string) $request->input('registration_number'));
        abort_unless($num !== '', 422, 'registration_number required');

        $reg = JbsStudentRegistration::query()
            ->where('registration_number', $num)
            ->with(['level.modules', 'session', 'level'])
            ->first();
        abort_if(! $reg, 404, 'Registration not found.');

        return $reg;
    }

    private function assertTestBelongsToRegistration(JbsTest $test, JbsStudentRegistration $reg): void
    {
        $moduleIds = $reg->level->modules->pluck('id')->all();
        abort_unless(in_array($test->jbs_module_id, $moduleIds, true), 403);
    }

    private function assertTestOpenForTaking(JbsTest $test): void
    {
        $test->refreshAndCloseIfExpired();
        abort_unless($test->isOpen(), 403, 'Test is not open.');
        abort_unless($test->questions()->exists(), 403, 'No questions configured.');
    }

    public function questions(Request $request, JbsTest $jbs_test): JsonResponse
    {
        $reg = $this->resolveRegistration($request);
        $this->assertTestBelongsToRegistration($jbs_test, $reg);
        $jbs_test->load('module');
        $jbs_test->refreshAndCloseIfExpired();

        $existing = JbsAttempt::query()
            ->where('jbs_test_id', $jbs_test->id)
            ->where('jbs_student_registration_id', $reg->id)
            ->whereNotNull('submitted_at')
            ->first();

        if ($existing) {
            return response()->json([
                'data' => $this->testStartPayload($jbs_test, $reg, $existing, [], true),
            ]);
        }

        $this->assertTestOpenForTaking($jbs_test);

        $questions = $jbs_test->questions()->orderBy('position')->get();

        return response()->json([
            'data' => $this->testStartPayload(
                $jbs_test,
                $reg,
                null,
                $questions->map(fn (JbsQuestion $q) => [
                    'id' => $q->id,
                    'prompt' => $q->prompt,
                    'choices' => $q->choices,
                    'position' => $q->position,
                    'selection_mode' => $q->selectionMode(),
                ])->all(),
                false,
            ),
        ]);
    }

    /**
     * @param  list<array<string, mixed>>  $questions
     * @return array<string, mixed>
     */
    private function testStartPayload(
        JbsTest $test,
        JbsStudentRegistration $reg,
        ?JbsAttempt $attempt,
        array $questions,
        bool $alreadySubmitted,
    ): array {
        return [
            'test_id' => $test->id,
            'module_id' => $test->jbs_module_id,
            'module_name' => $test->module->name,
            'session_name' => $reg->session->name,
            'level_name' => $reg->level->name,
            'already_submitted' => $alreadySubmitted,
            'duration_minutes' => $test->duration_minutes,
            'closes_at' => $test->closesAt()?->toIso8601String(),
            'remaining_seconds' => $test->remainingSeconds(),
            'server_time' => now()->toIso8601String(),
            'result' => $attempt ? $this->attemptResult($attempt, $test->module->name) : null,
            'questions' => $questions,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function attemptResult(JbsAttempt $attempt, string $moduleName): array
    {
        return [
            'module_name' => $moduleName,
            'submitted_at' => $attempt->submitted_at?->toIso8601String(),
        ];
    }

    public function submit(Request $request, JbsTest $jbs_test): JsonResponse
    {
        $reg = $this->resolveRegistration($request);
        $this->assertTestBelongsToRegistration($jbs_test, $reg);
        $this->assertTestOpenForTaking($jbs_test);

        $payload = $request->validate([
            'answers' => ['required', 'array'],
        ]);

        $existing = JbsAttempt::query()
            ->where('jbs_test_id', $jbs_test->id)
            ->where('jbs_student_registration_id', $reg->id)
            ->whereNotNull('submitted_at')
            ->exists();

        abort_if($existing, 409, 'Test already submitted.');

        return DB::transaction(function () use ($jbs_test, $reg, $payload): JsonResponse {
            $questions = $jbs_test->questions()->orderBy('position')->get();
            $max = $questions->count();
            $correct = 0;
            $answersOut = [];

            foreach ($questions as $q) {
                $given = $payload['answers'][(string) $q->id] ?? $payload['answers'][$q->id] ?? null;
                $answersOut[(string) $q->id] = $given;
                if ($q->isAnswerCorrect($given)) {
                    $correct++;
                }
            }

            $score = $max > 0 ? (int) round(100 * ($correct / $max)) : 0;
            $maxScore = 100;

            $attempt = JbsAttempt::query()->create([
                'jbs_test_id' => $jbs_test->id,
                'jbs_student_registration_id' => $reg->id,
                'answers' => $answersOut,
                'score' => $score,
                'max_score' => $maxScore,
                'submitted_at' => now(),
            ]);

            JbsModuleScoreOutcome::query()->updateOrCreate(
                [
                    'jbs_student_registration_id' => $reg->id,
                    'jbs_module_id' => $jbs_test->jbs_module_id,
                ],
                [
                    'score' => $score,
                    'max_score' => $maxScore,
                    'source' => 'cbt',
                    'jbs_attempt_id' => $attempt->id,
                    'admin_confirmed_at' => now(),
                    'admin_confirmed_by_user_id' => null,
                ],
            );

            $jbs_test->load('module');

            return response()->json([
                'data' => [
                    ...$this->attemptResult($attempt, $jbs_test->module->name),
                    'correct_count' => $correct,
                    'question_count' => $max,
                    'message' => 'Test submitted successfully.',
                ],
            ]);
        });
    }
}
