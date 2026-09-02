<?php

declare(strict_types=1);

use App\Jobs\BroadcastReservationEvent;
use App\Models\ReservationEvent;
use App\Support\ReservationEventPayload;
use Illuminate\Support\Facades\Queue;

it('persists the event and dispatches the broadcast job', function () {
    Queue::fake();

    $response = $this->postJson('/events/reservation', [
        'type' => 'created',
        'resource' => 'reservations/42',
        'tenant_id' => 7,
    ]);

    $response->assertCreated()
        ->assertJsonPath('type', 'created')
        ->assertJsonPath('resource', 'reservations/42')
        ->assertJsonPath('tenant_id', 7);

    $event = ReservationEvent::sole();
    expect($event->type)->toBe('created')
        ->and($event->tenant_id)->toBe(7);

    Queue::assertPushed(
        BroadcastReservationEvent::class,
        function (BroadcastReservationEvent $job) use ($event): bool {
            $payload = (fn () => $this->payload)->call($job);

            return $payload instanceof ReservationEventPayload
                && $payload->id === (string) $event->getKey()
                && $payload->type === 'created'
                && $payload->resource === 'reservations/42'
                && $payload->tenantId === 7;
        }
    );
});

it('rejects an unknown event type', function () {
    Queue::fake();

    $this->postJson('/events/reservation', [
        'type' => 'exploded',
        'resource' => 'reservations/42',
        'tenant_id' => 7,
    ])->assertStatus(422)->assertJsonValidationErrorFor('type');

    Queue::assertNothingPushed();
});

it('requires resource and tenant_id', function () {
    $this->postJson('/events/reservation', ['type' => 'updated'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['resource', 'tenant_id']);
});
