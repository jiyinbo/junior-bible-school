<?php

namespace App\Http\Controllers\Concerns;

use App\Services\JbsAuditLogger;

trait InteractsWithAuditLog
{
    protected function audit(): JbsAuditLogger
    {
        return app(JbsAuditLogger::class);
    }
}
