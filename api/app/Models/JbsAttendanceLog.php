<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JbsAttendanceLog extends Model
{
    protected $table = 'jbs_attendance_logs';

    protected $fillable = [
        'jbs_student_registration_id',
        'attended_on',
        'recorded_at',
        'recorded_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'attended_on' => 'date',
            'recorded_at' => 'datetime',
        ];
    }

    public function registration(): BelongsTo
    {
        return $this->belongsTo(JbsStudentRegistration::class, 'jbs_student_registration_id');
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by_user_id');
    }
}
