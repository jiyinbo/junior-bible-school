<?php

namespace Tests\Unit;

use App\Services\JbsGradingService;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class JbsGradingServiceTest extends TestCase
{
    private JbsGradingService $grading;

    protected function setUp(): void
    {
        parent::setUp();
        $this->grading = new JbsGradingService;
    }

    #[Test]
    public function maps_percentages_to_lenient_scale(): void
    {
        $this->assertSame('Fail', $this->grading->gradeForPercent(39)['grade_label']);
        $this->assertFalse($this->grading->gradeForPercent(39)['passed']);
        $this->assertSame('Pass', $this->grading->gradeForPercent(40)['grade_label']);
        $this->assertTrue($this->grading->gradeForPercent(45)['passed']);
        $this->assertSame('Lower Credit', $this->grading->gradeForPercent(55)['grade_label']);
        $this->assertSame('Upper Credit', $this->grading->gradeForPercent(65)['grade_label']);
        $this->assertSame('Distinction', $this->grading->gradeForPercent(80)['grade_label']);
    }

    #[Test]
    public function grading_key_lists_five_bands_starting_at_pass_40(): void
    {
        $key = $this->grading->gradingKey();

        $this->assertCount(5, $key);
        $this->assertSame('75–100%', $key[0]['range']);
        $this->assertSame('Pass', $key[3]['label']);
        $this->assertSame('40–49%', $key[3]['range']);
    }
}
