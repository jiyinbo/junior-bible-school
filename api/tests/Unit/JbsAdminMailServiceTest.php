<?php

namespace Tests\Unit;

use App\Models\JbsLevel;
use App\Models\JbsSession;
use App\Models\JbsStudentRegistration;
use App\Models\User;
use App\Services\JbsAdminMailService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class JbsAdminMailServiceTest extends TestCase
{
    use RefreshDatabase;

    private JbsAdminMailService $mail;

    protected function setUp(): void
    {
        parent::setUp();
        $this->mail = new JbsAdminMailService;
    }

    #[Test]
    public function dedupes_parents_by_guardian_email_in_session(): void
    {
        $session = JbsSession::query()->create(['name' => 'S', 'slug' => 's', 'is_past' => false]);
        $level = JbsLevel::query()->create([
            'jbs_session_id' => $session->id,
            'name' => 'Basic',
            'registration_prefix' => 'B',
        ]);

        $this->createRegistration($session->id, $level->id, 'Ada', 'parent@example.com');
        $this->createRegistration($session->id, $level->id, 'Bob', 'parent@example.com');

        $recipients = $this->mail->resolveRecipients(
            JbsAdminMailService::AUDIENCE_PARENTS_SESSION,
            ['jbs_session_id' => $session->id],
        );

        $this->assertCount(1, $recipients);
        $this->assertSame('parent@example.com', $recipients[0]['email']);
        $this->assertStringContainsString('Ada', $recipients[0]['label']);
        $this->assertStringContainsString('Bob', $recipients[0]['label']);
    }

    #[Test]
    public function resolves_staff_by_role(): void
    {
        User::factory()->create(['email' => 'teacher@example.com', 'role' => 'teacher']);
        User::factory()->create(['email' => 'admin@example.com', 'role' => 'admin']);

        $recipients = $this->mail->resolveRecipients(JbsAdminMailService::AUDIENCE_STAFF_TEACHERS, []);

        $this->assertCount(1, $recipients);
        $this->assertSame('teacher@example.com', $recipients[0]['email']);
    }

    private function createRegistration(int $sessionId, int $levelId, string $firstName, string $guardianEmail): void
    {
        JbsStudentRegistration::query()->create([
            'jbs_session_id' => $sessionId,
            'jbs_level_id' => $levelId,
            'registration_number' => 'B/'.strtoupper(substr($firstName, 0, 3)),
            'first_name' => $firstName,
            'last_name' => 'Test',
            'email' => null,
            'guardian_name' => 'Parent Test',
            'guardian_relationship' => 'Mother',
            'guardian_phone' => '07123456789',
            'guardian_email' => $guardianEmail,
            'gender' => 'Female',
            'date_of_birth' => '2014-01-01',
            'nationality' => 'British',
            'address' => '1 Street',
            'born_again' => true,
            'place_of_worship' => 'Church',
            'place_of_worship_address' => 'Town',
            'pastor_name' => 'Pastor',
            'activity_group' => 'Youth',
            'current_school' => 'School',
            'current_school_year' => 'Year 9',
            'next_of_kin_name' => 'Kin',
            'next_of_kin_phone' => '07987654321',
        ]);
    }
}
