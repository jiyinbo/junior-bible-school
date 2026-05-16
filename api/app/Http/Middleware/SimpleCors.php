<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SimpleCors
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->method() === 'OPTIONS') {
            return $this->attachCors(response('', 204));
        }

        $response = $next($request);

        return $this->attachCors($response);
    }

    private function attachCors(Response $response): Response
    {
        $response->headers->set('Access-Control-Allow-Origin', '*');
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', '*');

        return $response;
    }
}
