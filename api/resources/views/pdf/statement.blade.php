@php
    use App\Services\JbsGradingService;

    $grading = app(JbsGradingService::class);
    $outcomes = $registration->scoreOutcomes;
    $moduleCount = $outcomes->count();
    $percents = $outcomes->map(fn ($o) => $grading->gradeForScores((float) $o->score, (float) $o->max_score)['percent']);
    $averagePercent = $moduleCount > 0 ? (int) round($percents->avg()) : 0;
    $overallGrade = $grading->gradeForPercent($averagePercent);
    $passedCount = $outcomes->filter(fn ($o) => $grading->gradeForScores((float) $o->score, (float) $o->max_score)['passed'])->count();
    $issuedOn = now()->format('j F Y');
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Statement — {{ $registration->registration_number }}</title>
    <style>
        @page { size: A4 portrait; margin: 14mm; }
        body {
            margin: 0;
            font-family: DejaVu Sans, sans-serif;
            color: #111;
            font-size: 11pt;
        }
    </style>
</head>
<body>
@if(!empty($logoDataUri))
    <div style="position: fixed; left: 0; top: 0; width: 100%; height: 100%; text-align: center; z-index: -1;">
        <img src="{{ $logoDataUri }}" alt="" style="width: 50%; margin-top: 32%; opacity: 0.08;"/>
    </div>
@endif

<table cellpadding="0" cellspacing="0" style="width: 100%; border: 1.5pt solid #1a3352;">
    <tr>
        <td style="background: #1a3352; color: #fff; padding: 5mm 6mm;">
            <table cellpadding="0" cellspacing="0" style="width: 100%;">
                <tr>
                    @if(!empty($logoDataUri))
                        <td style="width: 18mm; vertical-align: middle; padding-right: 4mm;">
                            <img src="{{ $logoDataUri }}" alt="" style="height: 14mm; width: auto; display: block;"/>
                        </td>
                    @endif
                    <td style="vertical-align: middle;">
                        <div style="font-size: 18pt; font-weight: bold; line-height: 1.15;">Statement of Result</div>
                        <div style="font-size: 10pt; margin-top: 1.5mm; opacity: 0.92;">{{ $registration->session->name }}</div>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <tr>
        <td style="padding: 6mm;">
            <table cellpadding="0" cellspacing="0" style="width: 100%; background: #f7f9fc; border: 0.5pt solid #c5ced8; margin-bottom: 6mm;">
                <tr>
                    <td style="padding: 4mm 5mm; width: 50%; vertical-align: top;">
                        <div style="font-size: 8pt; color: #666; text-transform: uppercase; letter-spacing: 0.5pt;">Student</div>
                        <div style="font-size: 13pt; font-weight: bold; color: #1a3352; margin-top: 1mm;">{{ $registration->fullName() }}</div>
                    </td>
                    <td style="padding: 4mm 5mm; width: 50%; vertical-align: top; border-left: 0.5pt solid #c5ced8;">
                        <div style="font-size: 8pt; color: #666; text-transform: uppercase; letter-spacing: 0.5pt;">Registration</div>
                        <div style="font-size: 12pt; font-weight: bold; margin-top: 1mm;">{{ $registration->registration_number }}</div>
                    </td>
                </tr>
                <tr>
                    <td colspan="2" style="padding: 0 5mm 4mm; border-top: 0.5pt solid #c5ced8;">
                        <div style="font-size: 8pt; color: #666; text-transform: uppercase; letter-spacing: 0.5pt;">Level</div>
                        <div style="font-size: 11pt; font-weight: bold; margin-top: 1mm;">{{ $registration->level->name }}</div>
                    </td>
                </tr>
            </table>

            <div style="font-size: 10pt; font-weight: bold; color: #1a3352; margin-bottom: 3mm; text-transform: uppercase; letter-spacing: 0.5pt;">
                Module results
            </div>

            <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; border: 0.5pt solid #c5ced8; margin-bottom: 5mm;">
                <thead>
                <tr style="background: #1a3352; color: #fff;">
                    <th style="padding: 3mm 3mm; text-align: left; font-size: 9pt; width: 38%;">Module</th>
                    <th style="padding: 3mm; text-align: center; font-size: 9pt; width: 12%;">Score</th>
                    <th style="padding: 3mm; text-align: center; font-size: 9pt; width: 12%;">Max</th>
                    <th style="padding: 3mm; text-align: center; font-size: 9pt; width: 12%;">%</th>
                    <th style="padding: 3mm; text-align: center; font-size: 9pt; width: 26%;">Status</th>
                </tr>
                </thead>
                <tbody>
                @foreach($outcomes as $i => $o)
                    @php
                        $score = (int) round((float) $o->score);
                        $max = (int) round((float) $o->max_score);
                        $grade = $grading->gradeForScores((float) $o->score, (float) $o->max_score);
                        $pct = $grade['percent'];
                        $rowBg = $i % 2 === 0 ? '#ffffff' : '#f7f9fc';
                    @endphp
                    <tr style="background: {{ $rowBg }};">
                        <td style="padding: 3.5mm; border-top: 0.5pt solid #dde3ea; font-size: 10pt;">{{ $o->module->name }}</td>
                        <td style="padding: 3.5mm; border-top: 0.5pt solid #dde3ea; text-align: center; font-weight: bold;">{{ $score }}</td>
                        <td style="padding: 3.5mm; border-top: 0.5pt solid #dde3ea; text-align: center;">{{ $max }}</td>
                        <td style="padding: 3.5mm; border-top: 0.5pt solid #dde3ea; text-align: center; font-weight: bold;">{{ $pct }}%</td>
                        <td style="padding: 3.5mm; border-top: 0.5pt solid #dde3ea; text-align: center; font-size: 9pt; font-weight: bold; color: {{ $grade['passed'] ? '#1b5e20' : '#b45309' }};">
                            {{ $grade['passed'] ? 'Pass' : 'Fail' }}
                        </td>
                    </tr>
                @endforeach
                </tbody>
                <tfoot>
                <tr style="background: #eef2f7;">
                    <td style="padding: 3.5mm; font-weight: bold; border-top: 1pt solid #1a3352; font-size: 10pt;">Overall</td>
                    <td colspan="2" style="padding: 3.5mm; text-align: center; border-top: 1pt solid #1a3352; font-size: 9pt;">
                        {{ $passedCount }}/{{ $moduleCount }} passed (≥{{ JbsGradingService::PASS_PERCENT }}%)
                    </td>
                    <td style="padding: 3.5mm; text-align: center; font-weight: bold; border-top: 1pt solid #1a3352; color: #1a3352;">{{ $averagePercent }}%</td>
                    <td style="padding: 3.5mm; text-align: center; font-weight: bold; border-top: 1pt solid #1a3352; color: #1a3352; font-size: 10pt;">
                        {{ $overallGrade['grade_label'] }}
                    </td>
                </tr>
                </tfoot>
            </table>


            <table cellpadding="0" cellspacing="0" style="width: 100%; margin-top: 8mm;">
                <tr>
                    <td style="font-size: 9pt; color: #555; vertical-align: bottom;">
                        Junior Bible School · Winners Chapel International Dartford Campus
                    </td>
                    <td style="font-size: 9pt; color: #555; text-align: right; vertical-align: bottom;">
                        Issued: <strong>{{ $issuedOn }}</strong>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
