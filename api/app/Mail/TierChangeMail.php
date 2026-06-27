<?php

namespace App\Mail;

use App\Models\JbsStudentRegistration;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TierChangeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public JbsStudentRegistration $registration,
        public string $portalPin,
        public string $previousRegistrationNumber,
        public string $previousLevelName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Tier updated – new registration details – 2026 Summer Junior Bible School',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.tier-change',
            with: [
                'studentName' => $this->registration->fullName(),
                'registrationNumber' => $this->registration->registration_number,
                'portalPin' => $this->portalPin,
                'levelName' => $this->registration->level->name,
                'previousRegistrationNumber' => $this->previousRegistrationNumber,
                'previousLevelName' => $this->previousLevelName,
                'studentPortalUrl' => rtrim((string) config('jbs.student_portal_url'), '/'),
                'contactEmail' => (string) config('jbs.contact_email'),
            ],
        );
    }
}
