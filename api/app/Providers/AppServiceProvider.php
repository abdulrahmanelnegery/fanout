<?php

declare(strict_types=1);

namespace App\Providers;

use App\Support\WsToken;
use Illuminate\Contracts\Config\Repository;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(WsToken::class, static function ($app): WsToken {
            /** @var Repository $config */
            $config = $app->make('config');

            return new WsToken(
                secret: (string) $config->get('services.ws.secret'),
                ttlSeconds: (int) $config->get('services.ws.ttl'),
            );
        });
    }

    public function boot(): void
    {
        //
    }
}
