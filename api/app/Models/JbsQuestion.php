<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JbsQuestion extends Model
{
    protected $table = 'jbs_questions';

    protected $fillable = [
        'jbs_test_id',
        'prompt',
        'choices',
        'correct_indices',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'choices' => 'array',
            'correct_indices' => 'array',
        ];
    }

    public function test(): BelongsTo
    {
        return $this->belongsTo(JbsTest::class, 'jbs_test_id');
    }

    /** @return list<int> */
    public function normalizedCorrectIndices(): array
    {
        $indices = $this->correct_indices ?? [];

        return array_values(array_unique(array_map('intval', $indices)));
    }

    public function allowsMultipleAnswers(): bool
    {
        return count($this->normalizedCorrectIndices()) > 1;
    }

    public function selectionMode(): string
    {
        return $this->allowsMultipleAnswers() ? 'multiple' : 'single';
    }

    /**
     * @param  int|list<int>|null  $given
     */
    public function isAnswerCorrect(int|array|null $given): bool
    {
        $selected = $this->normalizeGivenIndices($given);
        $expected = $this->normalizedCorrectIndices();

        if ($this->allowsMultipleAnswers()) {
            sort($selected);

            return $selected === $expected;
        }

        return count($selected) === 1 && $selected[0] === $expected[0];
    }

    /**
     * @return list<int>
     */
    private function normalizeGivenIndices(int|array|null $given): array
    {
        if ($given === null) {
            return [];
        }

        $indices = is_array($given) ? $given : [$given];

        return array_values(array_unique(array_map('intval', $indices)));
    }
}
