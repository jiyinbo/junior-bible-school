<?php

namespace Tests\Feature;

use Tests\TestCase;

class ApiHealthTest extends TestCase
{
    public function test_api_health_endpoint(): void
    {
        $response = $this->get('/api/v1/health');

        $response->assertStatus(200);
        $response->assertSee('Junior Bible School API OK');
    }
}
