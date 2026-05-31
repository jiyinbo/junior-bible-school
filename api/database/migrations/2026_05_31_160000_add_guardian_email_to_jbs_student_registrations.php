<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jbs_student_registrations', function (Blueprint $table): void {
            $table->string('guardian_email', 255)->nullable()->after('guardian_phone');
        });
    }

    public function down(): void
    {
        Schema::table('jbs_student_registrations', function (Blueprint $table): void {
            $table->dropColumn('guardian_email');
        });
    }
};
