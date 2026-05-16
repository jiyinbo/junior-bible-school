<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StaffUserAdminController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::query()
            ->whereIn('role', ['admin', 'teacher'])
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role']);

        return response()->json(['data' => $users]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in(['admin', 'teacher'])],
        ]);

        $user = User::query()->create([
            'name' => trim($data['name']),
            'email' => strtolower(trim($data['email'])),
            'password' => $data['password'],
            'role' => $data['role'],
        ]);

        $this->audit()->created($request, 'staff_user.created', $user, ['role' => $user->role]);

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        abort_unless(in_array($user->role, ['admin', 'teacher'], true), 404);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['sometimes', Rule::in(['admin', 'teacher'])],
        ]);

        $payload = [];
        if (array_key_exists('name', $data)) {
            $payload['name'] = trim($data['name']);
        }
        if (array_key_exists('email', $data)) {
            $payload['email'] = strtolower(trim($data['email']));
        }
        if (! empty($data['password'])) {
            $payload['password'] = $data['password'];
        }
        if (array_key_exists('role', $data)) {
            $payload['role'] = $data['role'];
        }

        $keys = array_keys($payload);
        $old = $this->audit()->snapshot($user, $keys);
        $user->update($payload);
        $user->refresh();
        $this->audit()->updated($request, 'staff_user.updated', $user, $old, $this->audit()->snapshot($user, $keys));

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }
}
