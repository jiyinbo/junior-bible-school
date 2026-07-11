<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('jbs_timetable_periods', 'jbs_session_id')) {
            return;
        }

        Schema::table('jbs_timetable_periods', function (Blueprint $table): void {
            $table->foreignId('jbs_level_id')->nullable()->after('id')->constrained('jbs_levels')->cascadeOnDelete();
        });

        $periods = DB::table('jbs_timetable_periods')->whereNotNull('jbs_session_id')->get();

        foreach ($periods as $period) {
            $levels = DB::table('jbs_levels')
                ->where('jbs_session_id', $period->jbs_session_id)
                ->orderBy('sort_order')
                ->get();

            foreach ($levels as $level) {
                $newPeriodId = DB::table('jbs_timetable_periods')->insertGetId([
                    'jbs_level_id' => $level->id,
                    'jbs_session_id' => $period->jbs_session_id,
                    'sort_order' => $period->sort_order,
                    'start_time' => $period->start_time,
                    'end_time' => $period->end_time,
                    'kind' => $period->kind,
                    'label' => $period->label,
                    'applies_all_days' => $period->applies_all_days,
                    'created_at' => $period->created_at,
                    'updated_at' => $period->updated_at,
                ]);

                DB::table('jbs_timetable_entries')
                    ->where('jbs_level_id', $level->id)
                    ->where('jbs_timetable_period_id', $period->id)
                    ->update(['jbs_timetable_period_id' => $newPeriodId]);
            }

            DB::table('jbs_timetable_periods')->where('id', $period->id)->delete();
        }

        Schema::table('jbs_timetable_periods', function (Blueprint $table): void {
            $table->dropForeign(['jbs_session_id']);
            $table->dropIndex(['jbs_session_id', 'sort_order']);
            $table->dropColumn('jbs_session_id');
        });

        Schema::table('jbs_timetable_periods', function (Blueprint $table): void {
            $table->dropForeign(['jbs_level_id']);
        });

        Schema::table('jbs_timetable_periods', function (Blueprint $table): void {
            $table->unsignedBigInteger('jbs_level_id')->nullable(false)->change();
        });

        Schema::table('jbs_timetable_periods', function (Blueprint $table): void {
            $table->foreign('jbs_level_id')->references('id')->on('jbs_levels')->cascadeOnDelete();
            $table->index(['jbs_level_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('jbs_timetable_periods', 'jbs_level_id')) {
            return;
        }

        Schema::table('jbs_timetable_periods', function (Blueprint $table): void {
            $table->foreignId('jbs_session_id')->nullable()->after('id')->constrained('jbs_sessions')->cascadeOnDelete();
        });

        $periods = DB::table('jbs_timetable_periods')->whereNotNull('jbs_level_id')->get();
        $grouped = [];

        foreach ($periods as $period) {
            $sessionId = DB::table('jbs_levels')->where('id', $period->jbs_level_id)->value('jbs_session_id');
            if ($sessionId === null) {
                continue;
            }
            $key = $sessionId.'|'.$period->sort_order.'|'.$period->start_time.'|'.$period->end_time.'|'.$period->kind.'|'.$period->label.'|'.$period->applies_all_days;
            if (! isset($grouped[$key])) {
                $grouped[$key] = [
                    'session_id' => $sessionId,
                    'period' => $period,
                    'copies' => [],
                ];
            }
            $grouped[$key]['copies'][] = $period;
        }

        foreach ($grouped as $group) {
            $period = $group['period'];
            $sessionPeriodId = DB::table('jbs_timetable_periods')->insertGetId([
                'jbs_session_id' => $group['session_id'],
                'jbs_level_id' => $period->jbs_level_id,
                'sort_order' => $period->sort_order,
                'start_time' => $period->start_time,
                'end_time' => $period->end_time,
                'kind' => $period->kind,
                'label' => $period->label,
                'applies_all_days' => $period->applies_all_days,
                'created_at' => $period->created_at,
                'updated_at' => $period->updated_at,
            ]);

            foreach ($group['copies'] as $copy) {
                DB::table('jbs_timetable_entries')
                    ->where('jbs_level_id', $copy->jbs_level_id)
                    ->where('jbs_timetable_period_id', $copy->id)
                    ->update(['jbs_timetable_period_id' => $sessionPeriodId]);
                DB::table('jbs_timetable_periods')->where('id', $copy->id)->delete();
            }
        }

        Schema::table('jbs_timetable_periods', function (Blueprint $table): void {
            $table->dropForeign(['jbs_level_id']);
            $table->dropIndex(['jbs_level_id', 'sort_order']);
            $table->dropColumn('jbs_level_id');
            $table->index(['jbs_session_id', 'sort_order']);
        });
    }
};
