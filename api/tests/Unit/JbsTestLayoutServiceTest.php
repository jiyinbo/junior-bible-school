<?php

namespace Tests\Unit;

use App\Models\JbsLevel;
use App\Models\JbsModule;
use App\Models\JbsQuestion;
use App\Models\JbsSession;
use App\Models\JbsStudentRegistration;
use App\Services\JbsTestLayoutService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JbsTestLayoutServiceTest extends TestCase
{
    use RefreshDatabase;

    private JbsTestLayoutService $layout;

    protected function setUp(): void
    {
        parent::setUp();
        $this->layout = app(JbsTestLayoutService::class);
    }

    public function test_shuffle_is_stable_for_same_seed(): void
    {
        $items = [1, 2, 3, 4, 5];

        $this->assertSame(
            $this->layout->shuffle($items, 12345),
            $this->layout->shuffle($items, 12345),
        );
    }

    public function test_shuffle_differs_for_different_seeds(): void
    {
        $items = range(1, 10);

        $this->assertNotSame(
            $this->layout->shuffle($items, 111),
            $this->layout->shuffle($items, 222),
        );
    }

    public function test_build_layout_differs_between_registrations(): void
    {
        [$test, $registrationA, $registrationB, $questions] = $this->fixtureWithTwoRegistrations();

        $layoutA = $this->layout->buildLayout($test, $registrationA, $questions);
        $layoutB = $this->layout->buildLayout($test, $registrationB, $questions);

        $this->assertNotSame($layoutA, $layoutB);
    }

    public function test_remap_display_to_canonical_for_single_and_multiple(): void
    {
        $permutation = [2, 0, 3, 1];

        $this->assertSame(0, $this->layout->remapDisplayToCanonical(1, $permutation));
        $this->assertSame(2, $this->layout->remapDisplayToCanonical(0, $permutation));
        $this->assertSame([1, 2], $this->layout->remapDisplayToCanonical([3, 0], $permutation));
    }

    public function test_present_questions_reorders_choices(): void
    {
        [$test, $registration, , $questions] = $this->fixtureWithTwoRegistrations();
        $layout = $this->layout->buildLayout($test, $registration, $questions);
        $presented = $this->layout->presentQuestions($questions, $layout);

        $first = $presented[0];
        $question = $questions->first();
        $permutation = $layout['choice_permutations'][(string) $question->id];
        $expectedChoices = array_map(
            fn (int $index) => $question->choices[$index],
            $permutation,
        );

        $this->assertSame($expectedChoices, $first['choices']);
    }

    /**
     * @return array{0: \App\Models\JbsTest, 1: JbsStudentRegistration, 2: JbsStudentRegistration, 3: \Illuminate\Support\Collection<int, JbsQuestion>}
     */
    private function fixtureWithTwoRegistrations(): array
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

        JbsQuestion::query()->create([
            'jbs_test_id' => $test->id,
            'prompt' => 'Question one',
            'choices' => ['A', 'B', 'C', 'D'],
            'correct_indices' => [0],
            'position' => 0,
        ]);

        JbsQuestion::query()->create([
            'jbs_test_id' => $test->id,
            'prompt' => 'Question two',
            'choices' => ['W', 'X', 'Y', 'Z'],
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

        $questions = $test->questions()->orderBy('position')->get();

        return [$test, $registrationA, $registrationB, $questions];
    }
}
