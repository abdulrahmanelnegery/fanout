<?php

declare(strict_types=1);

use App\Http\Controllers\ReservationEventController;
use App\Http\Controllers\WsTokenController;
use Illuminate\Support\Facades\Route;

Route::post('/events/reservation', [ReservationEventController::class, 'store']);
Route::get('/ws-token', [WsTokenController::class, 'issue']);
