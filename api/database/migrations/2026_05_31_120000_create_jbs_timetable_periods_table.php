<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jbs_timetable_periods', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('jbs_session_id')->constrained('jbs_sessions')->cascadeOnDelete();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            // 'teaching' columns hold per-tier module/activity cells;
            // 'activity' columns are fixed blocks (devotion, break, lunch, ...).
            $table->string('kind', 20)->default('teaching');
            $table->string('label')->nullable();
            $table->boolean('applies_all_days')->default(false);
            $table->timestamps();

            $table->index(['jbs_session_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jbs_timetable_periods');
    }
};
