<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JbsSession extends Model
{
    protected $table = 'jbs_sessions';

    protected $fillable = [
        'name',
        'slug',
        'registration_opens_at',
        'registration_closes_at',
        'session_starts_at',
        'session_ends_at',
        'min_attendance_days',
        'is_past',
    ];

    protected function casts(): array
    {
        return [
            'registration_opens_at' => 'datetime',
            'registration_closes_at' => 'datetime',
            'session_starts_at' => 'datetime',
            'session_ends_at' => 'datetime',
            'is_past' => 'boolean',
        ];
    }

    public function levels(): HasMany
    {
        return $this->hasMany(JbsLevel::class, 'jbs_session_id')->orderBy('sort_order');
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(JbsStudentRegistration::class, 'jbs_session_id');
    }

    public function timetableDays(): HasMany
    {
        return $this->hasMany(JbsTimetableDay::class, 'jbs_session_id')->orderBy('sort_order')->orderBy('day_date');
    }

    public function registrationIsOpen(?\DateTimeInterface $at = null): bool
    {
        $at ??= now();
        if ($this->is_past) {
            return false;
        }
        if ($this->registration_opens_at && $at < $this->registration_opens_at) {
            return false;
        }
        if ($this->registration_closes_at && $at > $this->registration_closes_at) {
            return false;
        }

        return true;
    }

    /**
     * Programme is in progress (attendance allowed). Distinct from registration window.
     */
    public function isSessionRunning(?\DateTimeInterface $at = null): bool
    {
        $at ??= now();

        if ($this->is_past) {
            return false;
        }

        if ($this->session_starts_at && $at < $this->session_starts_at) {
            return false;
        }

        if ($this->session_ends_at && $at > $this->session_ends_at) {
            return false;
        }

        if (! $this->session_starts_at && ! $this->session_ends_at) {
            return ! $this->is_past;
        }

        return true;
    }

    public function programmePhase(?\DateTimeInterface $at = null): string
    {
        if ($this->is_past) {
            return 'past';
        }

        $at ??= now();

        if ($this->session_starts_at && $at < $this->session_starts_at) {
            return 'upcoming';
        }

        if ($this->session_ends_at && $at > $this->session_ends_at) {
            return 'ended';
        }

        if ($this->session_starts_at || $this->session_ends_at) {
            return 'ongoing';
        }

        return 'ongoing';
    }
}
