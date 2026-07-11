<?php

namespace Tests\Feature;

use App\Models\JbsLevel;
use App\Models\JbsModule;
use App\Models\JbsQuestion;
use App\Models\JbsSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SessionShowTestSetupStatusTest extends TestCase
{
    use RefreshDatabase;

    public function test_session_show_reflects_saved_test_questions(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $session = JbsSession::query()->create([
            'name' => 'Summer 2026',
            'slug' => 'summer-2026-sync',
            'is_past' => false,
        ]);
        $level = JbsLevel::query()->create([
            'jbs_session_id' => $session->id,
            'name' => 'BCC',
            'registration_prefix' => 'BCC',
        ]);
        $module = JbsModule::query()->create([
            'jbs_level_id' => $level->id,
            'name' => 'Course One',
            'sort_order' => 0,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/admin/modules/'.$module->id.'/tests/questions', [
                'questions' => [
                    [
                        'prompt' => 'Who created the heavens and the earth?',
                        'choices' => ['God', 'Man'],
                        'correct_indices' => [0],
                        'position' => 0,
                    ],
                ],
                'duration_minutes' => 10,
            ])
            ->assertOk();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/sessions/'.$session->id)
            ->assertOk()
            ->assertJsonPath('data.levels.0.modules.0.test.status', 'draft')
            ->assertJsonPath('data.levels.0.modules.0.test.question_count', 1);
    }

    public function test_session_show_includes_test_question_counts(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $session = JbsSession::query()->create([
            'name' => 'Summer 2026',
            'slug' => 'summer-2026',
            'is_past' => false,
        ]);
        $level = JbsLevel::query()->create([
            'jbs_session_id' => $session->id,
            'name' => 'BCC',
            'registration_prefix' => 'BCC',
        ]);

        $emptyModule = JbsModule::query()->create([
            'jbs_level_id' => $level->id,
            'name' => 'Empty Module',
            'sort_order' => 0,
        ]);
        $readyModule = JbsModule::query()->create([
            'jbs_level_id' => $level->id,
            'name' => 'Ready Module',
            'sort_order' => 1,
        ]);

        JbsQuestion::query()->create([
            'jbs_test_id' => $readyModule->test->id,
            'prompt' => 'Sample question',
            'choices' => ['A', 'B'],
            'correct_indices' => [0],
            'position' => 0,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/sessions/'.$session->id)
            ->assertOk()
            ->assertJsonPath('data.levels.0.modules.0.name', 'Empty Module')
            ->assertJsonPath('data.levels.0.modules.0.test.question_count', 0)
            ->assertJsonPath('data.levels.0.modules.1.name', 'Ready Module')
            ->assertJsonPath('data.levels.0.modules.1.test.question_count', 1);
    }
}
