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
            subject: 'Registration confirmed - '.$this->registration->session->name,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.registration-confirmation',
            with: [
                'participantName' => $this->registration->fullName(),
                'registrationNumber' => $this->registration->registration_number,
                'sessionName' => $this->registration->session->name,
                'levelName' => $this->registration->level->name,
                'guardianName' => $this->registration->guardian_name,
            ],
        );
    }
}
