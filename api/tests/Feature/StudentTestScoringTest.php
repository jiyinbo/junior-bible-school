<?php

namespace Tests\Feature;

use App\Models\JbsLevel;
use App\Models\JbsModule;
use App\Models\JbsModuleScoreOutcome;
use App\Models\JbsQuestion;
use App\Models\JbsSession;
use App\Models\JbsStudentRegistration;
use App\Models\JbsTest;
use App\Services\JbsStudentPortalPinService;
use App\Services\JbsTestLayoutService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentTestScoringTest extends TestCase
{
    use RefreshDatabase;

    private const PORTAL_PIN = '1234';

    private function studentAuth(): array
    {
        return [
            'registration_number' => 'BCC/0001',
            'pin' => self::PORTAL_PIN,
        ];
    }

    private function openTestWithQuestion(array $correctIndices): array
    {
        $session = JbsSession::query()->create([
            'name' => 'Summer 2026',
            'slug' => 'summer-2026',
            'is_past' => false,
        ]);

        $level = JbsLevel::query()->create([
            'jbs_session_id' => $session->id,
            'name' => 'BCC',
            'registration_prefix' => 'BCC',
            'next_sequence' => 1,
        ]);

        $module = JbsModule::query()->create([
            'jbs_level_id' => $level->id,
            'name' => 'Course One',
            'sort_order' => 0,
        ]);

        $test = $module->test;
        $test->update(['status' => 'open', 'opened_at' => now()]);

        $question = JbsQuestion::query()->create([
            'jbs_test_id' => $test->id,
            'prompt' => 'Sample question',
            'choices' => ['A', 'B', 'C', 'D'],
            'correct_indices' => $correctIndices,
            'position' => 0,
        ]);

        $registration = JbsStudentRegistration::query()->create([
            'jbs_session_id' => $session->id,
            'jbs_level_id' => $level->id,
            'registration_number' => 'BCC/0001',
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
            'email' => 'ada@example.com',
        ]);

        app(JbsStudentPortalPinService::class)->setPin($registration, self::PORTAL_PIN);

        return [$test, $question];
    }

    private function registration(): JbsStudentRegistration
    {
        $registration = JbsStudentRegistration::query()
            ->where('registration_number', 'BCC/0001')
            ->first();

        $this->assertNotNull($registration);

        return $registration;
    }

    /**
     * @param  int|list<int>  $canonical
     */
    private function displayAnswer(JbsTest $test, JbsQuestion $question, int|array $canonical): int|array
    {
        $layout = app(JbsTestLayoutService::class)->buildLayout(
            $test,
            $this->registration(),
            $test->questions()->orderBy('position')->get(),
        );
        $permutation = $layout['choice_permutations'][(string) $question->id];

        if (is_array($canonical)) {
            $display = [];
            foreach ($canonical as $canonicalIndex) {
                $displayIndex = array_search($canonicalIndex, $permutation, true);
                $this->assertNotFalse($displayIndex);
                $display[] = $displayIndex;
            }

            sort($display);

            return $display;
        }

        $displayIndex = array_search($canonical, $permutation, true);
        $this->assertNotFalse($displayIndex);

        return $displayIndex;
    }

    private function assertSubmitResponseHidesScores(\Illuminate\Testing\TestResponse $response): void
    {
        $response
            ->assertOk()
            ->assertJsonPath('data.module_name', 'Course One')
            ->assertJsonStructure(['data' => ['module_name', 'submitted_at']]);

        $payload = $response->json('data');
        $this->assertArrayNotHasKey('score', $payload);
        $this->assertArrayNotHasKey('percent', $payload);
        $this->assertArrayNotHasKey('grade_short', $payload);
    }

    private function assertStoredPercent(int $expectedPercent): void
    {
        $outcome = JbsModuleScoreOutcome::query()->first();
        $this->assertNotNull($outcome);
        $this->assertSame($expectedPercent, (int) round(100 * (float) $outcome->score / (float) $outcome->max_score));
    }

    public function test_single_correct_answer_accepts_one_choice(): void
    {
        [$test, $question] = $this->openTestWithQuestion([2]);

        $this->postJson("/api/v1/student/tests/{$test->id}/questions", $this->studentAuth())
            ->assertOk()
            ->assertJsonPath('data.already_submitted', false)
            ->assertJsonPath('data.questions.0.selection_mode', 'single');

        $this->assertSubmitResponseHidesScores($this->postJson("/api/v1/student/tests/{$test->id}/submit", array_merge($this->studentAuth(), [
            'answers' => [(string) $question->id => $this->displayAnswer($test, $question, 2)],
        ])));
        $this->assertStoredPercent(100);
    }

    public function test_multiple_correct_requires_exact_set(): void
    {
        [$test, $question] = $this->openTestWithQuestion([1, 2]);

        $this->postJson("/api/v1/student/tests/{$test->id}/questions", $this->studentAuth())
            ->assertOk()
            ->assertJsonPath('data.already_submitted', false)
            ->assertJsonPath('data.questions.0.selection_mode', 'multiple');

        $this->assertSubmitResponseHidesScores($this->postJson("/api/v1/student/tests/{$test->id}/submit", array_merge($this->studentAuth(), [
            'answers' => [(string) $question->id => $this->displayAnswer($test, $question, [1, 2])],
        ])));
        $this->assertStoredPercent(100);
    }

    public function test_score_is_rounded_to_nearest_whole_number(): void
    {
        [$test] = $this->openTestWithQuestion([0]);

        JbsQuestion::query()->create([
            'jbs_test_id' => $test->id,
            'prompt' => 'Second question',
            'choices' => ['A', 'B'],
            'correct_indices' => [0],
            'position' => 1,
        ]);

        JbsQuestion::query()->create([
            'jbs_test_id' => $test->id,
            'prompt' => 'Third question',
            'choices' => ['A', 'B'],
            'correct_indices' => [0],
            'position' => 2,
        ]);

        $questions = $test->questions()->orderBy('position')->get();
        $answers = [];
        foreach ($questions as $i => $q) {
            $answers[(string) $q->id] = $this->displayAnswer($test, $q, $i === 0 ? 0 : 1);
        }

        $this->assertSubmitResponseHidesScores($this->postJson("/api/v1/student/tests/{$test->id}/submit", array_merge($this->studentAuth(), [
            'answers' => $answers,
        ])));
        $this->assertStoredPercent(33);
    }

    public function test_multiple_correct_partial_selection_is_wrong(): void
    {
        [$test, $question] = $this->openTestWithQuestion([1, 2]);

        $this->assertSubmitResponseHidesScores($this->postJson("/api/v1/student/tests/{$test->id}/submit", array_merge($this->studentAuth(), [
            'answers' => [(string) $question->id => $this->displayAnswer($test, $question, [2])],
        ])));
        $this->assertStoredPercent(0);
    }

    public function test_student_cannot_submit_same_test_twice(): void
    {
        [$test, $question] = $this->openTestWithQuestion([2]);

        $this->postJson("/api/v1/student/tests/{$test->id}/submit", array_merge($this->studentAuth(), [
            'answers' => [(string) $question->id => $this->displayAnswer($test, $question, 2)],
        ]))->assertOk();

        $this->postJson("/api/v1/student/tests/{$test->id}/submit", array_merge($this->studentAuth(), [
            'answers' => [(string) $question->id => $this->displayAnswer($test, $question, 2)],
        ]))->assertStatus(409);
    }

    public function test_lookup_excludes_completed_tests_from_open_list(): void
    {
        [$test, $question] = $this->openTestWithQuestion([2]);

        $this->postJson("/api/v1/student/tests/{$test->id}/submit", array_merge($this->studentAuth(), [
            'answers' => [(string) $question->id => $this->displayAnswer($test, $question, 2)],
        ]))->assertOk();

        $response = $this->postJson('/api/v1/student/lookup', $this->studentAuth())->assertOk();

        $response
            ->assertJsonPath('data.open_tests', [])
            ->assertJsonPath('data.completed_tests.0.test_id', $test->id)
            ->assertJsonPath('data.progress.tests_taken', 1);

        $completed = $response->json('data.completed_tests.0');
        $this->assertArrayNotHasKey('score', $completed);
        $this->assertArrayNotHasKey('percent', $completed);
    }

    public function test_student_result_after_submit_does_not_expose_scores(): void
    {
        [$test, $question] = $this->openTestWithQuestion([2]);

        $this->postJson("/api/v1/student/tests/{$test->id}/submit", array_merge($this->studentAuth(), [
            'answers' => [(string) $question->id => $this->displayAnswer($test, $question, 2)],
        ]))->assertOk();

        $test->update(['status' => 'closed', 'closed_at' => now()]);

        $response = $this->postJson("/api/v1/student/tests/{$test->id}/questions", $this->studentAuth())
            ->assertOk()
            ->assertJsonPath('data.already_submitted', true);

        $result = $response->json('data.result');
        $this->assertSame('Course One', $result['module_name']);
        $this->assertArrayNotHasKey('score', $result);
    }

    public function test_questions_endpoint_returns_existing_result_without_allowing_retake(): void
    {
        [$test, $question] = $this->openTestWithQuestion([2]);

        $this->postJson("/api/v1/student/tests/{$test->id}/submit", array_merge($this->studentAuth(), [
            'answers' => [(string) $question->id => $this->displayAnswer($test, $question, 2)],
        ]))->assertOk();

        $response = $this->postJson("/api/v1/student/tests/{$test->id}/questions", $this->studentAuth())
            ->assertOk()
            ->assertJsonPath('data.already_submitted', true)
            ->assertJsonPath('data.questions', []);

        $this->assertArrayNotHasKey('score', $response->json('data.result'));
    }

    public function test_expired_test_closes_automatically_and_rejects_new_attempts(): void
    {
        [$test] = $this->openTestWithQuestion([0]);
        $test->update([
            'duration_minutes' => 10,
            'opened_at' => now()->subMinutes(11),
        ]);

        $this->postJson("/api/v1/student/tests/{$test->id}/questions", $this->studentAuth())->assertStatus(403);

        $test->refresh();
        $this->assertSame('closed', $test->status);
        $this->assertNotNull($test->closed_at);
    }

    public function test_open_test_includes_remaining_time(): void
    {
        [$test] = $this->openTestWithQuestion([0]);
        $test->update([
            'duration_minutes' => 10,
            'opened_at' => now()->subMinutes(2),
        ]);

        $this->postJson("/api/v1/student/tests/{$test->id}/questions", $this->studentAuth())
            ->assertOk()
            ->assertJsonPath('data.duration_minutes', 10)
            ->assertJsonStructure(['data' => ['closes_at', 'remaining_seconds', 'server_time']]);
    }

    public function test_student_portal_progress_hides_scores(): void
    {
        [$test, $question] = $this->openTestWithQuestion([2]);

        $this->postJson("/api/v1/student/tests/{$test->id}/submit", array_merge($this->studentAuth(), [
            'answers' => [(string) $question->id => $this->displayAnswer($test, $question, 2)],
        ]))->assertOk();

        $progress = $this->postJson('/api/v1/student/lookup', $this->studentAuth())
            ->assertOk()
            ->json('data.progress');

        $this->assertSame(1, $progress['tests_taken']);
        $this->assertArrayNotHasKey('overall_percent', $progress);
        $this->assertArrayNotHasKey('tests_passed', $progress);
        $this->assertFalse($progress['graduation_pending'] ?? true);
        $this->assertTrue($progress['modules'][0]['test_taken']);
        $this->assertArrayNotHasKey('score', $progress['modules'][0]);
        $this->assertArrayNotHasKey('percent', $progress['modules'][0]);
    }
}
