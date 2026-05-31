<?php

namespace Tests\Unit;

use App\Services\JbsRegistrationValidationService;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class JbsContactValidationTest extends TestCase
{
    private JbsRegistrationValidationService $validation;

    protected function setUp(): void
    {
        parent::setUp();
        $this->validation = new JbsRegistrationValidationService;
    }

    #[Test]
    public function normalizes_uk_phone_with_spaces_and_plus_44(): void
    {
        $this->assertSame(
            '07123456789',
            $this->validation->normalizeUkPhone('+44 7123 456789'),
        );
        $this->assertSame(
            '07123456789',
            $this->validation->normalizeUkPhone('0044 7123 456789'),
        );
        $this->assertSame(
            '07123456789',
            $this->validation->normalizeUkPhone('07123 456 789'),
        );
    }

    #[Test]
    public function normalizes_registration_payload_phones_and_email(): void
    {
        $payload = [
            'guardian_phone' => '+44 7123 456788',
            'guardian_email' => '  Parent@Example.COM ',
            'children' => [
                [
                    'phone' => '07111 222 333',
                    'email' => '  Child@Example.COM ',
                ],
            ],
        ];

        $normalized = $this->validation->normalizeRegistrationPayload($payload);

        $this->assertSame('07123456788', $normalized['guardian_phone']);
        $this->assertSame('parent@example.com', $normalized['guardian_email']);
        $this->assertSame('07111222333', $normalized['children'][0]['phone']);
        $this->assertSame('child@example.com', $normalized['children'][0]['email']);
    }
}
