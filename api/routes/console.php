<?php

use App\Models\JbsStudentRegistration;
use App\Services\JbsStudentProgressService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('jbs:sync-level-completions', function (JbsStudentProgressService $progress) {
    $updated = 0;
    $total = 0;

    JbsStudentRegistration::query()
        ->with(['session', 'level.modules'])
        ->orderBy('id')
        ->chunkById(100, function ($registrations) use ($progress, &$updated, &$total): void {
            foreach ($registrations as $registration) {
                $total++;
                $before = (bool) $registration->level_completed;
                $after = $progress->syncLevelCompletion($registration);
                if ($before !== $after) {
                    $updated++;
                }
            }
        });

    $this->info("Synced {$total} registrations ({$updated} changed).");
})->purpose('Recompute tier completion from missing module scores');
