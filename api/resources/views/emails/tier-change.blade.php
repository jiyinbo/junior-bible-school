<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tier updated</title>
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
                                Your tier for the 2026 Summer Junior Bible School has been updated from
                                <strong>{{ $previousLevelName }}</strong> to <strong>{{ $levelName }}</strong>.
                                Because of this change, you have been assigned a new registration number and student portal PIN.
                            </p>
                            <p style="margin:0 0 12px; font-size:15px; line-height:1.65;">
                                Please use the new details below to sign in. Your previous registration number
                                (<strong>{{ $previousRegistrationNumber }}</strong>) is no longer valid.
                            </p>

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px; line-height:1.65; margin:0 0 20px;">
                                <tr>
                                    <td style="padding:4px 0; color:#6b7280; width:42%; vertical-align:top;">New registration number</td>
                                    <td style="padding:4px 0; font-weight:700; color:#1e3a8a;">{{ $registrationNumber }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:4px 0; color:#6b7280; vertical-align:top;">New portal PIN</td>
                                    <td style="padding:4px 0; font-weight:700; color:#1e3a8a; font-family:monospace; letter-spacing:2px;">{{ $portalPin }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:4px 0; color:#6b7280; vertical-align:top;">Tier</td>
                                    <td style="padding:4px 0; font-weight:600;">{{ $levelName }}</td>
                                </tr>
                            </table>

                            <p style="margin:0 0 16px; font-size:15px; line-height:1.65;">
                                Sign in at
                                <a href="{{ $studentPortalUrl }}" style="color:#1e3a8a; font-weight:600;">{{ $studentPortalUrl }}</a>
                            </p>

                            <p style="margin:0 0 16px; font-size:15px; line-height:1.65;">
                                Please keep your new registration number and PIN safe. If you have any questions, email
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
