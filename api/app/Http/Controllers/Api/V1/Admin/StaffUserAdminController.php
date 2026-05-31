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
            ->whereIn('role', ['admin', 'teacher', 'assistant'])
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
            'role' => ['required', Rule::in(['admin', 'teacher', 'assistant'])],
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
        abort_unless(in_array($user->role, ['admin', 'teacher', 'assistant'], true), 404);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['sometimes', Rule::in(['admin', 'teacher', 'assistant'])],
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

    public function destroy(Request $request, User $user): JsonResponse
    {
        abort_unless(in_array($user->role, ['admin', 'teacher', 'assistant'], true), 404);

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }

        $assignmentCount = $user->moduleAssignments()->count();
        if ($assignmentCount > 0) {
            return response()->json([
                'message' => 'This teacher is still assigned to '.$assignmentCount.' module'
                    .($assignmentCount === 1 ? '' : 's')
                    .'. Reassign their modules to another teacher before deleting this account.',
                'assignment_count' => $assignmentCount,
            ], 409);
        }

        $this->audit()->record(
            'staff_user.deleted',
            $request,
            $user,
            oldValues: $this->audit()->snapshot($user, ['name', 'email', 'role']),
            metadata: ['email' => $user->email, 'role' => $user->role],
        );

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Staff account deleted.']);
    }
}
