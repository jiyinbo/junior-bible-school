<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jbs_student_registrations', function (Blueprint $table): void {
            $table->unique(['jbs_session_id', 'email'], 'jbs_registrations_session_email_unique');
        });
    }

    public function down(): void
    {
        Schema::table('jbs_student_registrations', function (Blueprint $table): void {
            $table->dropUnique('jbs_registrations_session_email_unique');
        });
    }
};
