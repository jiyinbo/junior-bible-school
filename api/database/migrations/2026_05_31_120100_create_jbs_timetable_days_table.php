<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jbs_timetable_days', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('jbs_session_id')->constrained('jbs_sessions')->cascadeOnDelete();
            $table->date('day_date');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->string('label')->nullable();
            $table->timestamps();

            $table->unique(['jbs_session_id', 'day_date']);
            $table->index(['jbs_session_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jbs_timetable_days');
    }
};
