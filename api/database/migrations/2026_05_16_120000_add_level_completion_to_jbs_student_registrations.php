<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jbs_student_registrations', function (Blueprint $table): void {
            $table->boolean('level_completed')->default(false)->after('registered_after_close');
            $table->timestamp('level_completed_at')->nullable()->after('level_completed');
            $table->foreignId('level_completed_by_user_id')->nullable()->after('level_completed_at')
                ->constrained('users')->nullOnDelete();
        });

        // Scores no longer require admin approval — backfill existing rows.
        DB::table('jbs_module_score_outcomes')
            ->whereNull('admin_confirmed_at')
            ->update(['admin_confirmed_at' => now()]);
    }

    public function down(): void
    {
        Schema::table('jbs_student_registrations', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('level_completed_by_user_id');
            $table->dropColumn(['level_completed', 'level_completed_at']);
        });
    }
};
