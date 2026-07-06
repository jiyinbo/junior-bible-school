<?php

namespace Tests\Feature;

use App\Models\JbsLevel;
use App\Models\JbsModule;
use App\Models\JbsModuleScoreOutcome;
use App\Models\JbsSession;
use App\Models\JbsStudentRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class DocumentDataTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{0: JbsStudentRegistration, 1: JbsLevel}
     */
    private function completedRegistration(bool $completed = true): array
    {
        $session = JbsSession::query()->create(['name' => 'Summer - 2026', 'slug' => 'summer-2026', 'is_past' => false]);
        $level = JbsLevel::query()->create([
            'jbs_session_id' => $session->id,
            'name' => 'Basic',
            'registration_prefix' => 'B',
        ]);
        $moduleA = JbsModule::query()->create(['jbs_level_id' => $level->id, 'name' => 'Putting My Mind to Work', 'sort_order' => 1]);
        JbsModule::query()->create(['jbs_level_id' => $level->id, 'name' => 'The Holy Spirit', 'sort_order' => 2]);

        $registration = JbsStudentRegistration::query()->create([
            'jbs_session_id' => $session->id,
            'jbs_level_id' => $level->id,
            'registration_number' => 'B/0001',
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
            'email' => 'ada@example.com',
            'level_completed' => $completed,
            'level_completed_at' => $completed ? Carbon::parse('2026-08-06 10:00:00') : null,
        ]);

        JbsModuleScoreOutcome::query()->create([
            'jbs_student_registration_id' => $registration->id,
            'jbs_module_id' => $moduleA->id,
            'score' => 18,
            'max_score' => 20,
            'source' => 'manual',
        ]);

        return [$registration, $level];
    }

    public function test_admin_document_data_returns_module_grades(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        [$registration] = $this->completedRegistration();

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/v1/admin/registrations/{$registration->id}/documents/data")
            ->assertOk()
            ->assertJsonPath('data.full_name', 'Ada Lovelace')
            ->assertJsonPath('data.issued_on', '6 August 2026')
            ->assertJsonPath('data.modules.0.grade', 'A')
            ->assertJsonPath('data.modules.1.grade', '—');

        $this->assertDatabaseHas('jbs_audit_logs', ['action' => 'registration.document_downloaded']);
    }

    public function test_admin_document_data_forbidden_when_not_completed(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        [$registration] = $this->completedRegistration(completed: false);

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/v1/admin/registrations/{$registration->id}/documents/data")
            ->assertForbidden();
    }

    public function test_bulk_document_data_only_includes_completed_students(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        [$completed, $level] = $this->completedRegistration();

        JbsStudentRegistration::query()->create([
            'jbs_session_id' => $level->jbs_session_id,
            'jbs_level_id' => $level->id,
            'registration_number' => 'B/0002',
            'first_name' => 'Grace',
            'last_name' => 'Hopper',
            'email' => 'grace@example.com',
            'level_completed' => false,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/v1/admin/documents/data?jbs_level_id={$level->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.registration_number', $completed->registration_number);
    }
}
