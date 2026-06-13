<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Portal PIN</title>
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
                            @include('emails.partials.no-reply-banner')
                            <p style="margin:0 0 16px; font-size:15px; line-height:1.65;">
                                Dear {{ $studentName }},
                            </p>
                            <p style="margin:0 0 16px; font-size:15px; line-height:1.65;">
                                Your student portal PIN has been updated. Use it together with your registration number to sign in:
                            </p>

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px; line-height:1.65; margin:0 0 20px;">
                                <tr>
                                    <td style="padding:4px 0; color:#6b7280; width:42%; vertical-align:top;">Registration Number</td>
                                    <td style="padding:4px 0; font-weight:700; color:#1e3a8a;">{{ $registrationNumber }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:4px 0; color:#6b7280; vertical-align:top;">Portal PIN</td>
                                    <td style="padding:4px 0; font-weight:700; color:#1e3a8a; font-family:monospace; letter-spacing:2px;">{{ $portalPin }}</td>
                                </tr>
                            </table>

                            <p style="margin:0 0 16px; font-size:15px; line-height:1.65;">
                                Sign in at
                                <a href="{{ $studentPortalUrl }}" style="color:#1e3a8a; font-weight:600;">{{ $studentPortalUrl }}</a>
                            </p>

                            <p style="margin:0 0 16px; font-size:15px; line-height:1.65;">
                                Please keep your PIN safe and do not share it with anyone other than a parent or guardian. You can change it after signing in to the student portal.
                            </p>

                            <p style="margin:0 0 16px; font-size:15px; line-height:1.65;">
                                If you have any questions, please email
                                <a href="mailto:{{ $contactEmail }}" style="color:#1e3a8a;">{{ $contactEmail }}</a>.
                            </p>

                            <p style="margin:24px 0 0; font-size:15px; line-height:1.65;">
                                Warm regards,<br><br>
                                The Summer Junior Bible School Team
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
