<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JbsStudentRegistration extends Model
{
    protected $table = 'jbs_student_registrations';

    protected $fillable = [
        'jbs_session_id',
        'jbs_level_id',
        'registration_number',
        'first_name',
        'last_name',
        'email',
        'phone',
        'guardian_name',
        'guardian_relationship',
        'guardian_phone',
        'gender',
        'date_of_birth',
        'nationality',
        'address',
        'born_again',
        'date_of_new_birth',
        'new_birth_location',
        'place_of_worship',
        'place_of_worship_address',
        'pastor_name',
        'activity_group',
        'current_school',
        'current_school_year',
        'allergies',
        'next_of_kin_name',
        'registered_after_close',
        'level_completed',
        'level_completed_at',
        'level_completed_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'date_of_new_birth' => 'date',
            'born_again' => 'boolean',
            'registered_after_close' => 'boolean',
            'level_completed' => 'boolean',
            'level_completed_at' => 'datetime',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(JbsSession::class, 'jbs_session_id');
    }

    public function level(): BelongsTo
    {
        return $this->belongsTo(JbsLevel::class, 'jbs_level_id');
    }

    public function attendanceLogs(): HasMany
    {
        return $this->hasMany(JbsAttendanceLog::class, 'jbs_student_registration_id');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(JbsAttempt::class, 'jbs_student_registration_id');
    }

    public function scoreOutcomes(): HasMany
    {
        return $this->hasMany(JbsModuleScoreOutcome::class, 'jbs_student_registration_id');
    }

    public function levelCompletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'level_completed_by_user_id');
    }

    public function fullName(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }
}
