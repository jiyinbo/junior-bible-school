<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// SiteGround: upload `public/*` → public_html and the rest → sibling folder `api/`.
// Local: standard Laravel layout (vendor next to `public/`).
$basePath = is_file(__DIR__.'/../vendor/autoload.php')
    ? dirname(__DIR__)
    : dirname(__DIR__).'/api';

if (file_exists($maintenance = $basePath.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

require $basePath.'/vendor/autoload.php';

/** @var Application $app */
$app = require_once $basePath.'/bootstrap/app.php';

$app->handleRequest(Request::capture());
