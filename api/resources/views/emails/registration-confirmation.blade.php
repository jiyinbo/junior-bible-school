<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registration Confirmed</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f5f7; font-family:Arial, Helvetica, sans-serif; color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
                    <tr>
                        <td style="background-color:#1e3a8a; padding:28px 32px;">
                            <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:700;">{{ config('app.name') }}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <h2 style="margin:0 0 16px; font-size:22px; color:#111827;">Registration confirmed</h2>
                            <p style="margin:0 0 16px; font-size:15px; line-height:1.6;">
                                Dear {{ $guardianName }},
                            </p>
                            <p style="margin:0 0 24px; font-size:15px; line-height:1.6;">
                                We're pleased to confirm that <strong>{{ $participantName }}</strong> has been successfully
                                registered for <strong>{{ $sessionName }}</strong>. Please keep the registration number
                                below safe &mdash; it will be needed throughout the programme.
                            </p>

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; margin:0 0 24px;">
                                <tr>
                                    <td style="padding:18px 20px;">
                                        <p style="margin:0 0 8px; font-size:13px; color:#6b7280; text-transform:uppercase; letter-spacing:0.05em;">Registration Number</p>
                                        <p style="margin:0; font-size:24px; font-weight:700; color:#1e3a8a; letter-spacing:0.02em;">{{ $registrationNumber }}</p>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px; line-height:1.6;">
                                <tr>
                                    <td style="padding:6px 0; color:#6b7280; width:40%;">Participant</td>
                                    <td style="padding:6px 0; font-weight:600;">{{ $participantName }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:6px 0; color:#6b7280;">Level</td>
                                    <td style="padding:6px 0; font-weight:600;">{{ $levelName }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:6px 0; color:#6b7280;">Session</td>
                                    <td style="padding:6px 0; font-weight:600;">{{ $sessionName }}</td>
                                </tr>
                            </table>

                            <p style="margin:24px 0 0; font-size:15px; line-height:1.6;">
                                If you have any questions, simply reply to this email and our team will be happy to help.
                            </p>
                            <p style="margin:24px 0 0; font-size:15px; line-height:1.6;">
                                Warm regards,<br>
                                The {{ config('app.name') }} Team
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#f9fafb; padding:20px 32px; border-top:1px solid #e5e7eb;">
                            <p style="margin:0; font-size:12px; color:#9ca3af;">
                                This is an automated message confirming a registration. Please do not share your registration number publicly.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
