<?php

namespace Tests\Feature;

use App\Models\JbsLevel;
use App\Models\JbsModule;
use App\Models\JbsSession;
use App\Models\JbsTest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminModuleDeleteTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_delete_module_from_tier(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $session = JbsSession::query()->create([
            'name' => 'Summer 2026',
            'slug' => 'summer-2026',
            'is_past' => false,
        ]);
        $level = JbsLevel::query()->create([
            'jbs_session_id' => $session->id,
            'name' => 'Basic',
            'registration_prefix' => 'BCC',
            'next_sequence' => 0,
            'sort_order' => 0,
        ]);
        $module = JbsModule::query()->create([
            'jbs_level_id' => $level->id,
            'name' => 'Wrong module',
            'sort_order' => 0,
        ]);
        $this->assertNotNull(JbsTest::query()->where('jbs_module_id', $module->id)->first());

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/v1/admin/modules/{$module->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Module deleted.');

        $this->assertDatabaseMissing('jbs_modules', ['id' => $module->id]);
        $this->assertDatabaseMissing('jbs_tests', ['jbs_module_id' => $module->id]);
        $this->assertDatabaseHas('jbs_audit_logs', [
            'action' => 'module.deleted',
            'user_id' => $admin->id,
        ]);
    }
}
