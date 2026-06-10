@php
    use Illuminate\Support\Str;

    $navy = '#1a3352';
    $w = $cardWidthMm ?? 53.98;
    $h = $cardHeightMm ?? 85.60;
    $sessionName = $registration->session->name;
    $sessionSubtitle = Str::limit(trim(preg_replace('/\s*-\s*\d{4}\s*$/', '', $sessionName) ?: $sessionName), 30);
    $levelLabel = Str::limit($registration->level->name, 36);
    $studentName = Str::limit($registration->fullName(), 32, '');
    $year = $registration->session->session_ends_at?->format('Y')
        ?? $registration->session->session_starts_at?->format('Y')
        ?? (preg_match('/\d{4}/', $sessionName, $m) ? $m[0] : now()->format('Y'));

    // The header, body and footer are absolutely positioned inside a single
    // page-sized box. Keeping everything out of the normal document flow stops
    // DomPDF from ever spilling the card onto a second/third page (its flow
    // layout adds blank pages when content meets or exceeds the tiny card page),
    // while still letting the card fill the whole card edge-to-edge.
    $headerH = 13;
    $footerH = 6.5;
    $qrMm = 20;
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>{{ $registration->registration_number }}</title>
    <style>
        @page {
            size: {{ $w }}mm {{ $h }}mm;
            margin: 0;
        }

        * { box-sizing: border-box; }

        html, body {
            margin: 0;
            padding: 0;
            width: {{ $w }}mm;
            height: {{ $h }}mm;
            font-family: DejaVu Sans, sans-serif;
            color: #111;
        }

        table { border-collapse: collapse; }
    </style>
</head>
<body>
<div style="position:absolute;top:0;left:0;width:{{ $w }}mm;height:{{ $h }}mm;border:0.4mm solid {{ $navy }};border-radius:2.5mm;overflow:hidden;">

    {{-- Header --}}
    <div style="position:absolute;top:0;left:0;width:100%;height:{{ $headerH }}mm;background-color:{{ $navy }};color:#ffffff;overflow:hidden;">
        <table cellpadding="0" cellspacing="0" style="width:100%;height:{{ $headerH }}mm;"><tr>
            <td style="vertical-align:middle;text-align:center;padding:0 2mm;">
                <div style="font-size:6.4pt;font-weight:bold;letter-spacing:0.6pt;line-height:1.15;text-transform:uppercase;">
                    Junior Bible School
                </div>
                <div style="font-size:5pt;margin-top:0.6mm;line-height:1.2;opacity:0.95;">
                    {{ $sessionSubtitle }}
                </div>
            </td>
        </tr></table>
    </div>

    {{-- Body --}}
    <div style="position:absolute;top:{{ $headerH }}mm;bottom:{{ $footerH }}mm;left:0;width:100%;background-color:#ffffff;overflow:hidden;text-align:center;">
        @if(!empty($logoDataUri))
            <div style="position:absolute;left:0;top:9mm;width:100%;text-align:center;">
                <img src="{{ $logoDataUri }}" alt="" style="width:28mm;opacity:0.07;"/>
            </div>
        @endif

        <table cellpadding="0" cellspacing="0" style="width:100%;position:relative;">
            {{-- Lanyard slot --}}
            <tr>
                <td style="padding:1.4mm 0 1.6mm;text-align:center;">
                    <div style="width:9mm;height:2.2mm;border:0.35mm solid #b8c0cc;border-radius:1.1mm;margin:0 auto;background-color:#eef1f5;"></div>
                </td>
            </tr>
            {{-- QR --}}
            <tr>
                <td style="padding-bottom:1.6mm;text-align:center;">
                    <img src="{{ $qrDataUri }}" alt="QR" style="width:{{ $qrMm }}mm;height:{{ $qrMm }}mm;border:0.5mm solid {{ $navy }};display:block;margin:0 auto;"/>
                </td>
            </tr>
            {{-- Registration --}}
            <tr>
                <td style="font-size:7pt;font-weight:bold;color:{{ $navy }};padding-bottom:1mm;text-align:center;">
                    {{ $registration->registration_number }}
                </td>
            </tr>
            {{-- Name --}}
            <tr>
                <td style="font-size:9pt;font-weight:bold;color:{{ $navy }};text-transform:uppercase;line-height:1.1;padding:0 1.5mm 1.6mm;text-align:center;">
                    {{ $studentName }}
                </td>
            </tr>
            {{-- Divider with dot --}}
            <tr>
                <td style="padding:0 4mm 1.6mm;">
                    <table cellpadding="0" cellspacing="0" style="width:100%;"><tr>
                        <td style="border-bottom:0.25mm solid {{ $navy }};width:42%;">&nbsp;</td>
                        <td style="width:16%;text-align:center;font-size:5pt;color:{{ $navy }};vertical-align:middle;line-height:1;">&#9679;</td>
                        <td style="border-bottom:0.25mm solid {{ $navy }};width:42%;">&nbsp;</td>
                    </tr></table>
                </td>
            </tr>
            {{-- Level --}}
            <tr>
                <td style="padding-bottom:1.6mm;text-align:center;">
                    <div style="font-size:5pt;font-weight:bold;color:{{ $navy }};letter-spacing:0.5pt;">LEVEL</div>
                    <div style="font-size:6.5pt;font-weight:bold;color:#111;margin-top:0.4mm;line-height:1.12;">{{ $levelLabel }}</div>
                </td>
            </tr>
            {{-- Plain divider --}}
            <tr>
                <td style="padding:0 5mm 1.6mm;">
                    <div style="border-bottom:0.25mm solid {{ $navy }};width:100%;">&nbsp;</div>
                </td>
            </tr>
            {{-- Campus --}}
            <tr>
                <td style="text-align:center;">
                    <div style="font-size:5pt;font-weight:bold;color:{{ $navy }};letter-spacing:0.5pt;">CAMPUS</div>
                    <div style="font-size:6pt;font-weight:bold;color:#111;margin-top:0.4mm;line-height:1.18;">
                        {{ $campusLine1 ?? 'Winners Chapel International' }}<br/>
                        {{ $campusLine2 ?? 'Dartford Campus' }}
                    </div>
                </td>
            </tr>
        </table>
    </div>

    {{-- Footer --}}
    <div style="position:absolute;bottom:0;left:0;width:100%;height:{{ $footerH }}mm;background-color:{{ $navy }};color:#ffffff;overflow:hidden;">
        <table cellpadding="0" cellspacing="0" style="width:100%;height:{{ $footerH }}mm;"><tr>
            <td style="text-align:center;vertical-align:middle;font-size:11pt;font-weight:bold;letter-spacing:1pt;">
                {{ $year }}
            </td>
        </tr></table>
    </div>

</div>
</body>
</html>
