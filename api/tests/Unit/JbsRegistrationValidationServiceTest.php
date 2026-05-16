<?php

namespace Tests\Unit;

use App\Models\JbsLevel;
use App\Models\JbsSession;
use App\Services\JbsRegistrationValidationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class JbsRegistrationValidationServiceTest extends TestCase
{
    use RefreshDatabase;

    private JbsRegistrationValidationService $validation;

    protected function setUp(): void
    {
        parent::setUp();
        $this->validation = new JbsRegistrationValidationService;
    }

    #[Test]
    public function rejects_child_under_13_in_advanced_level(): void
    {
        $session = JbsSession::query()->create(['name' => 'S', 'slug' => 's', 'is_past' => false]);
        $level = JbsLevel::query()->create([
            'jbs_session_id' => $session->id,
            'name' => 'Advanced',
            'placement_group' => JbsRegistrationValidationService::PLACEMENT_ADVANCED,
            'registration_prefix' => 'A',
        ]);

        $this->expectException(ValidationException::class);

        $this->validation->assertChildPlacementRules([
            'jbs_level_id' => $level->id,
            'date_of_birth' => now()->subYears(12)->toDateString(),
        ]);
    }
}
