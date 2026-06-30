<?php

namespace App\Services;

/**
 * Percentage-based grading for Junior Bible School.
 *
 * Overall bands (Distinction, Merit, …) apply to the simple average across modules (2 d.p.).
 * Module bands (A–F, NS) apply to each module test result.
 */
class JbsGradingService
{
    /** Minimum module percent for a credit grade (D or better). */
    public const MODULE_CREDIT_PERCENT = 40;

    /** Missed tests at or above this count exclude a student from graduation presentation. */
    public const MAX_MISSED_TESTS_FOR_GRADUATION = 3;

    /** @var list<array{min: int, label: string, short: string}> */
    private const OVERALL_BANDS = [
        ['min' => 70, 'label' => 'Distinction', 'short' => 'D'],
        ['min' => 60, 'label' => 'Merit', 'short' => 'M'],
        ['min' => 50, 'label' => 'Upper Credit', 'short' => 'UC'],
        ['min' => 40, 'label' => 'Lower Credit', 'short' => 'LC'],
        ['min' => 0, 'label' => 'Pass', 'short' => 'P'],
    ];

    /** @var list<array{min: int, label: string, short: string}> */
    private const MODULE_BANDS = [
        ['min' => 70, 'label' => 'A', 'short' => 'A'],
        ['min' => 60, 'label' => 'B', 'short' => 'B'],
        ['min' => 50, 'label' => 'C', 'short' => 'C'],
        ['min' => 40, 'label' => 'D', 'short' => 'D'],
        ['min' => 30, 'label' => 'E', 'short' => 'E'],
        ['min' => 1, 'label' => 'F', 'short' => 'F'],
    ];

    public function percentFromScores(float $score, float $maxScore): int
    {
        if ($maxScore <= 0) {
            return 0;
        }

        return (int) round(100 * $score / $maxScore);
    }

    /**
     * Simple average of module percentages, rounded to 2 decimal places.
     *
     * @param  list<int|float>  $percents
     */
    public function overallAveragePercent(array $percents): ?float
    {
        if ($percents === []) {
            return null;
        }

        return round(array_sum($percents) / count($percents), 2);
    }

    /**
     * @return array{
     *     percent: float,
     *     grade_label: string,
     *     grade_short: string,
     *     passed: bool
     * }
     */
    public function overallGradeForPercent(float $percent): array
    {
        $percent = max(0, min(100, $percent));

        foreach (self::OVERALL_BANDS as $band) {
            if ($percent >= $band['min']) {
                return [
                    'percent' => $percent,
                    'grade_label' => $band['label'],
                    'grade_short' => $band['short'],
                    'passed' => true,
                ];
            }
        }

        return [
            'percent' => $percent,
            'grade_label' => 'Pass',
            'grade_short' => 'P',
            'passed' => true,
        ];
    }

    /**
     * @return array{
     *     percent: int,
     *     grade_label: string,
     *     grade_short: string,
     *     passed: bool,
     *     no_show: bool
     * }
     */
    public function moduleGradeForPercent(int $percent): array
    {
        $percent = max(0, min(100, $percent));

        if ($percent === 0) {
            return [
                'percent' => 0,
                'grade_label' => 'No Show',
                'grade_short' => 'NS',
                'passed' => false,
                'no_show' => true,
            ];
        }

        foreach (self::MODULE_BANDS as $band) {
            if ($percent >= $band['min']) {
                return [
                    'percent' => $percent,
                    'grade_label' => $band['label'],
                    'grade_short' => $band['short'],
                    'passed' => $percent >= self::MODULE_CREDIT_PERCENT,
                    'no_show' => false,
                ];
            }
        }

        return [
            'percent' => $percent,
            'grade_label' => 'F',
            'grade_short' => 'F',
            'passed' => false,
            'no_show' => false,
        ];
    }

    /**
     * @return array{percent: int, grade_label: string, grade_short: string, passed: bool, no_show: bool}
     */
    public function moduleGradeForScores(float $score, float $maxScore): array
    {
        return $this->moduleGradeForPercent($this->percentFromScores($score, $maxScore));
    }

    /**
     * @deprecated Use overallGradeForPercent() or moduleGradeForScores() explicitly.
     *
     * @return array{percent: int|float, grade_label: string, grade_short: string, passed: bool}
     */
    public function gradeForPercent(int $percent): array
    {
        return $this->overallGradeForPercent((float) $percent);
    }

    /**
     * @deprecated Use moduleGradeForScores().
     *
     * @return array{percent: int, grade_label: string, grade_short: string, passed: bool}
     */
    public function gradeForScores(float $score, float $maxScore): array
    {
        $grade = $this->moduleGradeForScores($score, $maxScore);

        return [
            'percent' => $grade['percent'],
            'grade_label' => $grade['grade_label'],
            'grade_short' => $grade['grade_short'],
            'passed' => $grade['passed'],
        ];
    }

    public function missedTestsCount(int $testsTotal, int $testsTaken): int
    {
        return max(0, $testsTotal - $testsTaken);
    }

    public function eligibleForGraduation(int $testsTotal, int $testsTaken): bool
    {
        return $this->missedTestsCount($testsTotal, $testsTaken) < self::MAX_MISSED_TESTS_FOR_GRADUATION;
    }

    /**
     * @return list<array{
     *     min_percent: int,
     *     max_percent: int,
     *     label: string,
     *     short: string,
     *     range: string,
     *     passed: bool
     * }>
     */
    public function gradingKey(): array
    {
        return $this->buildKey(self::OVERALL_BANDS, true);
    }

    /**
     * @return list<array{
     *     min_percent: int,
     *     max_percent: int,
     *     label: string,
     *     short: string,
     *     range: string,
     *     passed: bool
     * }>
     */
    public function moduleGradingKey(): array
    {
        $key = $this->buildKey(self::MODULE_BANDS, false);

        array_unshift($key, [
            'min_percent' => 0,
            'max_percent' => 0,
            'label' => 'No Show',
            'short' => 'NS',
            'range' => '0% (did not take test)',
            'passed' => false,
        ]);

        return $key;
    }

    /**
     * @param  list<array{min: int, label: string, short: string}>  $bands
     * @return list<array{
     *     min_percent: int,
     *     max_percent: int,
     *     label: string,
     *     short: string,
     *     range: string,
     *     passed: bool
     * }>
     */
    private function buildKey(array $bands, bool $overall): array
    {
        $key = [];

        for ($i = 0; $i < count($bands); $i++) {
            $min = $bands[$i]['min'];
            $max = $i === 0 ? 100 : $bands[$i - 1]['min'] - 1;
            $isLowest = $i === count($bands) - 1;
            $key[] = [
                'min_percent' => $min,
                'max_percent' => $max,
                'label' => $bands[$i]['label'],
                'short' => $bands[$i]['short'],
                'range' => $this->formatRange(
                    $min,
                    $max,
                    $overall && $isLowest,
                    ! $overall && $isLowest && $bands[$i]['short'] === 'F',
                    $i === 0,
                ),
                'passed' => $overall ? true : $min >= self::MODULE_CREDIT_PERCENT,
            ];
        }

        return $key;
    }

    private function formatRange(
        int $min,
        int $max,
        bool $isLowestOverallBand,
        bool $isModuleF = false,
        bool $isTopBand = false,
    ): string {
        if ($isLowestOverallBand && $max < 40) {
            return '<40%';
        }

        if ($isModuleF) {
            return '<30%';
        }

        if ($min === $max) {
            return "{$min}%";
        }

        if ($isTopBand) {
            return "≥{$min}%";
        }

        return "≥{$min}% and <".($max + 1).'%';
    }
}
