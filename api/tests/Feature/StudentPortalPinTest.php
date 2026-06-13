<?php

namespace Tests\Feature;

use App\Models\JbsLevel;
use App\Models\JbsSession;
use App\Models\JbsStudentRegistration;
use App\Models\User;
use App\Services\JbsStudentPortalPinService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class StudentPortalPinTest extends TestCase
{
    use RefreshDatabase;

    private function registrationWithPin(string $pin = '1234'): JbsStudentRegistration
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

        $reg = JbsStudentRegistration::query()->create([
            'jbs_session_id' => $session->id,
            'jbs_level_id' => $level->id,
            'registration_number' => 'BCC/0001',
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
            'email' => 'ada@example.com',
        ]);

        app(JbsStudentPortalPinService::class)->setPin($reg, $pin);

        return $reg->fresh();
    }

    public function test_lookup_requires_valid_pin(): void
    {
        $this->registrationWithPin('1234');

        $this->postJson('/api/v1/student/lookup', [
            'registration_number' => 'BCC/0001',
            'pin' => '1234',
        ])->assertOk();

        $this->postJson('/api/v1/student/lookup', [
            'registration_number' => 'BCC/0001',
            'pin' => '9999',
        ])->assertUnauthorized();
    }

    public function test_student_can_change_pin(): void
    {
        $this->registrationWithPin('1234');

        $this->patchJson('/api/v1/student/pin', [
            'registration_number' => 'BCC/0001',
            'current_pin' => '1234',
            'new_pin' => '5678',
            'new_pin_confirmation' => '5678',
        ])->assertOk();

        $this->postJson('/api/v1/student/lookup', [
            'registration_number' => 'BCC/0001',
            'pin' => '5678',
        ])->assertOk();

        $this->postJson('/api/v1/student/lookup', [
            'registration_number' => 'BCC/0001',
            'pin' => '1234',
        ])->assertUnauthorized();
    }

    public function test_admin_can_reset_portal_pin(): void
    {
        $reg = $this->registrationWithPin('1234');
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->patchJson("/api/v1/admin/registrations/{$reg->id}/pin", [
            'pin' => '4321',
            'send_email' => false,
        ])->assertOk();

        $response->assertJsonPath('data.pin', '4321');

        $reg->refresh();
        $this->assertTrue(Hash::check('4321', (string) $reg->portal_pin_hash));
    }
}
