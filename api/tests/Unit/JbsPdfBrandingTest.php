<?php

namespace Tests\Unit;

use App\Services\JbsPdfBranding;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class JbsPdfBrandingTest extends TestCase
{
    #[Test]
    public function logo_file_is_available_for_pdfs(): void
    {
        $this->assertTrue(JbsPdfBranding::hasLogo());
    }

    #[Test]
    public function logo_data_uri_is_png_base64(): void
    {
        $uri = JbsPdfBranding::logoDataUri();

        $this->assertNotNull($uri);
        $this->assertStringStartsWith('data:image/png;base64,', $uri);
    }
}
