@php
    use Illuminate\Support\Str;

    $navy = '#1a3352';
    $w = $cardWidthMm ?? 53.98;
    $h = $cardHeightMm ?? 85.60;
    $sessionName = $registration->session->name;
    $sessionSubtitle = Str::limit(trim(preg_replace('/\s*-\s*\d{4}\s*$/', '', $sessionName) ?: $sessionName), 44);
    $levelLabel = Str::limit($registration->level->name, 36);
    $studentName = Str::limit($registration->fullName(), 32, '');
    $year = $registration->session->session_ends_at?->format('Y')
        ?? $registration->session->session_starts_at?->format('Y')
        ?? (preg_match('/\d{4}/', $sessionName, $m) ? $m[0] : now()->format('Y'));

    // The header, body and footer are absolutely positioned inside a single
    // page-sized box. Keeping everything out of the normal document flow stops
    // DomPDF from ever spilling the card onto a second/third page (its flow
    // layout adds blank pages when content meets or exceeds the tiny card page),
    // while still letting the card fill the whole card edge-to-edge. Content is
    // kept compact so it always fits the body region without being clipped.
    $headerH = 12.5;
    $footerH = 6;
    $qrMm = 15;
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
                <div style="font-size:4.6pt;margin-top:0.5mm;line-height:1.15;opacity:0.95;">
                    {{ $sessionSubtitle }}
                </div>
            </td>
        </tr></table>
    </div>

    {{-- Body. A wrapper table vertically centres the content block so the
         top/bottom whitespace stays balanced, and every section uses the same
         vertical gap so the rhythm around the separators is even. --}}
    <div style="position:absolute;top:{{ $headerH }}mm;bottom:{{ $footerH }}mm;left:0;width:100%;background-color:#ffffff;overflow:hidden;text-align:center;">
        @if(!empty($logoDataUri))
            <div style="position:absolute;left:0;top:8mm;width:100%;text-align:center;">
                <img src="{{ $logoDataUri }}" alt="" style="width:26mm;opacity:0.07;"/>
            </div>
        @endif

        <table cellpadding="0" cellspacing="0" style="width:100%;height:100%;position:relative;"><tr><td style="vertical-align:middle;">
        <table cellpadding="0" cellspacing="0" style="width:100%;">
            {{-- Lanyard slot --}}
            <tr>
                <td style="padding-bottom:2.5mm;text-align:center;">
                    <div style="width:9mm;height:2mm;border:0.35mm solid #b8c0cc;border-radius:1mm;margin:0 auto;background-color:#eef1f5;"></div>
                </td>
            </tr>
            {{-- QR --}}
            <tr>
                <td style="padding-bottom:2.5mm;text-align:center;">
                    <img src="{{ $qrDataUri }}" alt="QR" style="width:{{ $qrMm }}mm;height:{{ $qrMm }}mm;border:0.4mm solid {{ $navy }};display:block;margin:0 auto;"/>
                </td>
            </tr>
            {{-- Registration --}}
            <tr>
                <td style="font-size:7pt;font-weight:bold;color:{{ $navy }};padding-bottom:2mm;text-align:center;">
                    {{ $registration->registration_number }}
                </td>
            </tr>
            {{-- Name --}}
            <tr>
                <td style="font-size:9pt;font-weight:bold;color:{{ $navy }};text-transform:uppercase;line-height:1.05;padding:0 1.5mm 2.5mm;text-align:center;">
                    {{ $studentName }}
                </td>
            </tr>
            {{-- Divider with a dot centred on the line --}}
            <tr>
                <td style="padding:0 4mm 2.5mm;">
                    <table cellpadding="0" cellspacing="0" style="width:100%;"><tr>
                        <td style="width:42%;vertical-align:middle;"><div style="border-bottom:0.3mm solid {{ $navy }};font-size:0;line-height:0;height:0;">&nbsp;</div></td>
                        <td style="width:16%;text-align:center;vertical-align:middle;font-size:7pt;color:{{ $navy }};line-height:0;">&#9679;</td>
                        <td style="width:42%;vertical-align:middle;"><div style="border-bottom:0.3mm solid {{ $navy }};font-size:0;line-height:0;height:0;">&nbsp;</div></td>
                    </tr></table>
                </td>
            </tr>
            {{-- Level --}}
            <tr>
                <td style="padding-bottom:2.5mm;text-align:center;">
                    <div style="font-size:5pt;font-weight:bold;color:{{ $navy }};letter-spacing:0.5pt;">LEVEL</div>
                    <div style="font-size:6.5pt;font-weight:bold;color:#111;margin-top:0.6mm;line-height:1.1;">{{ $levelLabel }}</div>
                </td>
            </tr>
            {{-- Plain divider --}}
            <tr>
                <td style="padding:0 5mm 2.5mm;">
                    <div style="border-bottom:0.3mm solid {{ $navy }};font-size:0;line-height:0;height:0;">&nbsp;</div>
                </td>
            </tr>
            {{-- Campus --}}
            <tr>
                <td style="text-align:center;">
                    <div style="font-size:5pt;font-weight:bold;color:{{ $navy }};letter-spacing:0.5pt;">CAMPUS</div>
                    <div style="font-size:6pt;font-weight:bold;color:#111;margin-top:0.6mm;line-height:1.15;">
                        {{ $campusLine1 ?? 'Winners Chapel International' }}<br/>
                        {{ $campusLine2 ?? 'Dartford Campus' }}
                    </div>
                </td>
            </tr>
        </table>
        </td></tr></table>
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
