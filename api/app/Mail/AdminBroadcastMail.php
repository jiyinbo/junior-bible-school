<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminBroadcastMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  list<Attachment>  $mailAttachments
     */
    public function __construct(
        public string $mailSubject,
        public string $bodyHtml,
        public string $recipientName,
        public array $mailAttachments = [],
    ) {}

    /**
     * @return list<Attachment>
     */
    public function attachments(): array
    {
        return $this->mailAttachments;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->mailSubject,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.admin-broadcast',
            with: [
                'recipientName' => $this->recipientName,
                'bodyHtml' => $this->bodyHtml,
                'contactEmail' => (string) config('jbs.contact_email'),
            ],
        );
    }
}
