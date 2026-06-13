<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jbs_student_registrations', function (Blueprint $table): void {
            $table->string('portal_pin_hash')->nullable()->after('registration_number');
        });
    }

    public function down(): void
    {
        Schema::table('jbs_student_registrations', function (Blueprint $table): void {
            $table->dropColumn('portal_pin_hash');
        });
    }
};
