<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        /** @var User|null $user */
        $user = User::query()->where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (! in_array($user->role, ['admin', 'teacher'], true)) {
            throw ValidationException::withMessages([
                'email' => ['This account cannot access the staff portal.'],
            ]);
        }

        $token = $user->createToken('spa')->plainTextToken;

        $this->audit()->record('auth.login', $request, $user, metadata: ['email' => $user->email], actor: $user);

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->audit()->record('auth.logout', $request, $user);
        $user?->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request): JsonResponse
    {
        $u = $request->user();
        abort_unless($u, 401);

        return response()->json([
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $u->role,
        ]);
    }
}
