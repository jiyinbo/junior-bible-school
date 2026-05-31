<!DOCTYPE html>
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Test — {{ $module->name }}</title>
    <style>
        @page { size: A4 portrait; margin: 12mm; }
        body { margin: 0; font-family: DejaVu Sans, sans-serif; color: #111; font-size: 10.5pt; line-height: 1.35; }
        h1 { font-size: 14pt; margin: 0 0 2mm; color: #1a3352; }
        .meta { font-size: 9pt; color: #444; margin-bottom: 5mm; }
        .student-box {
            width: 100%;
            border: 0.75pt solid #333;
            border-collapse: collapse;
            margin-bottom: 6mm;
            font-size: 10pt;
        }
        .student-box td { padding: 2.5mm 3mm; border: 0.5pt solid #ccc; vertical-align: bottom; }
        .student-box .label { width: 28%; font-weight: bold; background: #f7f9fc; }
        .student-box .field { min-height: 7mm; }
        .instructions {
            background: #f7f9fc;
            border: 0.5pt solid #c5ced8;
            padding: 3mm 4mm;
            margin-bottom: 6mm;
            font-size: 9pt;
        }
        .question {
            margin-bottom: 7mm;
            page-break-inside: avoid;
        }
        .q-head { font-weight: bold; margin-bottom: 2mm; }
        .q-num { color: #1a3352; }
        .q-hint { font-size: 8.5pt; color: #666; font-weight: normal; font-style: italic; }
        .choices { margin: 0; padding: 0; list-style: none; }
        .choices li { margin: 1.5mm 0; padding-left: 1mm; }
        .mark {
            display: inline-block;
            width: 4mm;
            height: 4mm;
            border: 0.75pt solid #333;
            margin-right: 2.5mm;
            vertical-align: middle;
        }
        .mark.round { border-radius: 50%; }
        .choice-label { font-weight: bold; margin-right: 1.5mm; }
        .footer { margin-top: 8mm; font-size: 8pt; color: #666; text-align: center; border-top: 0.5pt solid #ccc; padding-top: 3mm; }
    </style>
</head>
<body>
    <h1>{{ $module->name }}</h1>
    <div class="meta">
        {{ $session->name }} · {{ $level->name }}
        @if($test->duration_minutes)
            · Duration: {{ $test->duration_minutes }} minutes
        @endif
        · {{ $questions->count() }} question{{ $questions->count() === 1 ? '' : 's' }}
    </div>

    <table class="student-box" cellpadding="0" cellspacing="0">
        <tr>
            <td class="label">Student name</td>
            <td class="field" colspan="3">&nbsp;</td>
        </tr>
        <tr>
            <td class="label">Registration number</td>
            <td class="field" colspan="3">&nbsp;</td>
        </tr>
        <tr>
            <td class="label">Date</td>
            <td class="field" style="width: 35%;">&nbsp;</td>
            <td class="label" style="width: 18%;">Score</td>
            <td class="field">&nbsp;</td>
        </tr>
    </table>

    <div class="instructions">
        Read each question carefully. Mark your answer(s) in the box beside each option.
        @if($test->duration_minutes)
            You have <strong>{{ $test->duration_minutes }} minutes</strong> to complete this test.
        @endif
        Do not write on this question paper if separate answer sheets are used — otherwise write clearly.
    </div>

    @foreach($questions as $index => $question)
        @php
            $multiple = $question->allowsMultipleAnswers();
            $letters = range('A', 'Z');
        @endphp
        <div class="question">
            <div class="q-head">
                <span class="q-num">Question {{ $index + 1 }}.</span>
                {{ $question->prompt }}
                <span class="q-hint">
                    ({{ $multiple ? 'Select all that apply' : 'Select one answer' }})
                </span>
            </div>
            <ul class="choices">
                @foreach($question->choices as $ci => $choice)
                    <li>
                        <span class="mark {{ $multiple ? '' : 'round' }}"></span>
                        <span class="choice-label">{{ $letters[$ci] ?? ($ci + 1) }}.</span>
                        {{ $choice }}
                    </li>
                @endforeach
            </ul>
        </div>
    @endforeach

    <div class="footer">
        Junior Bible School · {{ $session->name }} · {{ $level->name }} · {{ $module->name }}
    </div>
</body>
</html>
