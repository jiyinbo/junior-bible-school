<?php

namespace App\Mail;

use App\Models\JbsStudentRegistration;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PortalPinMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public JbsStudentRegistration $registration,
        public string $portalPin,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Student portal PIN – 2026 Summer Junior Bible School',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.portal-pin',
            with: [
                'studentName' => $this->registration->fullName(),
                'registrationNumber' => $this->registration->registration_number,
                'portalPin' => $this->portalPin,
                'studentPortalUrl' => rtrim((string) config('jbs.student_portal_url'), '/'),
                'contactEmail' => (string) config('jbs.contact_email'),
            ],
        );
    }
}
