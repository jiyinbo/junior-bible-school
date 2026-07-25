<?php

namespace Tests\Unit;

use App\Models\JbsLevel;
use App\Models\JbsModule;
use App\Models\JbsModuleScoreOutcome;
use App\Models\JbsSession;
use App\Models\JbsStudentRegistration;
use App\Services\JbsStudentProgressService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class JbsStudentProgressServiceTest extends TestCase
{
    use RefreshDatabase;

    private JbsStudentProgressService $progress;

    protected function setUp(): void
    {
        parent::setUp();
        $this->progress = app(JbsStudentProgressService::class);
    }

    #[Test]
    public function graduation_is_pending_before_programme_starts(): void
    {
        [$reg] = $this->registrationWithModules(moduleCount: 5, sessionStartsAt: now()->addWeek());

        $summary = $this->progress->summary($reg);

        $this->assertSame('upcoming', $summary['programme_phase']);
        $this->assertTrue($summary['graduation_pending']);
        $this->assertNull($summary['eligible_for_graduation']);
        $this->assertSame(0, $summary['tests_missed']);
        $this->assertFalse($summary['level_completed']);
    }

    #[Test]
    public function graduation_is_pending_when_ongoing_but_no_modules_completed(): void
    {
        [$reg] = $this->registrationWithModules(moduleCount: 5, sessionStartsAt: now()->subDay());

        $summary = $this->progress->summary($reg);

        $this->assertSame('ongoing', $summary['programme_phase']);
        $this->assertTrue($summary['graduation_pending']);
        $this->assertNull($summary['eligible_for_graduation']);
        $this->assertSame(0, $summary['tests_missed']);
        $this->assertFalse($summary['level_completed']);
    }

    #[Test]
    public function tier_is_complete_when_at_most_three_modules_lack_scores(): void
    {
        [$reg, $modules] = $this->registrationWithModules(moduleCount: 5, sessionStartsAt: now()->subDay());

        // Score 2 of 5 → 3 missing → complete
        foreach (array_slice($modules, 0, 2) as $module) {
            JbsModuleScoreOutcome::query()->create([
                'jbs_student_registration_id' => $reg->id,
                'jbs_module_id' => $module->id,
                'score' => 70,
                'max_score' => 100,
                'source' => 'paper',
            ]);
        }

        $summary = $this->progress->summary($reg->fresh());

        $this->assertFalse($summary['graduation_pending']);
        $this->assertSame(3, $summary['tests_missed']);
        $this->assertTrue($summary['eligible_for_graduation']);
        $this->assertTrue($summary['level_completed']);
        $this->assertTrue($reg->fresh()->level_completed);
    }

    #[Test]
    public function tier_is_incomplete_when_more_than_three_modules_lack_scores(): void
    {
        [$reg, $modules] = $this->registrationWithModules(moduleCount: 5, sessionStartsAt: now()->subDay());

        // Score 1 of 5 → 4 missing → incomplete
        JbsModuleScoreOutcome::query()->create([
            'jbs_student_registration_id' => $reg->id,
            'jbs_module_id' => $modules[0]->id,
            'score' => 70,
            'max_score' => 100,
            'source' => 'paper',
        ]);

        $summary = $this->progress->summary($reg->fresh());

        $this->assertFalse($summary['graduation_pending']);
        $this->assertSame(4, $summary['tests_missed']);
        $this->assertFalse($summary['eligible_for_graduation']);
        $this->assertFalse($summary['level_completed']);
        $this->assertFalse($reg->fresh()->level_completed);
    }

    /**
     * @return array{0: JbsStudentRegistration, 1: list<JbsModule>}
     */
    private function registrationWithModules(int $moduleCount, ?\DateTimeInterface $sessionStartsAt): array
    {
        $session = JbsSession::query()->create([
            'name' => 'Summer 2026',
            'slug' => 'summer-2026-'.uniqid(),
            'is_past' => false,
            'session_starts_at' => $sessionStartsAt,
            'session_ends_at' => now()->addMonths(2),
        ]);

        $level = JbsLevel::query()->create([
            'jbs_session_id' => $session->id,
            'name' => 'BCC',
            'registration_prefix' => 'BCC',
            'next_sequence' => 1,
        ]);

        $modules = [];
        for ($i = 0; $i < $moduleCount; $i++) {
            $modules[] = JbsModule::query()->create([
                'jbs_level_id' => $level->id,
                'name' => 'Mod '.$i,
                'sort_order' => $i,
            ]);
        }

        $reg = JbsStudentRegistration::query()->create([
            'jbs_session_id' => $session->id,
            'jbs_level_id' => $level->id,
            'registration_number' => 'BCC/0001',
            'first_name' => 'Test',
            'last_name' => 'Student',
            'email' => 'test-'.uniqid().'@example.com',
        ]);

        return [$reg, $modules];
    }
}
