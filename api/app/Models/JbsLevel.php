<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JbsLevel extends Model
{
    protected $table = 'jbs_levels';

    protected $fillable = [
        'jbs_session_id',
        'name',
        'placement_group',
        'registration_prefix',
        'next_sequence',
        'sort_order',
        'min_attendance_days',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(JbsSession::class, 'jbs_session_id');
    }

    public function modules(): HasMany
    {
        return $this->hasMany(JbsModule::class, 'jbs_level_id')->orderBy('sort_order');
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(JbsStudentRegistration::class, 'jbs_level_id');
    }
}
