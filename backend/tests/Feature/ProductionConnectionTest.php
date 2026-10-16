<?php

namespace Tests\Feature;

use Tests\TestCase;

class ProductionConnectionTest extends TestCase
{
    public function test_vercel_can_preflight_uploads_and_management_requests(): void
    {
        config(['cors.allowed_origins' => ['https://qr-code-sharer.vercel.app']]);

        foreach (['POST', 'PATCH', 'DELETE'] as $method) {
            $this->options('/api/v1/uploads', [], [
                'Origin' => 'https://qr-code-sharer.vercel.app',
                'Access-Control-Request-Method' => $method,
                'Access-Control-Request-Headers' => 'content-type,x-management-token',
            ])->assertNoContent()
                ->assertHeader('Access-Control-Allow-Origin', 'https://qr-code-sharer.vercel.app');
        }
    }

    public function test_other_origins_do_not_receive_cors_access(): void
    {
        config(['cors.allowed_origins' => ['https://qr-code-sharer.vercel.app']]);

        // A fixed single-origin header may be emitted for every request. Browsers
        // still reject it when it does not match the requesting origin.
        $response = $this->options('/api/v1/uploads', [], [
            'Origin' => 'https://unrelated.example',
            'Access-Control-Request-Method' => 'POST',
        ])->assertHeader('Access-Control-Allow-Origin', 'https://qr-code-sharer.vercel.app');

        $this->assertNotSame('https://unrelated.example', $response->headers->get('Access-Control-Allow-Origin'));
        $this->assertNotSame('*', $response->headers->get('Access-Control-Allow-Origin'));
    }
}
