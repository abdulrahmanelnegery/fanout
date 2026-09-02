<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Support\WsToken;
use Illuminate\Http\JsonResponse;

final class WsTokenController extends Controller
{
    public function __construct(private readonly WsToken $token) {}

    public function issue(): JsonResponse
    {
        $ttl = (int) config('services.ws.ttl');

        return response()->json([
            'token' => $this->token->issue(),
            'expires_in' => $ttl,
        ]);
    }
}
