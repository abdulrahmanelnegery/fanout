<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\ReservationEvent;
use JsonSerializable;

/**
 * The exact shape broadcast onto the Redis channel and, in turn, pushed to every
 * browser. Kept as a value object so the queued job never touches Eloquent and
 * the contract has a single definition.
 */
final class ReservationEventPayload implements JsonSerializable
{
    public function __construct(
        public readonly string $id,
        public readonly string $type,
        public readonly string $resource,
        public readonly string $at,
        public readonly int $tenantId,
    ) {}

    public static function fromModel(ReservationEvent $event): self
    {
        return new self(
            id: (string) $event->getKey(),
            type: $event->type,
            resource: $event->resource,
            at: $event->occurred_at->toIso8601String(),
            tenantId: $event->tenant_id,
        );
    }

    /**
     * @return array{id: string, type: string, resource: string, at: string, tenant_id: int}
     */
    public function jsonSerialize(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'resource' => $this->resource,
            'at' => $this->at,
            'tenant_id' => $this->tenantId,
        ];
    }

    public function toJson(): string
    {
        return json_encode($this, JSON_THROW_ON_ERROR);
    }
}
