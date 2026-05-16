<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JbsAttempt extends Model
{
    protected $table = 'jbs_attempts';

    protected $fillable = [
        'jbs_test_id',
        'jbs_student_registration_id',
        'answers',
        'score',
        'max_score',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'answers' => 'array',
            'submitted_at' => 'datetime',
        ];
    }

    public function test(): BelongsTo
    {
        return $this->belongsTo(JbsTest::class, 'jbs_test_id');
    }

    public function registration(): BelongsTo
    {
        return $this->belongsTo(JbsStudentRegistration::class, 'jbs_student_registration_id');
    }
}
