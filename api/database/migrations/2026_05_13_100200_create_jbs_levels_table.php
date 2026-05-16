<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jbs_levels', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('jbs_session_id')->constrained('jbs_sessions')->cascadeOnDelete();
            $table->string('name');
            $table->string('registration_prefix');
            $table->unsignedInteger('next_sequence')->default(0);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->unsignedSmallInteger('min_attendance_days')->nullable();
            $table->timestamps();

            $table->index(['jbs_session_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jbs_levels');
    }
};
