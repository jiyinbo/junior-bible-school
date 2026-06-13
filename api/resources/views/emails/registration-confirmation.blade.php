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
                                Congratulations and thank you for registering for the 2026 Summer Junior Bible School. We believe God is ready to transform your life through the instrument of His Word, and we are confident that you will never be the same in Jesus&rsquo; name.
                            </p>
                            <p style="margin:0 0 12px; font-size:15px; line-height:1.65;">
                                Please keep the following details for your records:
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
                                <tr>
                                    <td style="padding:4px 0; color:#6b7280; vertical-align:top;">Tier</td>
                                    <td style="padding:4px 0; font-weight:600;">{{ $levelName }}</td>
                                </tr>
                            </table>

                            <p style="margin:0 0 8px; font-size:15px; line-height:1.65; font-weight:600;">
                                Programme Schedule:
                            </p>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px; line-height:1.65; margin:0 0 20px;">
                                <tr>
                                    <td style="padding:4px 0; color:#6b7280; width:28%; vertical-align:top;">Date</td>
                                    <td style="padding:4px 0;">Monday 27 July to Friday 31 July 2026</td>
                                </tr>
                                <tr>
                                    <td style="padding:4px 0; color:#6b7280; vertical-align:top;">Graduation</td>
                                    <td style="padding:4px 0;">Sunday 2 August 2026 (during the 3rd service in the Main Church)</td>
                                </tr>
                                <tr>
                                    <td style="padding:4px 0; color:#6b7280; vertical-align:top;">Venue</td>
                                    <td style="padding:4px 0;">Winners Chapel International, 1 Churchill Close, Green Street Green Road, Dartford DA1 1QE</td>
                                </tr>
                                <tr>
                                    <td style="padding:4px 0; color:#6b7280; vertical-align:top;">Time</td>
                                    <td style="padding:4px 0;">9am to 4pm (All students must be on campus by 8:45am at the latest for registration)</td>
                                </tr>
                            </table>

                            <p style="margin:0 0 16px; font-size:15px; line-height:1.65;">
                                Our dedicated Student Portal contains more information about the programme, including details about your modules, ID card, timetable, and more. Please note that some of these details will become available closer to the start date. You will need your registration number and portal PIN to sign in. Please keep your PIN safe and do not share it publicly. You can access the Student Portal using the link below:
                            </p>
                            <p style="margin:0 0 20px; font-size:15px; line-height:1.65;">
                                <a href="{{ $studentPortalUrl }}" style="color:#1e3a8a; font-weight:600;">{{ $studentPortalUrl }}</a>
                            </p>

                            <p style="margin:0 0 16px; font-size:15px; line-height:1.65;">
                                Further information will be sent closer to the start date. In the meantime, if you have any questions, please email us at
                                <a href="mailto:{{ $contactEmail }}" style="color:#1e3a8a;">{{ $contactEmail }}</a>
                                or visit us on Sunday in the Teens Church for a chat.
                            </p>
                            <p style="margin:0 0 16px; font-size:15px; line-height:1.65;">
                                We can&rsquo;t wait for all that God has in store for us at JBS. Congratulations once again!
                            </p>
                            <p style="margin:24px 0 0; font-size:15px; line-height:1.65;">
                                Warm regards,<br><br>
                                The Summer Junior Bible School Team
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#f9fafb; padding:20px 32px; border-top:1px solid #e5e7eb;">
                            <p style="margin:0; font-size:12px; color:#9ca3af;">
                                This is an automated message confirming your registration. Please keep your registration number and portal PIN safe and do not share them publicly.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
