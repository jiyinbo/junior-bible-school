<?php

namespace Tests\Feature;

use App\Models\JbsLevel;
use App\Models\JbsModule;
use App\Models\JbsModuleAssignment;
use App\Models\JbsModuleScoreOutcome;
use App\Models\JbsSession;
use App\Models\JbsStudentRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StaffUnscoredStudentsTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{session: JbsSession, level: JbsLevel, module: JbsModule} */
    private function moduleFixture(): array
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

        return compact('session', 'level', 'module');
    }

    private function student(
        JbsSession $session,
        JbsLevel $level,
        string $registrationNumber,
        string $firstName,
        string $lastName,
    ): JbsStudentRegistration {
        return JbsStudentRegistration::query()->create([
            'jbs_session_id' => $session->id,
            'jbs_level_id' => $level->id,
            'registration_number' => $registrationNumber,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => strtolower($registrationNumber).'@example.com',
        ]);
    }

    public function test_admin_lists_students_without_score_for_module(): void
    {
        ['session' => $session, 'level' => $level, 'module' => $module] = $this->moduleFixture();
        $admin = User::factory()->create(['role' => 'admin']);

        $unscored = $this->student($session, $level, 'BCC/0001', 'Ada', 'Lovelace');
        $scored = $this->student($session, $level, 'BCC/0002', 'Grace', 'Hopper');

        JbsModuleScoreOutcome::query()->create([
            'jbs_student_registration_id' => $scored->id,
            'jbs_module_id' => $module->id,
            'score' => 80,
            'max_score' => 100,
            'source' => 'paper',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/staff/scores/unscored-students?jbs_module_id='.$module->id);

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $unscored->id);
        $response->assertJsonPath('data.0.registration_number', 'BCC/0001');
        $response->assertJsonPath('data.0.full_name', 'Ada Lovelace');
    }

    public function test_teacher_without_assignment_cannot_list_unscored_students(): void
    {
        ['module' => $module] = $this->moduleFixture();
        $teacher = User::factory()->create(['role' => 'teacher']);

        $this->actingAs($teacher, 'sanctum')
            ->getJson('/api/v1/staff/scores/unscored-students?jbs_module_id='.$module->id)
            ->assertForbidden();
    }

    public function test_assigned_teacher_can_list_unscored_students(): void
    {
        ['session' => $session, 'level' => $level, 'module' => $module] = $this->moduleFixture();
        $teacher = User::factory()->create(['role' => 'teacher']);

        JbsModuleAssignment::query()->create([
            'jbs_module_id' => $module->id,
            'user_id' => $teacher->id,
        ]);

        $student = $this->student($session, $level, 'BCC/0003', 'Alan', 'Turing');

        $this->actingAs($teacher, 'sanctum')
            ->getJson('/api/v1/staff/scores/unscored-students?jbs_module_id='.$module->id)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $student->id);
    }
}
