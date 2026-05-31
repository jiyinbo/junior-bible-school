<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jbs_tests', function (Blueprint $table): void {
            $table->unsignedSmallInteger('duration_minutes')->nullable()->after('closed_at');
        });
    }

    public function down(): void
    {
        Schema::table('jbs_tests', function (Blueprint $table): void {
            $table->dropColumn('duration_minutes');
        });
    }
};
