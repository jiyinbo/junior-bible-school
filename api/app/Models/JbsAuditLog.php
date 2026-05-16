<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JbsAuditLog extends Model
{
    public $timestamps = false;

    protected $table = 'jbs_audit_logs';

    protected $fillable = [
        'user_id',
        'actor_name',
        'user_role',
        'action',
        'http_method',
        'route',
        'subject_type',
        'subject_id',
        'subject_label',
        'old_values',
        'new_values',
        'metadata',
        'ip_address',
        'user_agent',
        'status',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
