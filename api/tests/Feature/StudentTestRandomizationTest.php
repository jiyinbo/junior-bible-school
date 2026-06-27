<?php

namespace Tests\Feature;

use App\Models\JbsLevel;
use App\Models\JbsModule;
use App\Models\JbsQuestion;
use App\Models\JbsSession;
use App\Models\JbsStudentRegistration;
use App\Services\JbsStudentPortalPinService;
use App\Services\JbsTestLayoutService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentTestRandomizationTest extends TestCase
{
    use RefreshDatabase;

    private const PORTAL_PIN = '1234';

    /**
     * @return array{0: \App\Models\JbsTest, 1: JbsStudentRegistration, 2: JbsStudentRegistration, 3: \Illuminate\Support\Collection<int, JbsQuestion>}
     */
    private function openTestWithTwoStudents(): array
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

        JbsQuestion::query()->create([
            'jbs_test_id' => $test->id,
            'prompt' => 'First question',
            'choices' => ['A1', 'A2', 'A3', 'A4'],
            'correct_indices' => [2],
            'position' => 0,
        ]);

        JbsQuestion::query()->create([
            'jbs_test_id' => $test->id,
            'prompt' => 'Second question',
            'choices' => ['B1', 'B2', 'B3', 'B4'],
            'correct_indices' => [1],
            'position' => 1,
        ]);

        $registrationA = JbsStudentRegistration::query()->create([
            'jbs_session_id' => $session->id,
            'jbs_level_id' => $level->id,
            'registration_number' => 'BCC/0001',
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
            'email' => 'ada@example.com',
        ]);

        $registrationB = JbsStudentRegistration::query()->create([
            'jbs_session_id' => $session->id,
            'jbs_level_id' => $level->id,
            'registration_number' => 'BCC/0002',
            'first_name' => 'Grace',
            'last_name' => 'Hopper',
            'email' => 'grace@example.com',
        ]);

        $pinService = app(JbsStudentPortalPinService::class);
        $pinService->setPin($registrationA, self::PORTAL_PIN);
        $pinService->setPin($registrationB, self::PORTAL_PIN);

        $questions = $test->questions()->orderBy('position')->get();

        return [$test, $registrationA, $registrationB, $questions];
    }

    private function studentAuth(string $registrationNumber): array
    {
        return [
            'registration_number' => $registrationNumber,
            'pin' => self::PORTAL_PIN,
        ];
    }

    /**
     * @param  int|list<int>  $canonical
     */
    private function displayAnswer(
        \App\Models\JbsTest $test,
        JbsStudentRegistration $registration,
        JbsQuestion $question,
        int|array $canonical,
    ): int|array {
        $layout = app(JbsTestLayoutService::class)->buildLayout(
            $test,
            $registration,
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

    public function test_different_registrations_receive_different_layout(): void
    {
        [$test, , ,] = $this->openTestWithTwoStudents();

        $responseA = $this->postJson(
            "/api/v1/student/tests/{$test->id}/questions",
            $this->studentAuth('BCC/0001'),
        )->assertOk()->json('data.questions');

        $responseB = $this->postJson(
            "/api/v1/student/tests/{$test->id}/questions",
            $this->studentAuth('BCC/0002'),
        )->assertOk()->json('data.questions');

        $this->assertNotSame($responseA, $responseB);
    }

    public function test_same_registration_receives_stable_layout_on_reload(): void
    {
        [$test] = $this->openTestWithTwoStudents();

        $first = $this->postJson(
            "/api/v1/student/tests/{$test->id}/questions",
            $this->studentAuth('BCC/0001'),
        )->assertOk()->json('data.questions');

        $second = $this->postJson(
            "/api/v1/student/tests/{$test->id}/questions",
            $this->studentAuth('BCC/0001'),
        )->assertOk()->json('data.questions');

        $this->assertSame($first, $second);
    }

    public function test_submit_accepts_display_indices_and_scores_correctly(): void
    {
        [$test, $registrationA, , $questions] = $this->openTestWithTwoStudents();

        $answers = [];
        foreach ($questions as $question) {
            $answers[(string) $question->id] = $this->displayAnswer(
                $test,
                $registrationA,
                $question,
                $question->correct_indices,
            );
        }

        $this->postJson(
            "/api/v1/student/tests/{$test->id}/submit",
            array_merge($this->studentAuth('BCC/0001'), ['answers' => $answers]),
        )
            ->assertOk()
            ->assertJsonPath('data.correct_count', $questions->count());
    }
}
