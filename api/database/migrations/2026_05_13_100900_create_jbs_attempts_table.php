<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jbs_attempts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('jbs_test_id')->constrained('jbs_tests')->cascadeOnDelete();
            $table->foreignId('jbs_student_registration_id')->constrained('jbs_student_registrations')->cascadeOnDelete();
            $table->json('answers')->nullable();
            $table->decimal('score', 8, 2)->nullable();
            $table->decimal('max_score', 8, 2)->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();

            $table->unique(['jbs_test_id', 'jbs_student_registration_id'], 'jbs_attempts_test_registration_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jbs_attempts');
    }
};
