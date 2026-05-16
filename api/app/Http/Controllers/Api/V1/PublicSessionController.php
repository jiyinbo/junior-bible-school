<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\JbsSession;
use Illuminate\Http\JsonResponse;

class PublicSessionController extends Controller
{
    public function index(): JsonResponse
    {
        $sessions = JbsSession::query()
            ->where('is_past', false)
            ->orderByDesc('id')
            ->get(['id', 'name', 'slug', 'registration_opens_at', 'registration_closes_at'])
            ->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'slug' => $s->slug,
                'registration_is_open' => $s->registrationIsOpen(),
            ]);

        return response()->json(['data' => $sessions]);
    }

    public function show(string $slug): JsonResponse
    {
        $session = JbsSession::query()->where('slug', $slug)->with(['levels.modules'])->firstOrFail();

        return response()->json([
            'data' => [
                'id' => $session->id,
                'name' => $session->name,
                'slug' => $session->slug,
                'registration_opens_at' => $session->registration_opens_at,
                'registration_closes_at' => $session->registration_closes_at,
                'registration_is_open' => $session->registrationIsOpen(),
                'levels' => $session->levels->map(fn ($l) => [
                    'id' => $l->id,
                    'name' => $l->name,
                    'placement_group' => $l->placement_group,
                    'registration_prefix' => $l->registration_prefix,
                ]),
            ],
        ]);
    }
}
