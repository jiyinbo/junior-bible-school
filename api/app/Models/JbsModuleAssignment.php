<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JbsModuleAssignment extends Model
{
    protected $table = 'jbs_module_assignments';

    protected $fillable = [
        'jbs_module_id',
        'user_id',
    ];

    public function module(): BelongsTo
    {
        return $this->belongsTo(JbsModule::class, 'jbs_module_id');
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
