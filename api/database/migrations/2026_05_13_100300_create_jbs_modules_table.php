<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jbs_modules', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('jbs_level_id')->constrained('jbs_levels')->cascadeOnDelete();
            $table->string('name');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['jbs_level_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jbs_modules');
    }
};
