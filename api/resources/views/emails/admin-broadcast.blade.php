<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Junior Bible School</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f5f7; font-family:Arial, Helvetica, sans-serif; color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
                    <tr>
                        <td style="background-color:#1e3a8a; padding:28px 32px;">
                            <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:700;">Summer Junior Bible School</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <p style="margin:0 0 16px; font-size:15px; line-height:1.65;">
                                Dear {{ $recipientName }},
                            </p>
                            <div style="margin:0 0 16px; font-size:15px; line-height:1.65;">
                                {!! $bodyHtml !!}
                            </div>
                            <p style="margin:24px 0 0; font-size:14px; line-height:1.65; color:#6b7280;">
                                Questions? Contact us at
                                <a href="mailto:{{ $contactEmail }}" style="color:#1e3a8a;">{{ $contactEmail }}</a>.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
