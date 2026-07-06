<?php

namespace Tests\Feature;

use App\Models\JbsLevel;
use App\Models\JbsSession;
use App\Models\JbsStudentRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationAdminDeleteTest extends TestCase
{
    use RefreshDatabase;

    private function registrationFixture(): JbsStudentRegistration
    {
        $session = JbsSession::query()->create(['name' => 'Summer', 'slug' => 'summer', 'is_past' => false]);
        $level = JbsLevel::query()->create([
            'jbs_session_id' => $session->id,
            'name' => 'Basic',
            'registration_prefix' => 'B',
        ]);

        return JbsStudentRegistration::query()->create([
            'jbs_session_id' => $session->id,
            'jbs_level_id' => $level->id,
            'registration_number' => 'B/0001',
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
            'email' => 'ada@example.com',
        ]);
    }

    public function test_admin_can_delete_registration(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $registration = $this->registrationFixture();

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/v1/admin/registrations/{$registration->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Registration deleted.');

        $this->assertDatabaseMissing('jbs_student_registrations', ['id' => $registration->id]);
        $this->assertDatabaseHas('jbs_audit_logs', ['action' => 'registration.deleted']);
    }

    public function test_assistant_cannot_delete_registration(): void
    {
        $assistant = User::factory()->create(['role' => 'assistant']);
        $registration = $this->registrationFixture();

        $this->actingAs($assistant, 'sanctum')
            ->deleteJson("/api/v1/admin/registrations/{$registration->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('jbs_student_registrations', ['id' => $registration->id]);
    }
}
