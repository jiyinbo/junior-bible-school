<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JbsModuleScoreOutcome extends Model
{
    protected $table = 'jbs_module_score_outcomes';

    protected $fillable = [
        'jbs_student_registration_id',
        'jbs_module_id',
        'score',
        'max_score',
        'source',
        'jbs_attempt_id',
        'admin_confirmed_at',
        'admin_confirmed_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'admin_confirmed_at' => 'datetime',
        ];
    }

    public function registration(): BelongsTo
    {
        return $this->belongsTo(JbsStudentRegistration::class, 'jbs_student_registration_id');
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(JbsModule::class, 'jbs_module_id');
    }

    public function attempt(): BelongsTo
    {
        return $this->belongsTo(JbsAttempt::class, 'jbs_attempt_id');
    }

    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_confirmed_by_user_id');
    }
}
