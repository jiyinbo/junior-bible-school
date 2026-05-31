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
        'duration_minutes',
    ];

    protected function casts(): array
    {
        return [
            'opened_at' => 'datetime',
            'closed_at' => 'datetime',
            'duration_minutes' => 'integer',
        ];
    }

    public function closesAt(): ?\Carbon\Carbon
    {
        if (! $this->opened_at || ! $this->duration_minutes) {
            return null;
        }

        return $this->opened_at->copy()->addMinutes($this->duration_minutes);
    }

    /**
     * Close the test when its duration has elapsed. Returns true if it was closed.
     */
    public function closeIfExpired(): bool
    {
        if ($this->status !== 'open') {
            return false;
        }

        $closesAt = $this->closesAt();
        if ($closesAt === null || now()->lt($closesAt)) {
            return false;
        }

        $this->update([
            'status' => 'closed',
            'closed_at' => $closesAt,
        ]);

        return true;
    }

    public function refreshAndCloseIfExpired(): self
    {
        if ($this->closeIfExpired()) {
            $this->refresh();
        }

        return $this;
    }

    public function remainingSeconds(): ?int
    {
        $closesAt = $this->closesAt();
        if ($closesAt === null || $this->status !== 'open') {
            return null;
        }

        return max(0, (int) now()->diffInSeconds($closesAt, false));
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

    public static function closeAllExpired(): void
    {
        static::query()
            ->where('status', 'open')
            ->whereNotNull('duration_minutes')
            ->whereNotNull('opened_at')
            ->each(fn (self $test) => $test->closeIfExpired());
    }
}
