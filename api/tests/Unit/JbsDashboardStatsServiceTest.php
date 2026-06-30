<?php

namespace Tests\Unit;

use App\Models\JbsAttendanceLog;
use App\Models\JbsLevel;
use App\Models\JbsSession;
use App\Models\JbsStudentRegistration;
use App\Models\User;
use App\Services\JbsDashboardStatsService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class JbsDashboardStatsServiceTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function admin_stats_include_gender_nationality_and_completion_breakdowns(): void
    {
        $session = JbsSession::query()->create(['name' => 'Summer', 'slug' => 'summer', 'is_past' => false]);
        $basic = JbsLevel::query()->create([
            'jbs_session_id' => $session->id,
            'name' => 'Basic',
            'registration_prefix' => 'B',
            'sort_order' => 1,
        ]);
        $advanced = JbsLevel::query()->create([
            'jbs_session_id' => $session->id,
            'name' => 'Advanced',
            'registration_prefix' => 'A',
            'sort_order' => 2,
        ]);

        $this->createRegistration($session, $basic, 'Male', 'British', 'Winners Chapel Dartford', false);
        $this->createRegistration($session, $basic, 'Female', 'British', 'Winners Chapel Dartford', true);
        $this->createRegistration($session, $advanced, 'Male', 'Nigerian', 'Other Church', true);

        $payload = app(JbsDashboardStatsService::class)->adminStats($session->id);

        $this->assertSame(1, $payload['gender_by_level'][0]['boys']);
        $this->assertSame(1, $payload['gender_by_level'][0]['girls']);
        $this->assertSame(1, $payload['gender_by_level'][1]['boys']);
        $this->assertSame(0, $payload['gender_by_level'][1]['girls']);
        $this->assertSame(1, $payload['gender_completed_by_level'][0]['girls']);
        $this->assertSame(1, $payload['gender_completed_by_level'][1]['boys']);
        $this->assertSame(1, $payload['completed_by_gender']['boys']);
        $this->assertSame(1, $payload['completed_by_gender']['girls']);
        $this->assertCount(2, $payload['nationalities']);
        $this->assertSame('British', $payload['nationalities'][0]['nationality']);
        $this->assertSame(2, $payload['nationalities'][0]['count']);
        $this->assertSame('Winners Chapel Dartford', $payload['churches'][0]['church']);
        $this->assertSame(2, $payload['churches'][0]['count']);
        $this->assertSame(2, $payload['grades_by_level'][0]['ungraded']);
        $this->assertSame(1, $payload['grades_by_level'][1]['ungraded']);
    }

    #[Test]
    public function grades_by_level_reflect_overall_module_averages(): void
    {
        $session = JbsSession::query()->create(['name' => 'Summer', 'slug' => 'summer', 'is_past' => false]);
        $level = JbsLevel::query()->create([
            'jbs_session_id' => $session->id,
            'name' => 'Advanced',
            'registration_prefix' => 'A',
            'sort_order' => 1,
        ]);
        $module = \App\Models\JbsModule::query()->create([
            'jbs_level_id' => $level->id,
            'name' => 'Module 1',
            'sort_order' => 1,
        ]);

        $registration = JbsStudentRegistration::query()->create([
            'jbs_session_id' => $session->id,
            'jbs_level_id' => $level->id,
            'registration_number' => 'A/0001',
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
            'email' => 'ada@example.com',
            'phone' => '07123456789',
            'guardian_name' => 'Parent',
            'guardian_relationship' => 'Mother',
            'guardian_phone' => '07987654321',
            'guardian_email' => 'parent@example.com',
            'gender' => 'Female',
            'date_of_birth' => '2014-01-15',
            'nationality' => 'British',
            'address' => '1 Street',
            'born_again' => true,
            'place_of_worship' => 'Winners Chapel',
            'place_of_worship_address' => 'Town',
            'pastor_name' => 'Pastor',
            'activity_group' => 'Youth',
            'current_school' => 'School',
            'current_school_year' => 'Year 9',
            'next_of_kin_name' => 'Kin',
        ]);

        \App\Models\JbsModuleScoreOutcome::query()->create([
            'jbs_student_registration_id' => $registration->id,
            'jbs_module_id' => $module->id,
            'score' => 80,
            'max_score' => 100,
            'source' => 'manual',
        ]);

        $payload = app(JbsDashboardStatsService::class)->adminStats($session->id);

        $this->assertSame(1, $payload['grades_by_level'][0]['distinction']);
        $this->assertSame(0, $payload['grades_by_level'][0]['merit']);
    }

    #[Test]
    public function attendance_last_7_days_groups_counts_by_tier(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-27 12:00:00'));

        $session = JbsSession::query()->create(['name' => 'Summer', 'slug' => 'summer', 'is_past' => false]);
        $basic = JbsLevel::query()->create([
            'jbs_session_id' => $session->id,
            'name' => 'Basic',
            'registration_prefix' => 'B',
            'sort_order' => 1,
        ]);
        $advanced = JbsLevel::query()->create([
            'jbs_session_id' => $session->id,
            'name' => 'Advanced',
            'registration_prefix' => 'A',
            'sort_order' => 2,
        ]);

        $basicReg = $this->createRegistration($session, $basic, 'Male', 'British', 'Church', false);
        $advancedReg = $this->createRegistration($session, $advanced, 'Female', 'British', 'Church', false);
        $recorder = User::factory()->create(['role' => 'teacher']);

        JbsAttendanceLog::query()->create([
            'jbs_student_registration_id' => $basicReg->id,
            'attended_on' => '2026-06-27',
            'recorded_at' => now(),
            'recorded_by_user_id' => $recorder->id,
        ]);
        JbsAttendanceLog::query()->create([
            'jbs_student_registration_id' => $advancedReg->id,
            'attended_on' => '2026-06-27',
            'recorded_at' => now(),
            'recorded_by_user_id' => $recorder->id,
        ]);
        JbsAttendanceLog::query()->create([
            'jbs_student_registration_id' => $advancedReg->id,
            'attended_on' => '2026-06-25',
            'recorded_at' => now(),
            'recorded_by_user_id' => $recorder->id,
        ]);

        $payload = app(JbsDashboardStatsService::class)->adminStats($session->id);
        $attendance = $payload['attendance_last_7_days_by_level'];

        $this->assertSame('Basic', $attendance['levels'][0]['level_name']);
        $this->assertSame('Advanced', $attendance['levels'][1]['level_name']);
        $this->assertCount(7, $attendance['days']);

        $today = collect($attendance['days'])->firstWhere('date', '2026-06-27');
        $this->assertSame([1, 1], $today['counts']);

        $wednesday = collect($attendance['days'])->firstWhere('date', '2026-06-25');
        $this->assertSame([0, 1], $wednesday['counts']);

        Carbon::setTestNow();
    }

    private function createRegistration(
        JbsSession $session,
        JbsLevel $level,
        string $gender,
        string $nationality,
        string $church,
        bool $completed,
    ): JbsStudentRegistration {
        static $n = 0;
        $n++;

        return JbsStudentRegistration::query()->create([
            'jbs_session_id' => $session->id,
            'jbs_level_id' => $level->id,
            'registration_number' => "REG/{$n}",
            'first_name' => "Student{$n}",
            'last_name' => 'Test',
            'email' => "student{$n}@example.com",
            'phone' => '07123456789',
            'guardian_name' => 'Parent',
            'guardian_relationship' => 'Mother',
            'guardian_phone' => '07987654321',
            'guardian_email' => 'parent@example.com',
            'gender' => $gender,
            'date_of_birth' => '2014-01-15',
            'nationality' => $nationality,
            'address' => '1 Street',
            'born_again' => true,
            'place_of_worship' => $church,
            'place_of_worship_address' => 'Town',
            'pastor_name' => 'Pastor',
            'activity_group' => 'Youth',
            'current_school' => 'School',
            'current_school_year' => 'Year 9',
            'next_of_kin_name' => 'Kin',
            'level_completed' => $completed,
        ]);
    }
}
