<?php

namespace Tests\Feature;

use App\Models\JbsLevel;
use App\Models\JbsSession;
use App\Models\JbsStudentRegistration;
use App\Services\JbsRegistrationValidationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DuplicateSessionRegistrationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, mixed>
     */
    private function childPayload(int $levelId, string $email = 'child@example.com'): array
    {
        return [
            'jbs_level_id' => $levelId,
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
            'gender' => 'Female',
            'date_of_birth' => '2014-06-01',
            'nationality' => 'British',
            'address' => '1 Test Street',
            'phone' => '07123456789',
            'email' => $email,
            'born_again' => true,
            'date_of_new_birth' => '2020-01-01',
            'place_of_worship' => 'Winners Chapel',
            'place_of_worship_address' => 'Dartford',
            'pastor_name' => 'Pastor Test',
            'activity_group' => 'Youth',
            'current_school' => 'Test School',
            'current_school_year' => 'Year 9',
            'next_of_kin_name' => 'Guardian Test',
            'next_of_kin_phone' => '07987654321',
            'next_of_kin_email' => 'kin@example.com',
        ];
    }

    public function test_same_email_cannot_register_twice_in_one_session(): void
    {
        $session = JbsSession::query()->create([
            'name' => 'Summer 2026',
            'slug' => 'summer-2026',
            'is_past' => false,
        ]);

        $level = JbsLevel::query()->create([
            'jbs_session_id' => $session->id,
            'name' => 'Basic (10-12)',
            'placement_group' => JbsRegistrationValidationService::PLACEMENT_BASIC_10_12,
            'registration_prefix' => 'L1',
            'next_sequence' => 1,
        ]);

        JbsStudentRegistration::query()->create([
            'jbs_session_id' => $session->id,
            'jbs_level_id' => $level->id,
            'registration_number' => 'L1/0001',
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
            'email' => 'ada@example.com',
            'guardian_name' => 'Parent',
            'guardian_relationship' => 'Mother',
            'guardian_phone' => '07111111111',
        ]);

        $response = $this->postJson('/api/v1/public/registrations', [
            'session_slug' => $session->slug,
            'guardian_name' => 'Parent',
            'guardian_relationship' => 'Mother',
            'guardian_phone' => '07222222222',
            'guardian_email' => 'parent@example.com',
            'children' => [
                $this->childPayload($level->id, 'ADA@Example.com'),
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'message' => 'This email address is already registered for this session. Each student may only register once per session.',
        ]);
    }

    public function test_batch_registration_creates_multiple_children(): void
    {
        $session = JbsSession::query()->create([
            'name' => 'Summer 2026',
            'slug' => 'summer-2026',
            'is_past' => false,
        ]);

        $level = JbsLevel::query()->create([
            'jbs_session_id' => $session->id,
            'name' => 'Basic (10-12)',
            'placement_group' => JbsRegistrationValidationService::PLACEMENT_BASIC_10_12,
            'registration_prefix' => 'L1',
            'next_sequence' => 0,
        ]);

        $response = $this->postJson('/api/v1/public/registrations', [
            'session_slug' => $session->slug,
            'guardian_name' => 'Jane Parent',
            'guardian_relationship' => 'Mother',
            'guardian_phone' => '07123456780',
            'guardian_email' => 'jane.parent@example.com',
            'children' => [
                $this->childPayload($level->id, 'child1@example.com'),
                $this->childPayload($level->id, 'child2@example.com'),
            ],
        ]);

        $response->assertCreated();
        $response->assertJsonCount(2, 'data');
        $this->assertDatabaseCount('jbs_student_registrations', 2);
        $this->assertDatabaseHas('jbs_student_registrations', [
            'email' => 'child1@example.com',
            'guardian_email' => 'jane.parent@example.com',
        ]);
        $this->assertDatabaseHas('jbs_student_registrations', [
            'email' => 'child2@example.com',
            'guardian_email' => 'jane.parent@example.com',
        ]);

        $this->assertSame(2, JbsStudentRegistration::query()->whereNotNull('portal_pin_hash')->count());
    }

    public function test_child_phone_and_email_are_optional(): void
    {
        $session = JbsSession::query()->create([
            'name' => 'Summer 2026',
            'slug' => 'summer-2026-opt',
            'is_past' => false,
        ]);

        $level = JbsLevel::query()->create([
            'jbs_session_id' => $session->id,
            'name' => 'Basic (10-12)',
            'placement_group' => JbsRegistrationValidationService::PLACEMENT_BASIC_10_12,
            'registration_prefix' => 'L2',
            'next_sequence' => 0,
        ]);

        $child = $this->childPayload($level->id, '');
        $child['phone'] = '';
        $child['email'] = '';

        $response = $this->postJson('/api/v1/public/registrations', [
            'session_slug' => $session->slug,
            'guardian_name' => 'Jane Parent',
            'guardian_relationship' => 'Mother',
            'guardian_phone' => '07123456781',
            'guardian_email' => 'jane.parent2@example.com',
            'children' => [$child],
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('jbs_student_registrations', [
            'email' => null,
            'phone' => null,
            'guardian_email' => 'jane.parent2@example.com',
        ]);
    }
}
