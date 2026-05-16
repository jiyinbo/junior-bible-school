<?php

namespace App\Providers;

use App\Services\JbsPdfBranding;
use Illuminate\Support\Facades\View;
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
        View::composer('pdf.*', function ($view): void {
            $view->with('logoDataUri', JbsPdfBranding::logoDataUri());
        });
    }
}
