<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JbsTimetableDay extends Model
{
    protected $table = 'jbs_timetable_days';

    protected $fillable = [
        'jbs_session_id',
        'day_date',
        'sort_order',
        'label',
    ];

    protected function casts(): array
    {
        return [
            'day_date' => 'date',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(JbsSession::class, 'jbs_session_id');
    }

    public function entries(): HasMany
    {
        return $this->hasMany(JbsTimetableEntry::class, 'jbs_timetable_day_id');
    }
}
