<?php

namespace Tests\Feature;

use App\Models\JbsLevel;
use App\Models\JbsModule;
use App\Models\JbsQuestion;
use App\Models\JbsSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SyncTestQuestionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_sync_questions_with_multiple_correct_choices(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

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

        $response = $this->postJson("/api/v1/admin/modules/{$module->id}/tests/questions", [
            'questions' => [
                [
                    'prompt' => 'Q1',
                    'choices' => ['Opt 1', 'Opt 2', 'Opt 3', 'Opt 4'],
                    'correct_indices' => [1, 2],
                    'position' => 0,
                ],
            ],
        ]);

        $response->assertOk();

        $show = $this->getJson("/api/v1/admin/modules/{$module->id}/tests");
        $show->assertOk()
            ->assertJsonPath('data.module.name', 'Course One')
            ->assertJsonPath('data.level.name', 'BCC')
            ->assertJsonPath('data.session.name', 'Summer 2026');

        $question = JbsQuestion::query()->first();
        $this->assertSame([1, 2], $question->normalizedCorrectIndices());
        $this->assertTrue($question->isAnswerCorrect([1, 2]));
        $this->assertFalse($question->isAnswerCorrect([1]));
        $this->assertFalse($question->isAnswerCorrect(0));
    }
}
