<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserRole
{
    /**
     * @param  Closure(Request): Response  $next
     * @param  string  ...$roles  Comma-separated allowed roles per argument, e.g. role:admin or role:admin,teacher
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        if ($user === null) {
            abort(Response::HTTP_UNAUTHORIZED);
        }

        $allowed = [];
        foreach ($roles as $chunk) {
            foreach (explode(',', $chunk) as $role) {
                $allowed[] = trim($role);
            }
        }

        if ($allowed !== [] && ! in_array($user->role, $allowed, true)) {
            abort(Response::HTTP_FORBIDDEN, 'Insufficient privileges.');
        }

        return $next($request);
    }
}
