<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jbs_questions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('jbs_test_id')->constrained('jbs_tests')->cascadeOnDelete();
            $table->text('prompt');
            $table->json('choices');
            $table->json('correct_indices');
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();

            $table->index(['jbs_test_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jbs_questions');
    }
};
