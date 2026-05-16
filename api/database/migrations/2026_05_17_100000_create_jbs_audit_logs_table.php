<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jbs_audit_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('actor_name', 255)->nullable();
            $table->string('user_role', 32)->nullable();
            $table->string('action', 120);
            $table->string('http_method', 10)->nullable();
            $table->string('route', 255)->nullable();
            $table->string('subject_type', 120)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->string('subject_label', 255)->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->json('metadata')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->string('status', 20)->default('success');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['created_at']);
            $table->index(['action', 'created_at']);
            $table->index(['user_id', 'created_at']);
            $table->index(['subject_type', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jbs_audit_logs');
    }
};
