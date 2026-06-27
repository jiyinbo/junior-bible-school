<?php

namespace Tests\Feature;

use App\Mail\TierChangeMail;
use App\Models\JbsLevel;
use App\Models\JbsSession;
use App\Models\JbsStudentRegistration;
use App\Models\User;
use App\Services\JbsStudentPortalPinService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class RegistrationAdminUpdateTest extends TestCase
{
    use RefreshDatabase;

    private function registrationFixture(): array
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $session = JbsSession::query()->create(['name' => 'Summer', 'slug' => 'summer', 'is_past' => false]);
        $level = JbsLevel::query()->create([
            'jbs_session_id' => $session->id,
            'name' => 'Basic',
            'registration_prefix' => 'B',
        ]);

        $registration = JbsStudentRegistration::query()->create([
            'jbs_session_id' => $session->id,
            'jbs_level_id' => $level->id,
            'registration_number' => 'B/0001',
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
            'place_of_worship' => 'Church',
            'place_of_worship_address' => 'Town',
            'pastor_name' => 'Pastor',
            'activity_group' => 'Youth',
            'current_school' => 'School',
            'current_school_year' => 'Year 9',
            'next_of_kin_name' => 'Kin',
        ]);

        return [$admin, $registration];
    }

    public function test_admin_can_update_extended_profile_fields(): void
    {
        [$admin, $registration] = $this->registrationFixture();

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/v1/admin/registrations/{$registration->id}", [
                'gender' => 'Male',
                'nationality' => 'Nigerian',
                'address' => '42 Updated Road',
                'allergies' => 'Peanuts',
                'next_of_kin_phone' => '07000000000',
                'next_of_kin_email' => 'kin@example.com',
                'guardian_phone' => '07111111111',
                'born_again' => false,
                'date_of_new_birth' => null,
            ])
            ->assertOk()
            ->assertJsonPath('data.gender', 'Male')
            ->assertJsonPath('data.nationality', 'Nigerian')
            ->assertJsonPath('data.address', '42 Updated Road')
            ->assertJsonPath('data.allergies', 'Peanuts')
            ->assertJsonPath('data.next_of_kin_phone', '07000000000')
            ->assertJsonPath('data.next_of_kin_email', 'kin@example.com')
            ->assertJsonPath('data.guardian_phone', '07111111111')
            ->assertJsonPath('data.born_again', false)
            ->assertJsonPath('data.date_of_new_birth', null);
    }

    public function test_changing_tier_reissues_registration_number_resets_pin_and_emails(): void
    {
        Mail::fake();

        $admin = User::factory()->create(['role' => 'admin']);
        $session = JbsSession::query()->create(['name' => 'Summer', 'slug' => 'summer', 'is_past' => false]);
        $basicLevel = JbsLevel::query()->create([
            'jbs_session_id' => $session->id,
            'name' => 'Basic',
            'registration_prefix' => 'BCC',
        ]);
        $advancedLevel = JbsLevel::query()->create([
            'jbs_session_id' => $session->id,
            'name' => 'Advanced',
            'registration_prefix' => 'HCC',
        ]);

        $registration = JbsStudentRegistration::query()->create([
            'jbs_session_id' => $session->id,
            'jbs_level_id' => $basicLevel->id,
            'registration_number' => 'BCC/0001',
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
            'email' => 'ada@example.com',
            'guardian_email' => 'parent@example.com',
            'gender' => 'Female',
            'date_of_birth' => '2014-01-15',
            'nationality' => 'British',
            'address' => '1 Street',
            'born_again' => true,
            'place_of_worship' => 'Church',
            'place_of_worship_address' => 'Town',
            'pastor_name' => 'Pastor',
            'current_school' => 'School',
            'current_school_year' => 'Year 9',
            'next_of_kin_name' => 'Kin',
        ]);

        $pinService = app(JbsStudentPortalPinService::class);
        $pinService->setPin($registration, '1234');

        $response = $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/v1/admin/registrations/{$registration->id}", [
                'jbs_level_id' => $advancedLevel->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.level.name', 'Advanced');

        $newRegistrationNumber = $response->json('data.registration_number');
        $this->assertStringStartsWith('HCC/', $newRegistrationNumber);
        $this->assertNotSame('BCC/0001', $newRegistrationNumber);

        $registration->refresh();
        $this->assertFalse($pinService->verifyPin($registration, '1234'));

        Mail::assertSent(TierChangeMail::class, function (TierChangeMail $mail) use ($newRegistrationNumber): bool {
            return $mail->registration->registration_number === $newRegistrationNumber
                && $mail->previousRegistrationNumber === 'BCC/0001'
                && $mail->previousLevelName === 'Basic'
                && strlen($mail->portalPin) === 4;
        });

        $sentPin = Mail::sent(TierChangeMail::class)[0]->portalPin;
        $this->assertTrue($pinService->verifyPin($registration, $sentPin));
    }
}
