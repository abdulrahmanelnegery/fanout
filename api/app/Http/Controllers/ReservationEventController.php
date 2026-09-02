<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreReservationEventRequest;
use App\Jobs\BroadcastReservationEvent;
use App\Models\ReservationEvent;
use App\Support\ReservationEventPayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Date;

final class ReservationEventController extends Controller
{
    public function store(StoreReservationEventRequest $request): JsonResponse
    {
        $event = ReservationEvent::create([
            ...$request->validated(),
            'occurred_at' => Date::now(),
        ]);

        BroadcastReservationEvent::dispatch(ReservationEventPayload::fromModel($event));

        return response()->json($event, JsonResponse::HTTP_CREATED);
    }
}
