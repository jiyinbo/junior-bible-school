<?php

namespace Tests\Feature;

use App\Models\JbsLevel;
use App\Models\JbsSession;
use App\Models\JbsStudentRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentRegistrationListTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_paginate_registrations(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $session = JbsSession::query()->create(['name' => 'Summer', 'slug' => 'summer', 'is_past' => false]);
        $level = JbsLevel::query()->create([
            'jbs_session_id' => $session->id,
            'name' => 'Basic',
            'registration_prefix' => 'B',
        ]);

        for ($i = 1; $i <= 30; $i++) {
            JbsStudentRegistration::query()->create([
                'jbs_session_id' => $session->id,
                'jbs_level_id' => $level->id,
                'registration_number' => sprintf('B/%04d', $i),
                'first_name' => 'Student',
                'last_name' => sprintf('%02d', $i),
                'email' => "student{$i}@example.com",
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
        }

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/registrations?jbs_session_id='.$session->id.'&page=1&per_page=25');

        $response->assertOk();
        $response->assertJsonCount(25, 'data');
        $response->assertJsonPath('meta.total', 30);
        $response->assertJsonPath('meta.current_page', 1);
        $response->assertJsonPath('meta.last_page', 2);
        $response->assertJsonPath('meta.per_page', 25);

        $pageTwo = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/registrations?jbs_session_id='.$session->id.'&page=2&per_page=25');

        $pageTwo->assertOk();
        $pageTwo->assertJsonCount(5, 'data');
        $pageTwo->assertJsonPath('meta.current_page', 2);
    }

    public function test_admin_can_sort_registrations_by_name(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $session = JbsSession::query()->create(['name' => 'Summer', 'slug' => 'summer', 'is_past' => false]);
        $level = JbsLevel::query()->create([
            'jbs_session_id' => $session->id,
            'name' => 'Basic',
            'registration_prefix' => 'B',
        ]);

        $makeStudent = function (string $first, string $last, string $reg) use ($session, $level): void {
            JbsStudentRegistration::query()->create([
                'jbs_session_id' => $session->id,
                'jbs_level_id' => $level->id,
                'registration_number' => $reg,
                'first_name' => $first,
                'last_name' => $last,
                'email' => strtolower($reg).'@example.com',
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
        };

        $makeStudent('Ada', 'Lovelace', 'B/0001');
        $makeStudent('Grace', 'Hopper', 'B/0002');
        $makeStudent('Alan', 'Turing', 'B/0003');

        $asc = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/registrations?jbs_session_id='.$session->id.'&sort=name&sort_dir=asc');

        $asc->assertOk();
        $asc->assertJsonPath('data.0.full_name', 'Grace Hopper');
        $asc->assertJsonPath('data.1.full_name', 'Ada Lovelace');
        $asc->assertJsonPath('data.2.full_name', 'Alan Turing');

        $desc = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/admin/registrations?jbs_session_id='.$session->id.'&sort=name&sort_dir=desc');

        $desc->assertOk();
        $desc->assertJsonPath('data.0.full_name', 'Alan Turing');
        $desc->assertJsonPath('data.2.full_name', 'Grace Hopper');
    }
}
