<?php

namespace Tests\Unit;

use App\Models\JbsLevel;
use App\Models\JbsSession;
use App\Models\JbsStudentRegistration;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CertificatePdfTest extends TestCase
{
    #[Test]
    public function certificate_pdf_is_single_page_and_shows_level_completion_date(): void
    {
        $completedAt = Carbon::parse('2026-05-10 14:30:00');
        $reg = new JbsStudentRegistration([
            'registration_number' => 'BCC/0001',
            'first_name' => 'Joshua',
            'last_name' => 'Omas',
            'level_completed' => true,
            'level_completed_at' => $completedAt,
        ]);
        $reg->setRelation('session', new JbsSession(['name' => 'Summer Junior Bible School - 2026']));
        $reg->setRelation('level', new JbsLevel(['name' => 'Basic Certificate Course']));

        $html = view('pdf.certificate', ['registration' => $reg])->render();
        $this->assertStringContainsString('10 May 2026', $html);
        $this->assertStringNotContainsString(now()->format('j F Y'), $html);

        $bytes = Pdf::loadView('pdf.certificate', ['registration' => $reg])->setPaper('a4', 'landscape')->output();
        preg_match_all('/\/Type\s*\/Page\b/', $bytes, $pages);
        $this->assertSame(1, count($pages[0]));
    }
}
