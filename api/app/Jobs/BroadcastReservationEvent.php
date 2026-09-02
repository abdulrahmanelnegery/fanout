<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Support\ReservationEventPayload;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Redis;

/**
 * Publishes a single reservation event onto the Redis pub/sub channel that the
 * Node WebSocket server subscribes to. Runs on the redis queue, so a worker
 * (`php artisan queue:work`) must be running for events to reach browsers.
 */
final class BroadcastReservationEvent implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public const CHANNEL = 'reservation-events';

    /** @var int */
    public $tries = 3;

    /** @var array<int, int> */
    public $backoff = [5, 15, 60];

    public function __construct(private readonly ReservationEventPayload $payload) {}

    public function handle(): void
    {
        Redis::publish(self::CHANNEL, $this->payload->toJson());
    }
}
