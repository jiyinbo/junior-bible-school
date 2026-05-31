<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JbsTimetableEntry extends Model
{
    protected $table = 'jbs_timetable_entries';

    protected $fillable = [
        'jbs_level_id',
        'jbs_timetable_day_id',
        'jbs_timetable_period_id',
        'span',
        'jbs_module_id',
        'activity_label',
    ];

    public function level(): BelongsTo
    {
        return $this->belongsTo(JbsLevel::class, 'jbs_level_id');
    }

    public function day(): BelongsTo
    {
        return $this->belongsTo(JbsTimetableDay::class, 'jbs_timetable_day_id');
    }

    public function period(): BelongsTo
    {
        return $this->belongsTo(JbsTimetablePeriod::class, 'jbs_timetable_period_id');
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(JbsModule::class, 'jbs_module_id');
    }
}
