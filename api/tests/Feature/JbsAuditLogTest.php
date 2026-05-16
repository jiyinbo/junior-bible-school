<?php

namespace Tests\Feature;

use App\Models\JbsAuditLog;
use App\Models\JbsLevel;
use App\Models\JbsSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JbsAuditLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_creates_audit_entry(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'password' => bcrypt('secret-pass'),
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => $admin->email,
            'password' => 'secret-pass',
        ])->assertOk();

        $this->assertDatabaseHas('jbs_audit_logs', [
            'action' => 'auth.login',
            'user_id' => $admin->id,
            'actor_name' => $admin->name,
        ]);
    }

    public function test_session_create_writes_audit_log(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/admin/sessions', [
                'name' => 'Winter 2026',
                'slug' => 'winter-2026',
                'is_past' => false,
            ])
            ->assertCreated();

        $session = JbsSession::query()->where('slug', 'winter-2026')->first();
        $this->assertNotNull($session);

        $this->assertDatabaseHas('jbs_audit_logs', [
            'action' => 'session.created',
            'user_id' => $admin->id,
            'subject_type' => JbsSession::class,
            'subject_id' => $session->id,
        ]);
    }

    public function test_admin_can_list_audit_logs(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $session = JbsSession::query()->create(['name' => 'Summer', 'slug' => 'summer', 'is_past' => false]);
        $level = JbsLevel::query()->create([
            'jbs_session_id' => $session->id,
            'name' => 'Basic',
            'registration_prefix' => 'B',
        ]);

        JbsAuditLog::query()->create([
            'user_id' => $admin->id,
            'actor_name' => $admin->name,
            'user_role' => 'admin',
            'action' => 'level.created',
            'subject_type' => JbsLevel::class,
            'subject_id' => $level->id,
            'subject_label' => 'Basic',
            'status' => 'success',
            'created_at' => now(),
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/audit-logs?action=level.created');

        $response->assertOk();
        $response->assertJsonPath('data.0.action', 'level.created');
        $response->assertJsonPath('data.0.actor_name', $admin->name);
    }

    public function test_teacher_cannot_access_audit_logs(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);

        $this->actingAs($teacher, 'sanctum')
            ->getJson('/api/v1/admin/audit-logs')
            ->assertForbidden();
    }
}
