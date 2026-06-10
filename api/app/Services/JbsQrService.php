<?php

namespace App\Services;

use chillerlan\QRCode\Output\QRGdImagePNG;
use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;

class JbsQrService
{
    /**
     * Data URI (e.g. image/png;base64,...) suitable for HTML img src.
     */
    public function registrationNumberToDataUri(string $registrationNumber): string
    {
        $options = new QROptions([
            'outputInterface' => QRGdImagePNG::class,
            'outputBase64' => true,
            'scale' => 8,
            // The ID card border/padding provides the quiet zone; no extra margin
            // keeps the modules larger within the rendered square.
            'margin' => 0,
        ]);

        /** @var string */
        return (new QRCode($options))->render($registrationNumber);
    }
}
