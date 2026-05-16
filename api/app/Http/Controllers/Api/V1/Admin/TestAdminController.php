<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\JbsModule;
use App\Models\JbsQuestion;
use App\Models\JbsTest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class TestAdminController extends Controller
{
    public function show(Request $request, JbsModule $jbs_module): JsonResponse
    {
        abort_unless($request->user()->managesModule($jbs_module), 403);

        $jbs_module->loadMissing('level.session');
        $test = $jbs_module->test;

        if ($test) {
            $test->load('questions');
        }

        return response()->json([
            'data' => [
                ...$this->moduleContextPayload($jbs_module),
                'test' => $test ? [
                    'id' => $test->id,
                    'status' => $test->status,
                    'opened_at' => $test->opened_at,
                    'closed_at' => $test->closed_at,
                    'questions' => $test->questions->map(fn (JbsQuestion $q) => [
                        'id' => $q->id,
                        'prompt' => $q->prompt,
                        'choices' => $q->choices,
                        'correct_indices' => $q->normalizedCorrectIndices(),
                        'position' => $q->position,
                    ]),
                ] : null,
            ],
        ]);
    }

    /**
     * @return array{
     *     module: array{id: int, name: string},
     *     level: array{id: int, name: string, registration_prefix: string},
     *     session: array{id: int, name: string}
     * }
     */
    private function moduleContextPayload(JbsModule $jbs_module): array
    {
        $level = $jbs_module->level;
        $session = $level->session;

        return [
            'module' => [
                'id' => $jbs_module->id,
                'name' => $jbs_module->name,
            ],
            'level' => [
                'id' => $level->id,
                'name' => $level->name,
                'registration_prefix' => $level->registration_prefix,
            ],
            'session' => [
                'id' => $session->id,
                'name' => $session->name,
            ],
        ];
    }

    public function open(Request $request, JbsModule $jbs_module): JsonResponse
    {
        abort_unless($request->user()->managesModule($jbs_module), 403);

        $test = $jbs_module->test ?? abort(404, 'Test not found for module.');
        abort_unless($test->questions()->exists(), 422, 'Add questions before opening a test.');

        $old = $this->audit()->snapshot($test, ['status', 'opened_at', 'closed_at']);
        $test->update([
            'status' => 'open',
            'opened_at' => now(),
            'closed_at' => null,
        ]);
        $fresh = $test->fresh();
        $this->audit()->updated($request, 'test.opened', $jbs_module, $old, $this->audit()->snapshot($fresh, ['status', 'opened_at', 'closed_at']));

        return response()->json(['data' => $fresh]);
    }

    public function close(Request $request, JbsModule $jbs_module): JsonResponse
    {
        abort_unless($request->user()->managesModule($jbs_module), 403);

        $test = $jbs_module->test ?? abort(404);
        $old = $this->audit()->snapshot($test, ['status', 'closed_at']);
        $test->update([
            'status' => 'closed',
            'closed_at' => now(),
        ]);
        $fresh = $test->fresh();
        $this->audit()->updated($request, 'test.closed', $jbs_module, $old, $this->audit()->snapshot($fresh, ['status', 'closed_at']));

        return response()->json(['data' => $fresh]);
    }

    public function syncQuestions(Request $request, JbsModule $jbs_module): JsonResponse
    {
        abort_unless($request->user()->managesModule($jbs_module), 403);

        $data = $request->validate([
            'questions' => ['required', 'array', 'min:1'],
            'questions.*.prompt' => ['required', 'string'],
            'questions.*.choices' => ['required', 'array', 'min:2'],
            'questions.*.choices.*' => ['required', 'string'],
            'questions.*.correct_indices' => ['required', 'array', 'min:1'],
            'questions.*.correct_indices.*' => ['required', 'integer', 'min:0'],
            'questions.*.position' => ['sometimes', 'integer', 'min:0'],
        ]);

        $test = $jbs_module->test;
        if (! $test) {
            $test = JbsTest::query()->create([
                'jbs_module_id' => $jbs_module->id,
                'status' => 'draft',
            ]);
        }

        if ($test->status === 'open') {
            return response()->json(['message' => 'Close the test before editing questions.'], 422);
        }

        $questionCount = $test->questions()->count();
        $test->questions()->delete();

        foreach ($data['questions'] as $i => $row) {
            $choiceCount = count($row['choices']);
            $correctIndices = $this->normalizeCorrectIndices($row['correct_indices'], $choiceCount, $i);

            JbsQuestion::query()->create([
                'jbs_test_id' => $test->id,
                'prompt' => $row['prompt'],
                'choices' => $row['choices'],
                'correct_indices' => $correctIndices,
                'position' => $row['position'] ?? $i,
            ]);
        }

        $this->audit()->record(
            'test.questions_synced',
            $request,
            $jbs_module,
            metadata: [
                'test_id' => $test->id,
                'previous_question_count' => $questionCount,
                'new_question_count' => count($data['questions']),
            ],
        );

        return response()->json(['data' => $test->load('questions')]);
    }

    /**
     * @param  list<int>  $indices
     * @return list<int>
     */
    private function normalizeCorrectIndices(array $indices, int $choiceCount, int $questionIndex): array
    {
        $normalized = array_values(array_unique(array_map('intval', $indices)));
        sort($normalized);

        if ($normalized === []) {
            throw ValidationException::withMessages([
                "questions.{$questionIndex}.correct_indices" => ['Mark at least one correct choice.'],
            ]);
        }

        foreach ($normalized as $idx) {
            if ($idx < 0 || $idx >= $choiceCount) {
                throw ValidationException::withMessages([
                    "questions.{$questionIndex}.correct_indices" => ['A correct choice index is out of range.'],
                ]);
            }
        }

        return $normalized;
    }
}
