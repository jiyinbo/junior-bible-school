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

class StaffTierBoardTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{session: JbsSession, level: JbsLevel, moduleA: JbsModule, moduleB: JbsModule} */
    private function tierFixture(): array
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

        $moduleA = JbsModule::query()->create([
            'jbs_level_id' => $level->id,
            'name' => 'Course One',
            'code' => 'C1',
            'sort_order' => 0,
        ]);

        $moduleB = JbsModule::query()->create([
            'jbs_level_id' => $level->id,
            'name' => 'Course Two',
            'code' => 'C2',
            'sort_order' => 1,
        ]);

        return compact('session', 'level', 'moduleA', 'moduleB');
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
            'email' => strtolower(str_replace('/', '-', $registrationNumber)).'@example.com',
        ]);
    }

    public function test_admin_gets_tier_board_with_top3_and_module_matrix(): void
    {
        ['session' => $session, 'level' => $level, 'moduleA' => $moduleA, 'moduleB' => $moduleB] = $this->tierFixture();
        $admin = User::factory()->create(['role' => 'admin']);

        $first = $this->student($session, $level, 'BCC/0001', 'Ada', 'Lovelace');
        $second = $this->student($session, $level, 'BCC/0002', 'Grace', 'Hopper');
        $third = $this->student($session, $level, 'BCC/0003', 'Alan', 'Turing');
        $unscored = $this->student($session, $level, 'BCC/0004', 'No', 'Scores');

        JbsModuleScoreOutcome::query()->create([
            'jbs_student_registration_id' => $first->id,
            'jbs_module_id' => $moduleA->id,
            'score' => 90,
            'max_score' => 100,
            'source' => 'paper',
        ]);
        JbsModuleScoreOutcome::query()->create([
            'jbs_student_registration_id' => $first->id,
            'jbs_module_id' => $moduleB->id,
            'score' => 80,
            'max_score' => 100,
            'source' => 'paper',
        ]);

        JbsModuleScoreOutcome::query()->create([
            'jbs_student_registration_id' => $second->id,
            'jbs_module_id' => $moduleA->id,
            'score' => 70,
            'max_score' => 100,
            'source' => 'paper',
        ]);
        JbsModuleScoreOutcome::query()->create([
            'jbs_student_registration_id' => $second->id,
            'jbs_module_id' => $moduleB->id,
            'score' => 60,
            'max_score' => 100,
            'source' => 'paper',
        ]);

        JbsModuleScoreOutcome::query()->create([
            'jbs_student_registration_id' => $third->id,
            'jbs_module_id' => $moduleA->id,
            'score' => 50,
            'max_score' => 100,
            'source' => 'paper',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/staff/scores/tier-board?session=Summer%202026&level=BCC');

        $response->assertOk();
        $response->assertJsonCount(2, 'data.modules');
        $response->assertJsonPath('data.modules.0.code', 'C1');
        $response->assertJsonPath('data.modules.1.code', 'C2');
        $response->assertJsonCount(4, 'data.students');
        $response->assertJsonCount(3, 'data.top3');

        $response->assertJsonPath('data.top3.0.id', $first->id);
        $response->assertJsonPath('data.top3.0.overall_score', 170);
        $response->assertJsonPath('data.top3.0.overall_max_score', 200);
        $response->assertJsonPath('data.top3.0.overall_percent', 85);
        $response->assertJsonPath('data.top3.0.overall_grade_short', 'D');
        $response->assertJsonPath('data.top3.0.overall_grade_label', 'Distinction');
        $response->assertJsonPath('data.top3.1.id', $second->id);
        $response->assertJsonPath('data.top3.2.id', $third->id);

        $firstRow = collect($response->json('data.students'))->firstWhere('id', $first->id);
        $this->assertSame(90, $firstRow['modules'][(string) $moduleA->id]['score']);
        $this->assertSame('A', $firstRow['modules'][(string) $moduleA->id]['grade_short']);
        $this->assertSame(170, $firstRow['overall_score']);
        $this->assertSame(200, $firstRow['overall_max_score']);
        $this->assertNull(
            collect($response->json('data.students'))->firstWhere('id', $unscored->id)['overall_percent'],
        );
    }

    public function test_teacher_without_assignment_cannot_view_tier_board(): void
    {
        $this->tierFixture();
        $teacher = User::factory()->create(['role' => 'teacher']);

        $this->actingAs($teacher, 'sanctum')
            ->getJson('/api/v1/staff/scores/tier-board?session=Summer%202026&level=BCC')
            ->assertForbidden();
    }

    public function test_assigned_teacher_can_view_tier_board(): void
    {
        ['moduleA' => $moduleA] = $this->tierFixture();
        $teacher = User::factory()->create(['role' => 'teacher']);

        JbsModuleAssignment::query()->create([
            'jbs_module_id' => $moduleA->id,
            'user_id' => $teacher->id,
        ]);

        $this->actingAs($teacher, 'sanctum')
            ->getJson('/api/v1/staff/scores/tier-board?session=Summer%202026&level=BCC')
            ->assertOk()
            ->assertJsonCount(2, 'data.modules');
    }
}
