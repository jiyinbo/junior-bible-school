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
    private function registrationWithModules(
        int $moduleCount,
        int $scoredCount,
        ?Carbon $completedAt = null,
        bool $programmeEnded = true,
    ): array {
        $session = JbsSession::query()->create([
            'name' => 'Summer - 2026',
            'slug' => 'summer-2026-'.uniqid(),
            'is_past' => false,
            'session_starts_at' => now()->subWeeks(2),
            'session_ends_at' => $programmeEnded ? now()->subDay() : now()->addMonth(),
        ]);
        $level = JbsLevel::query()->create([
            'jbs_session_id' => $session->id,
            'name' => 'Basic',
            'registration_prefix' => 'B',
        ]);

        $modules = [];
        for ($i = 1; $i <= $moduleCount; $i++) {
            $modules[] = JbsModule::query()->create([
                'jbs_level_id' => $level->id,
                'name' => "Module {$i}",
                'sort_order' => $i,
            ]);
        }

        $registration = JbsStudentRegistration::query()->create([
            'jbs_session_id' => $session->id,
            'jbs_level_id' => $level->id,
            'registration_number' => 'B/'.str_pad((string) random_int(1, 9999), 4, '0', STR_PAD_LEFT),
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
            'email' => 'ada-'.uniqid().'@example.com',
            'level_completed' => false,
            'level_completed_at' => $completedAt,
        ]);

        for ($i = 0; $i < $scoredCount; $i++) {
            JbsModuleScoreOutcome::query()->create([
                'jbs_student_registration_id' => $registration->id,
                'jbs_module_id' => $modules[$i]->id,
                'score' => 18,
                'max_score' => 20,
                'source' => 'paper',
            ]);
        }

        if ($completedAt !== null) {
            $registration->forceFill([
                'level_completed' => true,
                'level_completed_at' => $completedAt,
            ])->save();
        }

        return [$registration->fresh(), $level];
    }

    public function test_admin_document_data_returns_module_grades(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        [$registration] = $this->registrationWithModules(
            moduleCount: 2,
            scoredCount: 1,
            completedAt: Carbon::parse('2026-08-06 10:00:00'),
        );

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
        // 5 modules, 1 score → 4 missing (> 3) → not complete
        [$registration] = $this->registrationWithModules(moduleCount: 5, scoredCount: 1);

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/v1/admin/registrations/{$registration->id}/documents/data")
            ->assertForbidden();
    }

    public function test_admin_document_data_forbidden_while_programme_still_running(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        [$registration] = $this->registrationWithModules(
            moduleCount: 5,
            scoredCount: 2,
            completedAt: Carbon::parse('2026-08-06 10:00:00'),
            programmeEnded: false,
        );

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/v1/admin/registrations/{$registration->id}/documents/data")
            ->assertForbidden();
    }

    public function test_bulk_document_data_only_includes_completed_students(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        [$completed, $level] = $this->registrationWithModules(
            moduleCount: 5,
            scoredCount: 2,
            completedAt: Carbon::parse('2026-08-06 10:00:00'),
        );

        // Same tier: 0 scores → 5 missing → not complete
        JbsStudentRegistration::query()->create([
            'jbs_session_id' => $level->jbs_session_id,
            'jbs_level_id' => $level->id,
            'registration_number' => 'B/0002',
            'first_name' => 'Grace',
            'last_name' => 'Hopper',
            'email' => 'grace@example.com',
            'level_completed' => false,
        ]);

        // Ensure DB flags match score-derived completion before bulk filter
        app(\App\Services\JbsStudentProgressService::class)->syncLevelCompletion($completed->fresh()->load(['session', 'level.modules']));

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/v1/admin/documents/data?jbs_level_id={$level->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.registration_number', $completed->registration_number);
    }
}
