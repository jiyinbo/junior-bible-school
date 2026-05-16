<?php

namespace App\Services;

use App\Models\JbsStudentRegistration;
use Barryvdh\DomPDF\Facade\Pdf;

/**
 * Portrait ID-1 badge — 53.98 × 85.60 mm (CR80 rotated).
 * Lanyard / vertical badge layout.
 */
class JbsIdCardPdfService
{
    public const WIDTH_MM = 53.98;

    public const HEIGHT_MM = 85.60;

    public const CAMPUS_LINE_1 = 'Winners Chapel International';

    public const CAMPUS_LINE_2 = 'Dartford Campus';

    /** @return array{0: int, 1: int, 2: float, 3: float} */
    public static function paperSizePoints(): array
    {
        $mmToPt = 72 / 25.4;

        return [0, 0, round(self::WIDTH_MM * $mmToPt, 2), round(self::HEIGHT_MM * $mmToPt, 2)];
    }

    public function make(JbsStudentRegistration $registration, string $qrDataUri)
    {
        return Pdf::loadView('pdf.id-card', [
            'registration' => $registration,
            'qrDataUri' => $qrDataUri,
            'cardWidthMm' => self::WIDTH_MM,
            'cardHeightMm' => self::HEIGHT_MM,
            'campusLine1' => self::CAMPUS_LINE_1,
            'campusLine2' => self::CAMPUS_LINE_2,
        ])
            ->setPaper(self::paperSizePoints())
            ->setOption('dpi', 150)
            ->setOption('defaultFont', 'DejaVu Sans');
    }
}
