<?php

namespace App\Services;

class JbsPdfBranding
{
    private static ?string $logoDataUri = null;

    public static function logoPath(): string
    {
        return resource_path('images/logo.png');
    }

    public static function hasLogo(): bool
    {
        return is_readable(self::logoPath());
    }

    /**
     * PNG as a data URI for DomPDF (&lt;img src&gt;).
     */
    public static function logoDataUri(): ?string
    {
        if (self::$logoDataUri !== null) {
            return self::$logoDataUri ?: null;
        }

        $path = self::logoPath();
        if (! is_readable($path)) {
            self::$logoDataUri = '';

            return null;
        }

        $bytes = file_get_contents($path);
        if ($bytes === false) {
            self::$logoDataUri = '';

            return null;
        }

        self::$logoDataUri = 'data:image/png;base64,'.base64_encode($bytes);

        return self::$logoDataUri;
    }
}
