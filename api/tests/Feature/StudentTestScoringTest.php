<?php

namespace Tests\Feature;

use App\Models\JbsLevel;
use App\Models\JbsModule;
use App\Models\JbsQuestion;
use App\Models\JbsSession;
use App\Models\JbsStudentRegistration;
use App\Models\JbsTest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentTestScoringTest extends TestCase
{
    use RefreshDatabase;

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

        JbsStudentRegistration::query()->create([
            'jbs_session_id' => $session->id,
            'jbs_level_id' => $level->id,
            'registration_number' => 'BCC/0001',
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
            'email' => 'ada@example.com',
        ]);

        return [$test, $question];
    }

    public function test_single_correct_answer_accepts_one_choice(): void
    {
        [$test, $question] = $this->openTestWithQuestion([2]);

        $this->postJson("/api/v1/student/tests/{$test->id}/questions", [
            'registration_number' => 'BCC/0001',
        ])
            ->assertOk()
            ->assertJsonPath('data.already_submitted', false)
            ->assertJsonPath('data.questions.0.selection_mode', 'single');

        $this->postJson("/api/v1/student/tests/{$test->id}/submit", [
            'registration_number' => 'BCC/0001',
            'answers' => [(string) $question->id => 2],
        ])->assertOk()->assertJsonPath('data.score', 100);
    }

    public function test_multiple_correct_requires_exact_set(): void
    {
        [$test, $question] = $this->openTestWithQuestion([1, 2]);

        $this->postJson("/api/v1/student/tests/{$test->id}/questions", [
            'registration_number' => 'BCC/0001',
        ])
            ->assertOk()
            ->assertJsonPath('data.already_submitted', false)
            ->assertJsonPath('data.questions.0.selection_mode', 'multiple');

        $this->postJson("/api/v1/student/tests/{$test->id}/submit", [
            'registration_number' => 'BCC/0001',
            'answers' => [(string) $question->id => [1, 2]],
        ])->assertOk()->assertJsonPath('data.score', 100);
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
            $answers[(string) $q->id] = $i === 0 ? 0 : 1;
        }

        $this->postJson("/api/v1/student/tests/{$test->id}/submit", [
            'registration_number' => 'BCC/0001',
            'answers' => $answers,
        ])
            ->assertOk()
            ->assertJsonPath('data.score', 33);
    }

    public function test_multiple_correct_partial_selection_is_wrong(): void
    {
        [$test, $question] = $this->openTestWithQuestion([1, 2]);

        $this->postJson("/api/v1/student/tests/{$test->id}/submit", [
            'registration_number' => 'BCC/0001',
            'answers' => [(string) $question->id => [2]],
        ])->assertOk()->assertJsonPath('data.score', 0);
    }

    public function test_student_cannot_submit_same_test_twice(): void
    {
        [$test, $question] = $this->openTestWithQuestion([2]);

        $this->postJson("/api/v1/student/tests/{$test->id}/submit", [
            'registration_number' => 'BCC/0001',
            'answers' => [(string) $question->id => 2],
        ])->assertOk();

        $this->postJson("/api/v1/student/tests/{$test->id}/submit", [
            'registration_number' => 'BCC/0001',
            'answers' => [(string) $question->id => 2],
        ])->assertStatus(409);
    }

    public function test_lookup_excludes_completed_tests_from_open_list(): void
    {
        [$test, $question] = $this->openTestWithQuestion([2]);

        $this->postJson("/api/v1/student/tests/{$test->id}/submit", [
            'registration_number' => 'BCC/0001',
            'answers' => [(string) $question->id => 2],
        ])->assertOk();

        $this->postJson('/api/v1/student/lookup', [
            'registration_number' => 'BCC/0001',
        ])
            ->assertOk()
            ->assertJsonPath('data.open_tests', [])
            ->assertJsonPath('data.completed_tests.0.test_id', $test->id)
            ->assertJsonPath('data.completed_tests.0.score', 100);
    }

    public function test_student_can_view_score_after_test_is_closed(): void
    {
        [$test, $question] = $this->openTestWithQuestion([2]);

        $this->postJson("/api/v1/student/tests/{$test->id}/submit", [
            'registration_number' => 'BCC/0001',
            'answers' => [(string) $question->id => 2],
        ])->assertOk();

        $test->update(['status' => 'closed', 'closed_at' => now()]);

        $this->postJson("/api/v1/student/tests/{$test->id}/questions", [
            'registration_number' => 'BCC/0001',
        ])
            ->assertOk()
            ->assertJsonPath('data.already_submitted', true)
            ->assertJsonPath('data.result.score', 100);
    }

    public function test_questions_endpoint_returns_existing_result_without_allowing_retake(): void
    {
        [$test, $question] = $this->openTestWithQuestion([2]);

        $this->postJson("/api/v1/student/tests/{$test->id}/submit", [
            'registration_number' => 'BCC/0001',
            'answers' => [(string) $question->id => 2],
        ])->assertOk();

        $this->postJson("/api/v1/student/tests/{$test->id}/questions", [
            'registration_number' => 'BCC/0001',
        ])
            ->assertOk()
            ->assertJsonPath('data.already_submitted', true)
            ->assertJsonPath('data.questions', [])
            ->assertJsonPath('data.result.score', 100);
    }
}
