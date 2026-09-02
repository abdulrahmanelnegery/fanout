<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property string $type
 * @property string $resource
 * @property int $tenant_id
 * @property CarbonImmutable $occurred_at
 */
final class ReservationEvent extends Model
{
    use SoftDeletes;

    /** @var list<string> */
    protected $fillable = [
        'type',
        'resource',
        'tenant_id',
        'occurred_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tenant_id' => 'integer',
            'occurred_at' => 'immutable_datetime',
        ];
    }
}
