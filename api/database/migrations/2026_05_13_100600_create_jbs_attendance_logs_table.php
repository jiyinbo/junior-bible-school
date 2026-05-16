<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jbs_attendance_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('jbs_student_registration_id')->constrained('jbs_student_registrations')->cascadeOnDelete();
            $table->date('attended_on');
            $table->foreignId('recorded_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['jbs_student_registration_id', 'attended_on'], 'jbs_attendance_registration_day_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jbs_attendance_logs');
    }
};
