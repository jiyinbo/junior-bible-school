<?php

namespace Tests\Feature;

use App\Models\JbsSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminMailOptionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_load_mail_options(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        JbsSession::query()->create([
            'name' => 'Summer 2026',
            'slug' => 'summer-2026',
            'is_past' => false,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/mail/options')
            ->assertOk()
            ->assertJsonPath('data.sessions.0.name', 'Summer 2026')
            ->assertJsonStructure([
                'data' => [
                    'audiences',
                    'sessions',
                    'levels',
                ],
            ]);
    }
}
