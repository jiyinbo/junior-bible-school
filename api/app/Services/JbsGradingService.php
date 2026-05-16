<?php

namespace App\Services;

/**
 * Percentage-based grading for Junior Bible School.
 * Distinction / Upper Credit / etc. apply to the overall average only; modules use pass/fail at PASS_PERCENT.
 *
 * Lenient vocational scale: pass mark 40% (not the stricter 50% university norm).
 * Five bands — no separate “Merit” tier; 40–49% is Pass.
 */
class JbsGradingService
{
    public const PASS_PERCENT = 40;

    /** @var list<array{min: int, label: string, short: string}> */
    private const BANDS = [
        ['min' => 75, 'label' => 'Distinction', 'short' => 'D'],
        ['min' => 60, 'label' => 'Upper Credit', 'short' => 'UC'],
        ['min' => 50, 'label' => 'Lower Credit', 'short' => 'LC'],
        ['min' => 40, 'label' => 'Pass', 'short' => 'P'],
        ['min' => 0, 'label' => 'Fail', 'short' => 'F'],
    ];

    public function percentFromScores(float $score, float $maxScore): int
    {
        if ($maxScore <= 0) {
            return 0;
        }

        return (int) round(100 * $score / $maxScore);
    }

    /**
     * @return array{
     *     percent: int,
     *     grade_label: string,
     *     grade_short: string,
     *     passed: bool
     * }
     */
    public function gradeForPercent(int $percent): array
    {
        $percent = max(0, min(100, $percent));

        foreach (self::BANDS as $band) {
            if ($percent >= $band['min']) {
                return [
                    'percent' => $percent,
                    'grade_label' => $band['label'],
                    'grade_short' => $band['short'],
                    'passed' => $percent >= self::PASS_PERCENT,
                ];
            }
        }

        return [
            'percent' => $percent,
            'grade_label' => 'Fail',
            'grade_short' => 'F',
            'passed' => false,
        ];
    }

    /**
     * @return array{percent: int, grade_label: string, grade_short: string, passed: bool}
     */
    public function gradeForScores(float $score, float $maxScore): array
    {
        return $this->gradeForPercent($this->percentFromScores($score, $maxScore));
    }

    /**
     * Full scale for display (students and staff).
     *
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
        $bands = self::BANDS;
        $key = [];

        for ($i = 0; $i < count($bands); $i++) {
            $min = $bands[$i]['min'];
            $max = $i === 0 ? 100 : $bands[$i - 1]['min'] - 1;
            $key[] = [
                'min_percent' => $min,
                'max_percent' => $max,
                'label' => $bands[$i]['label'],
                'short' => $bands[$i]['short'],
                'range' => $min === $max ? "{$min}%" : "{$min}–{$max}%",
                'passed' => $min >= self::PASS_PERCENT,
            ];
        }

        return $key;
    }
}
