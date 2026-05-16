@php
    $navy = '#1a3352';
    $gold = '#b8860b';
    $w = 297;
    $h = 210;
    $issuedOn = $registration->level_completed_at?->format('j F Y');
    $sessionSubtitle = trim(preg_replace('/\s*-\s*\d{4}\s*$/', '', $registration->session->name) ?: $registration->session->name);
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Certificate — {{ $registration->registration_number }}</title>
    <style>
        @page { size: A4 landscape; margin: 8mm; }
        html, body {
            margin: 0;
            padding: 0;
            font-family: DejaVu Sans, sans-serif;
            color: #111;
        }
        table { border-collapse: collapse; page-break-inside: avoid; }
    </style>
</head>
<body>
<table cellpadding="0" cellspacing="0" style="width:100%;border:2pt double {{ $navy }};">
    <tr>
        <td style="border:5pt solid #f5f0e6;padding:10mm 14mm;text-align:center;vertical-align:middle;">
            @if(!empty($logoDataUri))
                <img src="{{ $logoDataUri }}" alt="" style="height:18mm;width:auto;margin-bottom:3mm;"/>
            @endif
            <div style="font-size:9pt;letter-spacing:2pt;color:{{ $navy }};font-weight:bold;text-transform:uppercase;">
                Junior Bible School
            </div>
            <div style="font-size:8pt;color:#555;margin-bottom:4mm;">{{ $sessionSubtitle }}</div>

            <div style="font-size:22pt;letter-spacing:1pt;color:{{ $navy }};font-weight:bold;text-transform:uppercase;margin-bottom:3mm;">
                Certificate of Completion
            </div>
            <div style="width:45mm;height:0.5pt;background:{{ $gold }};margin:0 auto 6mm;"></div>

            <div style="font-size:10pt;color:#333;margin-bottom:3mm;">This is to certify that</div>
            <div style="font-size:24pt;font-weight:bold;color:{{ $gold }};margin-bottom:5mm;line-height:1.1;">
                {{ $registration->fullName() }}
            </div>
            <div style="font-size:11pt;line-height:1.45;margin-bottom:8mm;">
                has successfully completed the programme<br/>
                <strong>{{ $registration->level->name }}</strong><br/>
                <span style="font-size:9pt;color:#555;">{{ $registration->session->name }}</span>
            </div>

            <table cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                    <td style="width:50%;text-align:left;font-size:8.5pt;color:#555;">
                        Registration: <strong style="color:{{ $navy }};">{{ $registration->registration_number }}</strong>
                    </td>
                    <td style="width:50%;text-align:right;font-size:8.5pt;color:#555;">
                        Date issued: <strong style="color:{{ $navy }};">{{ $issuedOn ?? '—' }}</strong>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
