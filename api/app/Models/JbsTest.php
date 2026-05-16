<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JbsTest extends Model
{
    protected $table = 'jbs_tests';

    protected $fillable = [
        'jbs_module_id',
        'status',
        'opened_at',
        'closed_at',
    ];

    protected function casts(): array
    {
        return [
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(JbsModule::class, 'jbs_module_id');
    }

    public function questions(): HasMany
    {
        return $this->hasMany(JbsQuestion::class, 'jbs_test_id')->orderBy('position');
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(JbsAttempt::class, 'jbs_test_id');
    }

    public function isOpen(): bool
    {
        return $this->status === 'open';
    }
}
