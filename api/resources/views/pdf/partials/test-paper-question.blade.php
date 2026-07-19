@php
    $multiple = $question->allowsMultipleAnswers();
    $letters = range('A', 'Z');
@endphp
<div class="question">
    <div class="q-head">
        <span class="q-num">Q{{ $number }}.</span>
        {{ $question->prompt }}
        <span class="q-hint">({{ $multiple ? 'Select all that apply' : 'Select one' }})</span>
    </div>
    <div class="choices">
        @foreach($question->choices as $ci => $choice)
            <span class="choice-item">
                <span class="mark {{ $multiple ? '' : 'round' }}"></span>
                <span class="choice-label">{{ $letters[$ci] ?? ($ci + 1) }}.</span>
                <span class="choice-text">{{ $choice }}</span>
            </span>
        @endforeach
    </div>
</div>
