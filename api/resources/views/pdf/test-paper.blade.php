<!DOCTYPE html>
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Test — {{ $module->name }}</title>
    <style>
        @page { size: A4 portrait; margin: 9mm 10mm 10mm; }
        body { margin: 0; font-family: DejaVu Sans, sans-serif; color: #111; font-size: 9pt; line-height: 1.22; }
        h1 { font-size: 12pt; margin: 0 0 1mm; color: #1a3352; }
        .meta { font-size: 7.5pt; color: #444; margin-bottom: 2.5mm; }
        .instructions {
            background: #f7f9fc;
            border: 0.5pt solid #c5ced8;
            padding: 1.8mm 2.5mm;
            margin-bottom: 3mm;
            font-size: 7.5pt;
            line-height: 1.25;
        }
        .questions { width: 100%; }
        .question { margin-bottom: 3mm; }
        .q-head { font-weight: bold; margin-bottom: 0.8mm; font-size: 8.5pt; line-height: 1.2; }
        .q-num { color: #1a3352; }
        .q-hint { font-size: 7pt; color: #666; font-weight: normal; font-style: italic; }
        .choices {
            margin-top: 0.5mm;
            line-height: 1.2;
        }
        .choice-item {
            display: inline-block;
            margin: 0 3mm 0.6mm 0;
            font-size: 8.5pt;
            vertical-align: top;
            max-width: 100%;
        }
        .mark {
            display: inline-block;
            width: 3.2mm;
            height: 3.2mm;
            border: 0.75pt solid #333;
            margin-right: 1.2mm;
            vertical-align: -0.4mm;
        }
        .mark.round { border-radius: 50%; }
        .choice-label { font-weight: bold; margin-right: 1mm; }
        .footer {
            margin-top: 3mm;
            font-size: 6.5pt;
            color: #666;
            text-align: center;
            border-top: 0.5pt solid #ccc;
            padding-top: 1.5mm;
        }
    </style>
</head>
<body>
    <h1>{{ $module->name }}</h1>
    <div class="meta">
        {{ $session->name }} · {{ $level->name }}
        @if($test->duration_minutes)
            · {{ $test->duration_minutes }} min
        @endif
        · {{ $questions->count() }} question{{ $questions->count() === 1 ? '' : 's' }}
    </div>

    <div class="instructions">
        Mark your answer(s) beside each option.
        @if($test->duration_minutes)
            Time allowed: <strong>{{ $test->duration_minutes }} minutes</strong>.
        @endif
        Write clearly. Do not mark outside the answer boxes.
    </div>

    <div class="questions">
        @foreach($questions as $index => $question)
            @include('pdf.partials.test-paper-question', [
                'question' => $question,
                'number' => $index + 1,
            ])
        @endforeach
    </div>

    <div class="footer">
        Junior Bible School · {{ $session->name }} · {{ $level->name }} · {{ $module->name }}
    </div>
</body>
</html>
