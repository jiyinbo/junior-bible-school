<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jbs_sessions', function (Blueprint $table): void {
            $table->timestamp('session_starts_at')->nullable()->after('registration_closes_at');
            $table->timestamp('session_ends_at')->nullable()->after('session_starts_at');
        });

        Schema::table('jbs_attendance_logs', function (Blueprint $table): void {
            $table->timestamp('recorded_at')->nullable()->after('attended_on');
        });

        \Illuminate\Support\Facades\DB::table('jbs_attendance_logs')
            ->whereNull('recorded_at')
            ->update(['recorded_at' => \Illuminate\Support\Facades\DB::raw('created_at')]);
    }

    public function down(): void
    {
        Schema::table('jbs_attendance_logs', function (Blueprint $table): void {
            $table->dropColumn('recorded_at');
        });

        Schema::table('jbs_sessions', function (Blueprint $table): void {
            $table->dropColumn(['session_starts_at', 'session_ends_at']);
        });
    }
};
