<?php

namespace Tests\Unit;

use App\Models\JbsLevel;
use App\Models\JbsSession;
use App\Models\JbsStudentRegistration;
use App\Services\JbsIdCardPdfService;
use App\Services\JbsQrService;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class IdCardPdfTest extends TestCase
{
    #[Test]
    public function paper_size_matches_cr80_id1_card_in_points(): void
    {
        $mmToPt = 72 / 25.4;
        $expected = [0, 0, round(53.98 * $mmToPt, 2), round(85.60 * $mmToPt, 2)];

        $this->assertSame($expected, JbsIdCardPdfService::paperSizePoints());
    }

    #[Test]
    public function pdf_page_uses_card_media_box_without_extra_margins(): void
    {
        $reg = $this->sampleRegistration();
        $qr = app(JbsQrService::class)->registrationNumberToDataUri($reg->registration_number);

        $bytes = app(JbsIdCardPdfService::class)->make($reg, $qr)->output();

        $this->assertNotEmpty($bytes);
        $this->assertStringStartsWith('%PDF', $bytes);

        $paper = JbsIdCardPdfService::paperSizePoints();
        $this->assertSame(1, preg_match('/\/MediaBox\s*\[([^\]]+)\]/', $bytes, $m));
        $box = array_map('floatval', preg_split('/\s+/', trim($m[1])) ?: []);
        $this->assertCount(4, $box);
        $this->assertEqualsWithDelta(0, $box[0], 0.01);
        $this->assertEqualsWithDelta(0, $box[1], 0.01);
        $this->assertEqualsWithDelta($paper[2], $box[2], 0.05);
        $this->assertEqualsWithDelta($paper[3], $box[3], 0.05);
    }

    #[Test]
    public function pdf_renders_on_a_single_page(): void
    {
        $reg = $this->sampleRegistration();
        $qr = app(JbsQrService::class)->registrationNumberToDataUri($reg->registration_number);

        $bytes = app(JbsIdCardPdfService::class)->make($reg, $qr)->output();

        // Each rendered page emits a "/Type /Page" object (distinct from the
        // "/Type /Pages" tree node). The card must never spill onto extra pages.
        $pageCount = preg_match_all('/\/Type\s*\/Page(?![s])/', $bytes);
        $this->assertSame(1, $pageCount, 'ID card PDF must be exactly one page.');
    }

    private function sampleRegistration(): JbsStudentRegistration
    {
        $session = new JbsSession(['name' => 'Summer Bible School 2026']);
        $level = new JbsLevel(['name' => 'Basic Certificate Course']);

        $reg = new JbsStudentRegistration([
            'registration_number' => 'BCC/0001',
            'first_name' => 'Joshua',
            'last_name' => 'Omas',
        ]);
        $reg->setRelation('session', $session);
        $reg->setRelation('level', $level);

        return $reg;
    }
}
