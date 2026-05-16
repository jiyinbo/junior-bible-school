<?php

use App\Providers\AppServiceProvider;

$providers = [
    AppServiceProvider::class,
];

// require-dev packages: never auto-discover (composer.json dont-discover).
if (class_exists(\Laravel\Pail\PailServiceProvider::class)) {
    $providers[] = \Laravel\Pail\PailServiceProvider::class;
}
if (class_exists(\Laravel\Pao\Laravel\ServiceProvider::class)) {
    $providers[] = \Laravel\Pao\Laravel\ServiceProvider::class;
}
if (class_exists(\NunoMaduro\Collision\Adapters\Laravel\CollisionServiceProvider::class)) {
    $providers[] = \NunoMaduro\Collision\Adapters\Laravel\CollisionServiceProvider::class;
}

return $providers;
