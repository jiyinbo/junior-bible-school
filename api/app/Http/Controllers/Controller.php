<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithAuditLog;

abstract class Controller
{
    use InteractsWithAuditLog;
}
