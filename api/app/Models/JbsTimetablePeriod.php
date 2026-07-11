<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JbsTimetablePeriod extends Model
{
    protected $table = 'jbs_timetable_periods';

    protected $fillable = [
        'jbs_level_id',
        'sort_order',
        'start_time',
        'end_time',
        'kind',
        'label',
        'applies_all_days',
    ];

    protected function casts(): array
    {
        return [
            'applies_all_days' => 'boolean',
        ];
    }

    public function level(): BelongsTo
    {
        return $this->belongsTo(JbsLevel::class, 'jbs_level_id');
    }

    public function entries(): HasMany
    {
        return $this->hasMany(JbsTimetableEntry::class, 'jbs_timetable_period_id');
    }
}
