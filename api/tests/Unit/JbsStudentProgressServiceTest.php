<?php

namespace Tests\Unit;

use App\Models\JbsLevel;
use App\Models\JbsModule;
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
        [$reg] = $this->registrationWithModules(sessionStartsAt: now()->addWeek());

        $summary = $this->progress->summary($reg);

        $this->assertSame('upcoming', $summary['programme_phase']);
        $this->assertTrue($summary['graduation_pending']);
        $this->assertNull($summary['eligible_for_graduation']);
        $this->assertSame(0, $summary['tests_missed']);
    }

    #[Test]
    public function graduation_is_pending_when_ongoing_but_no_modules_completed(): void
    {
        [$reg] = $this->registrationWithModules(sessionStartsAt: now()->subDay());

        $summary = $this->progress->summary($reg);

        $this->assertSame('ongoing', $summary['programme_phase']);
        $this->assertTrue($summary['graduation_pending']);
        $this->assertNull($summary['eligible_for_graduation']);
        $this->assertSame(0, $summary['tests_missed']);
    }

    /**
     * @return array{0: JbsStudentRegistration}
     */
    private function registrationWithModules(?\DateTimeInterface $sessionStartsAt): array
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

        foreach (['Mod A', 'Mod B'] as $i => $name) {
            JbsModule::query()->create([
                'jbs_level_id' => $level->id,
                'name' => $name,
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

        return [$reg];
    }
}
