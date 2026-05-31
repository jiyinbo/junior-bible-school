<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jbs_timetable_entries', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('jbs_level_id')->constrained('jbs_levels')->cascadeOnDelete();
            $table->foreignId('jbs_timetable_day_id')->constrained('jbs_timetable_days')->cascadeOnDelete();
            $table->foreignId('jbs_timetable_period_id')->constrained('jbs_timetable_periods')->cascadeOnDelete();
            // How many consecutive periods this cell spans (wide activities).
            $table->unsignedSmallInteger('span')->default(1);
            // Either a module (teaching cell) or a free activity label (e.g. TEST).
            $table->foreignId('jbs_module_id')->nullable()->constrained('jbs_modules')->nullOnDelete();
            $table->string('activity_label')->nullable();
            $table->timestamps();

            $table->unique(['jbs_level_id', 'jbs_timetable_day_id', 'jbs_timetable_period_id'], 'jbs_tt_entry_cell_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jbs_timetable_entries');
    }
};
