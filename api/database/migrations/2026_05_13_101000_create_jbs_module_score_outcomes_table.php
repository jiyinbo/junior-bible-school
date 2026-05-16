<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jbs_module_score_outcomes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('jbs_student_registration_id')->constrained('jbs_student_registrations')->cascadeOnDelete();
            $table->foreignId('jbs_module_id')->constrained('jbs_modules')->cascadeOnDelete();
            $table->decimal('score', 8, 2);
            $table->decimal('max_score', 8, 2);
            $table->string('source', 16);
            $table->foreignId('jbs_attempt_id')->nullable()->constrained('jbs_attempts')->nullOnDelete();
            $table->timestamp('admin_confirmed_at')->nullable();
            $table->foreignId('admin_confirmed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['jbs_student_registration_id', 'jbs_module_id'], 'jbs_score_registration_module_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jbs_module_score_outcomes');
    }
};
