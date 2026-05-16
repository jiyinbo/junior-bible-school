<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jbs_student_registrations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('jbs_session_id')->constrained('jbs_sessions')->cascadeOnDelete();
            $table->foreignId('jbs_level_id')->constrained('jbs_levels')->cascadeOnDelete();
            $table->string('registration_number')->unique();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->string('guardian_name')->nullable();
            $table->string('guardian_relationship')->nullable();
            $table->boolean('registered_after_close')->default(false);
            $table->timestamps();

            $table->index(['jbs_session_id', 'jbs_level_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jbs_student_registrations');
    }
};
