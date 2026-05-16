<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jbs_module_assignments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('jbs_module_id')->constrained('jbs_modules')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['jbs_module_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jbs_module_assignments');
    }
};
