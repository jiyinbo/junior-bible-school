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
    public function maps_overall_average_to_five_band_scale(): void
    {
        $this->assertSame('Pass', $this->grading->overallGradeForPercent(39)['grade_label']);
        $this->assertTrue($this->grading->overallGradeForPercent(39)['passed']);
        $this->assertSame('Lower Credit', $this->grading->overallGradeForPercent(40)['grade_label']);
        $this->assertSame('Lower Credit', $this->grading->overallGradeForPercent(49.99)['grade_label']);
        $this->assertSame('Upper Credit', $this->grading->overallGradeForPercent(55)['grade_label']);
        $this->assertSame('Merit', $this->grading->overallGradeForPercent(65)['grade_label']);
        $this->assertSame('Distinction', $this->grading->overallGradeForPercent(80)['grade_label']);
        $this->assertSame('D', $this->grading->overallGradeForPercent(80)['grade_short']);
        $this->assertSame('M', $this->grading->overallGradeForPercent(65)['grade_short']);
        $this->assertSame('P', $this->grading->overallGradeForPercent(39)['grade_short']);
    }

    #[Test]
    public function overall_average_rounds_to_two_decimal_places(): void
    {
        $this->assertSame(66.67, $this->grading->overallAveragePercent([70, 60, 70]));
    }

    #[Test]
    public function maps_module_percentages_to_letter_grades(): void
    {
        $this->assertSame('NS', $this->grading->moduleGradeForPercent(0)['grade_short']);
        $this->assertSame('F', $this->grading->moduleGradeForPercent(29)['grade_short']);
        $this->assertSame('E', $this->grading->moduleGradeForPercent(35)['grade_short']);
        $this->assertFalse($this->grading->moduleGradeForPercent(35)['passed']);
        $this->assertSame('D', $this->grading->moduleGradeForPercent(40)['grade_short']);
        $this->assertTrue($this->grading->moduleGradeForPercent(45)['passed']);
        $this->assertSame('C', $this->grading->moduleGradeForPercent(55)['grade_short']);
        $this->assertSame('B', $this->grading->moduleGradeForPercent(65)['grade_short']);
        $this->assertSame('A', $this->grading->moduleGradeForPercent(80)['grade_short']);
    }

    #[Test]
    public function grading_keys_list_correct_bands(): void
    {
        $overall = $this->grading->gradingKey();
        $module = $this->grading->moduleGradingKey();

        $this->assertCount(5, $overall);
        $this->assertSame('≥70%', $overall[0]['range']);
        $this->assertSame('D', $overall[0]['short']);
        $this->assertSame('M', $overall[1]['short']);
        $this->assertSame('≥60% and <70%', $overall[1]['range']);
        $this->assertSame('P', $overall[4]['short']);
        $this->assertSame('<30%', $module[6]['range']);

        $this->assertSame('NS', $module[0]['short']);
        $this->assertSame('A', $module[1]['short']);
    }

    #[Test]
    public function graduation_requires_fewer_than_three_missed_tests(): void
    {
        $this->assertTrue($this->grading->eligibleForGraduation(10, 8));
        $this->assertFalse($this->grading->eligibleForGraduation(10, 7));
        $this->assertFalse($this->grading->eligibleForGraduation(5, 2));
    }
}
