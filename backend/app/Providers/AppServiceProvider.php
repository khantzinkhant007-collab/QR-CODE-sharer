<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if ($this->app->environment('production') && ! str_starts_with((string) config('scansend.public_download_base_url'), 'https://')) {
            throw new \LogicException('PUBLIC_DOWNLOAD_BASE_URL must use HTTPS in production.');
        }

        RateLimiter::for('uploads', function (Request $request): Limit {
            return Limit::perMinute((int) config('scansend.upload_rate_limit_per_minute'))
                ->by($request->ip() ?: 'unknown');
        });

        RateLimiter::for('collection-creation', fn (Request $request): Limit => Limit::perHour(10)->by($request->ip() ?: 'unknown'));

        RateLimiter::for('downloads', function (Request $request): Limit {
            return Limit::perMinute((int) config('scansend.download_rate_limit_per_minute'))
                ->by($request->ip() ?: 'unknown');
        });

        RateLimiter::for('download-passwords', function (Request $request): array {
            return [
                Limit::perMinute(5)->by('ip:'.($request->ip() ?: 'unknown')),
                Limit::perMinute(30)->by('token:'.hash('sha256', (string) $request->route('downloadToken'))),
            ];
        });
    }
}
