<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jbs_sessions', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->timestamp('registration_opens_at')->nullable();
            $table->timestamp('registration_closes_at')->nullable();
            $table->unsignedSmallInteger('min_attendance_days')->nullable();
            $table->boolean('is_past')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jbs_sessions');
    }
};
