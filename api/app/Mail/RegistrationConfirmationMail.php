<?php

namespace App\Mail;

use App\Models\JbsStudentRegistration;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RegistrationConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public JbsStudentRegistration $registration,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Registration confirmed – 2026 Summer Junior Bible School',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.registration-confirmation',
            with: [
                'studentName' => $this->registration->fullName(),
                'registrationNumber' => $this->registration->registration_number,
                'levelName' => $this->registration->level->name,
                'studentPortalUrl' => rtrim((string) config('jbs.student_portal_url'), '/'),
                'contactEmail' => (string) config('jbs.contact_email'),
            ],
        );
    }
}
