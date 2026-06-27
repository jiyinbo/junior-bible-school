<?php

namespace App\Services;

use App\Models\JbsQuestion;
use App\Models\JbsStudentRegistration;
use App\Models\JbsTest;
use Illuminate\Support\Collection;

/**
 * Deterministic per-candidate shuffle for CBT question and choice order.
 */
class JbsTestLayoutService
{
    public function seedFor(int $testId, int $registrationId): int
    {
        return crc32("{$testId}:{$registrationId}");
    }

    public function seedForQuestion(int $baseSeed, int $questionId): int
    {
        return crc32("{$baseSeed}:{$questionId}");
    }

    /**
     * @template T
     *
     * @param  list<T>  $items
     * @return list<T>
     */
    public function shuffle(array $items, int $seed): array
    {
        if (count($items) <= 1) {
            return array_values($items);
        }

        $result = array_values($items);
        $state = $seed & 0x7FFFFFFF;

        for ($i = count($result) - 1; $i > 0; $i--) {
            $state = $this->nextRandom($state);
            $j = $state % ($i + 1);
            [$result[$i], $result[$j]] = [$result[$j], $result[$i]];
        }

        return $result;
    }

    /**
     * @param  Collection<int, JbsQuestion>  $questions
     * @return array{question_order: list<int>, choice_permutations: array<string, list<int>>}
     */
    public function buildLayout(JbsTest $test, JbsStudentRegistration $registration, Collection $questions): array
    {
        $baseSeed = $this->seedFor($test->id, $registration->id);
        $questionOrder = $this->shuffle($questions->pluck('id')->all(), $baseSeed);

        $choicePermutations = [];
        foreach ($questions as $question) {
            $indices = range(0, max(0, count($question->choices ?? []) - 1));
            $choicePermutations[(string) $question->id] = $this->shuffle(
                $indices,
                $this->seedForQuestion($baseSeed, $question->id),
            );
        }

        return [
            'question_order' => $questionOrder,
            'choice_permutations' => $choicePermutations,
        ];
    }

    /**
     * @param  Collection<int, JbsQuestion>  $questions
     * @return list<array<string, mixed>>
     */
    public function presentQuestions(Collection $questions, array $layout): array
    {
        $byId = $questions->keyBy('id');
        $presented = [];

        foreach ($layout['question_order'] as $position => $questionId) {
            /** @var JbsQuestion $question */
            $question = $byId[$questionId];
            $permutation = $layout['choice_permutations'][(string) $questionId];
            $canonicalChoices = $question->choices ?? [];
            $displayChoices = array_map(
                fn (int $canonicalIndex) => $canonicalChoices[$canonicalIndex],
                $permutation,
            );

            $presented[] = [
                'id' => $question->id,
                'prompt' => $question->prompt,
                'choices' => $displayChoices,
                'position' => $position,
                'selection_mode' => $question->selectionMode(),
            ];
        }

        return $presented;
    }

    /**
     * @param  int|list<int>|null  $displayGiven
     * @param  list<int>  $permutation
     * @return int|list<int>|null
     */
    public function remapDisplayToCanonical(int|array|null $displayGiven, array $permutation): int|array|null
    {
        if ($displayGiven === null) {
            return null;
        }

        if (is_array($displayGiven)) {
            $canonical = array_map(
                fn (int $displayIndex) => $permutation[$displayIndex],
                $displayGiven,
            );
            sort($canonical);

            return array_values($canonical);
        }

        return $permutation[$displayGiven];
    }

    /**
     * @param  array<string|int, mixed>  $displayAnswers
     * @return array<string, int|list<int>|null>
     */
    public function remapAnswerPayload(array $displayAnswers, array $layout): array
    {
        $canonicalAnswers = [];

        foreach ($displayAnswers as $questionId => $given) {
            $permutation = $layout['choice_permutations'][(string) $questionId] ?? null;
            if ($permutation === null) {
                continue;
            }

            $canonicalAnswers[(string) $questionId] = $this->remapDisplayToCanonical($given, $permutation);
        }

        return $canonicalAnswers;
    }

    private function nextRandom(int $state): int
    {
        return ($state * 1103515245 + 12345) & 0x7FFFFFFF;
    }
}
