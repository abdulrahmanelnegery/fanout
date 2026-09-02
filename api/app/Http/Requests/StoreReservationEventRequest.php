<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreReservationEventRequest extends FormRequest
{
    public const TYPES = ['created', 'updated', 'cancelled'];

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', 'string', Rule::in(self::TYPES)],
            'resource' => ['required', 'string', 'max:255'],
            'tenant_id' => ['required', 'integer', 'min:1'],
        ];
    }
}
