<?php

declare(strict_types=1);

use App\Jobs\BroadcastReservationEvent;
use App\Support\ReservationEventPayload;
use Illuminate\Support\Facades\Redis;

it('publishes the exact payload to the reservation-events channel', function () {
    $payload = new ReservationEventPayload(
        id: '123',
        type: 'cancelled',
        resource: 'reservations/99',
        at: '2026-09-02T12:00:00+00:00',
        tenantId: 3,
    );

    $expectedJson = json_encode([
        'id' => '123',
        'type' => 'cancelled',
        'resource' => 'reservations/99',
        'at' => '2026-09-02T12:00:00+00:00',
        'tenant_id' => 3,
    ], JSON_THROW_ON_ERROR);

    Redis::shouldReceive('publish')
        ->once()
        ->with('reservation-events', $expectedJson);

    (new BroadcastReservationEvent($payload))->handle();
});

it('uses reservation-events as its channel constant', function () {
    expect(BroadcastReservationEvent::CHANNEL)->toBe('reservation-events');
});
