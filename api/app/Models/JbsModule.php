<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class JbsModule extends Model
{
    protected $table = 'jbs_modules';

    protected $fillable = [
        'jbs_level_id',
        'name',
        'sort_order',
        'scheduled_date',
        'scheduled_start_time',
        'scheduled_end_time',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_date' => 'date',
        ];
    }

    protected static function booted(): void
    {
        static::created(function (JbsModule $module): void {
            JbsTest::query()->firstOrCreate(
                ['jbs_module_id' => $module->id],
                ['status' => 'draft'],
            );
        });
    }

    public function level(): BelongsTo
    {
        return $this->belongsTo(JbsLevel::class, 'jbs_level_id');
    }

    public function assignment(): HasOne
    {
        return $this->hasOne(JbsModuleAssignment::class, 'jbs_module_id');
    }

    public function test(): HasOne
    {
        return $this->hasOne(JbsTest::class, 'jbs_module_id');
    }

    public function scoreOutcomes(): HasMany
    {
        return $this->hasMany(JbsModuleScoreOutcome::class, 'jbs_module_id');
    }
}
