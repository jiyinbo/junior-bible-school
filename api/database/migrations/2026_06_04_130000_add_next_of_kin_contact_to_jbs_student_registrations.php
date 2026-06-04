<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jbs_student_registrations', function (Blueprint $table): void {
            $table->string('next_of_kin_phone', 20)->nullable()->after('next_of_kin_name');
            $table->string('next_of_kin_email', 255)->nullable()->after('next_of_kin_phone');
        });
    }

    public function down(): void
    {
        Schema::table('jbs_student_registrations', function (Blueprint $table): void {
            $table->dropColumn(['next_of_kin_phone', 'next_of_kin_email']);
        });
    }
};
