<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jbs_modules', function (Blueprint $table): void {
            $table->dropColumn(['scheduled_date', 'scheduled_start_time', 'scheduled_end_time']);
        });
    }

    public function down(): void
    {
        Schema::table('jbs_modules', function (Blueprint $table): void {
            $table->date('scheduled_date')->nullable()->after('sort_order');
            $table->time('scheduled_start_time')->nullable()->after('scheduled_date');
            $table->time('scheduled_end_time')->nullable()->after('scheduled_start_time');
        });
    }
};
