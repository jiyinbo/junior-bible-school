@if(!empty($logoDataUri))
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:{{ $marginBottom ?? '16px' }};">
        <tr>
            <td style="width:{{ $logoWidth ?? '72px' }};vertical-align:middle;padding-right:12px;">
                <img src="{{ $logoDataUri }}" alt="Junior Bible School" style="width:{{ $logoWidth ?? '72px' }};height:auto;display:block;"/>
            </td>
            <td style="vertical-align:middle;">
                @if(!empty($title))
                    <div style="font-size:{{ $titleSize ?? '20px' }};font-weight:bold;color:#1a3352;line-height:1.2;">{{ $title }}</div>
                @endif
                @if(!empty($subtitle))
                    <div style="font-size:{{ $subtitleSize ?? '11px' }};color:#555;margin-top:4px;">{{ $subtitle }}</div>
                @endif
            </td>
        </tr>
    </table>
@endif
