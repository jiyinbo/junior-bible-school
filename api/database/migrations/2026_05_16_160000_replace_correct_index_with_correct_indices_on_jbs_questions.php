<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('jbs_questions', 'correct_index')) {
            return;
        }

        Schema::table('jbs_questions', function (Blueprint $table): void {
            $table->json('correct_indices')->nullable()->after('choices');
        });

        DB::table('jbs_questions')->orderBy('id')->each(function (object $row): void {
            DB::table('jbs_questions')->where('id', $row->id)->update([
                'correct_indices' => json_encode([(int) $row->correct_index]),
            ]);
        });

        Schema::table('jbs_questions', function (Blueprint $table): void {
            $table->dropColumn('correct_index');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('jbs_questions', 'correct_indices')) {
            return;
        }

        Schema::table('jbs_questions', function (Blueprint $table): void {
            $table->unsignedTinyInteger('correct_index')->default(0)->after('choices');
        });

        DB::table('jbs_questions')->orderBy('id')->each(function (object $row): void {
            $indices = json_decode((string) $row->correct_indices, true);
            $first = is_array($indices) && count($indices) > 0 ? (int) $indices[0] : 0;
            DB::table('jbs_questions')->where('id', $row->id)->update([
                'correct_index' => $first,
            ]);
        });

        Schema::table('jbs_questions', function (Blueprint $table): void {
            $table->dropColumn('correct_indices');
        });
    }
};
