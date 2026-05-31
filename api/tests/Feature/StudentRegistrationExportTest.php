<?php

namespace Tests\Feature;

use App\Models\JbsLevel;
use App\Models\JbsSession;
use App\Models\JbsStudentRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentRegistrationExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_export_registrations_as_csv(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $session = JbsSession::query()->create(['name' => 'Summer', 'slug' => 'summer', 'is_past' => false]);
        $level = JbsLevel::query()->create([
            'jbs_session_id' => $session->id,
            'name' => 'Basic',
            'registration_prefix' => 'B',
        ]);

        JbsStudentRegistration::query()->create([
            'jbs_session_id' => $session->id,
            'jbs_level_id' => $level->id,
            'registration_number' => 'B/0001',
            'first_name' => 'Ada',
            'last_name' => 'Test',
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
            'place_of_worship' => 'Church',
            'place_of_worship_address' => 'Town',
            'pastor_name' => 'Pastor',
            'activity_group' => 'Youth',
            'current_school' => 'School',
            'current_school_year' => 'Year 9',
            'next_of_kin_name' => 'Kin',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->get('/api/v1/admin/registrations/export?jbs_session_id='.$session->id);

        $response->assertOk();
        $response->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('Registration number', $response->streamedContent());
        $this->assertStringContainsString('B/0001', $response->streamedContent());
        $this->assertStringContainsString('ada@example.com', $response->streamedContent());
        $this->assertStringContainsString('parent@example.com', $response->streamedContent());
    }
}
