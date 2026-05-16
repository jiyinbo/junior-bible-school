@php
    use Illuminate\Support\Str;

    $navy = '#1a3352';
    $w = $cardWidthMm ?? 53.98;
    $h = $cardHeightMm ?? 85.60;
    $sessionName = $registration->session->name;
    $sessionSubtitle = Str::limit(trim(preg_replace('/\s*-\s*\d{4}\s*$/', '', $sessionName) ?: $sessionName), 30);
    $levelLabel = Str::limit($registration->level->name, 36);
    $year = $registration->session->session_ends_at?->format('Y')
        ?? $registration->session->session_starts_at?->format('Y')
        ?? (preg_match('/\d{4}/', $sessionName, $m) ? $m[0] : now()->format('Y'));
    $qrMm = 30;
    $headerH = 17;
    $footerH = 7.5;
    $bodyH = round($h - $headerH - $footerH, 1);
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

        html, body {
            margin: 0;
            padding: 0;
            width: {{ $w }}mm;
            height: {{ $h }}mm;
            font-family: DejaVu Sans, sans-serif;
            color: #111;
        }

        table { border-collapse: collapse; table-layout: fixed; }
    </style>
</head>
<body>
<table cellpadding="0" cellspacing="0" style="width:{{ $w }}mm;height:{{ $h }}mm;border-radius:2.5mm;overflow:hidden;border:0.4mm solid {{ $navy }};">
    {{-- Header --}}
    <tr style="height:{{ $headerH }}mm;background-color:{{ $navy }};">
        <td style="padding:2mm 2.5mm 2.5mm;vertical-align:middle;">
            <table cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                    @if(!empty($logoDataUri))
                        <td style="width:11mm;vertical-align:middle;padding-right:1.5mm;">
                            <img src="{{ $logoDataUri }}" alt="" style="height:10mm;width:auto;display:block;"/>
                        </td>
                    @endif
                    <td style="vertical-align:middle;color:#ffffff;">
                        <div style="font-size:6.2pt;font-weight:bold;letter-spacing:0.6pt;line-height:1.15;text-transform:uppercase;">
                            Junior Bible School
                        </div>
                        <div style="font-size:5pt;margin-top:0.8mm;line-height:1.2;opacity:0.95;">
                            {{ $sessionSubtitle }}
                        </div>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    {{-- Body --}}
    <tr style="height:{{ $bodyH }}mm;background-color:#ffffff;">
        <td style="padding:0 3mm 1.5mm;vertical-align:top;text-align:center;position:relative;">
            @if(!empty($logoDataUri))
                <div style="position:absolute;left:0;top:8mm;width:100%;text-align:center;z-index:0;">
                    <img src="{{ $logoDataUri }}" alt="" style="width:28mm;opacity:0.07;"/>
                </div>
            @endif

            <table cellpadding="0" cellspacing="0" style="width:100%;position:relative;z-index:1;">
                {{-- Lanyard slot --}}
                <tr>
                    <td style="padding:1mm 0 2mm;text-align:center;">
                        <div style="width:9mm;height:2.2mm;border:0.35mm solid #b8c0cc;border-radius:1.1mm;margin:0 auto;background-color:#eef1f5;"></div>
                    </td>
                </tr>
                {{-- QR --}}
                <tr>
                    <td style="padding-bottom:1.5mm;text-align:center;">
                        <img src="{{ $qrDataUri }}" alt="QR" style="width:{{ $qrMm }}mm;height:{{ $qrMm }}mm;border:0.5mm solid {{ $navy }};display:block;margin:0 auto;"/>
                    </td>
                </tr>
                {{-- Registration --}}
                <tr>
                    <td style="font-size:7pt;font-weight:bold;color:{{ $navy }};padding-bottom:1mm;">
                        {{ $registration->registration_number }}
                    </td>
                </tr>
                {{-- Name --}}
                <tr>
                    <td style="font-size:10.5pt;font-weight:bold;color:{{ $navy }};text-transform:uppercase;line-height:1.1;padding:0 1mm 2mm;">
                        {{ $registration->fullName() }}
                    </td>
                </tr>
                {{-- Divider with dot --}}
                <tr>
                    <td style="padding:0 4mm 2mm;">
                        <table cellpadding="0" cellspacing="0" style="width:100%;">
                            <tr>
                                <td style="border-bottom:0.25mm solid {{ $navy }};width:42%;">&nbsp;</td>
                                <td style="width:16%;text-align:center;font-size:5pt;color:{{ $navy }};vertical-align:middle;line-height:1;">&#9679;</td>
                                <td style="border-bottom:0.25mm solid {{ $navy }};width:42%;">&nbsp;</td>
                            </tr>
                        </table>
                    </td>
                </tr>
                {{-- Level --}}
                <tr>
                    <td style="padding-bottom:1.5mm;">
                        <div style="font-size:5pt;font-weight:bold;color:{{ $navy }};letter-spacing:0.5pt;">LEVEL</div>
                        <div style="font-size:6.5pt;font-weight:bold;color:#111;margin-top:0.6mm;line-height:1.15;">{{ $levelLabel }}</div>
                    </td>
                </tr>
                {{-- Plain divider --}}
                <tr>
                    <td style="padding:0 5mm 2mm;">
                        <div style="border-bottom:0.25mm solid {{ $navy }};width:100%;">&nbsp;</div>
                    </td>
                </tr>
                {{-- Campus --}}
                <tr>
                    <td>
                        <div style="font-size:5pt;font-weight:bold;color:{{ $navy }};letter-spacing:0.5pt;">CAMPUS</div>
                        <div style="font-size:6pt;font-weight:bold;color:#111;margin-top:0.6mm;line-height:1.2;">
                            {{ $campusLine1 ?? 'Winners Chapel International' }}<br/>
                            {{ $campusLine2 ?? 'Dartford Campus' }}
                        </div>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    {{-- Footer --}}
    <tr style="height:{{ $footerH }}mm;background-color:{{ $navy }};">
        <td style="text-align:center;vertical-align:middle;color:#ffffff;font-size:11pt;font-weight:bold;letter-spacing:1pt;">
            {{ $year }}
        </td>
    </tr>
</table>
</body>
</html>
