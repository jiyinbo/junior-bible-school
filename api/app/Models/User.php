<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'role'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isTeacher(): bool
    {
        return $this->role === 'teacher';
    }

    public function isAssistant(): bool
    {
        return $this->role === 'assistant';
    }

    public function moduleAssignments(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(JbsModuleAssignment::class, 'user_id');
    }

    public function managesModule(JbsModule $module): bool
    {
        // Admins and assistants can manage tests and record scores for any module.
        if ($this->isAdmin() || $this->isAssistant()) {
            return true;
        }

        return $this->moduleAssignments()->where('jbs_module_id', $module->id)->exists();
    }
}
