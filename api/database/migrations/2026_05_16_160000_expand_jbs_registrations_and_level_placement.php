<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jbs_levels', function (Blueprint $table): void {
            $table->string('placement_group', 40)->nullable()->after('name');
        });

        Schema::table('jbs_student_registrations', function (Blueprint $table): void {
            $table->string('guardian_phone', 40)->nullable()->after('guardian_relationship');
            $table->string('gender', 20)->nullable()->after('phone');
            $table->date('date_of_birth')->nullable()->after('gender');
            $table->string('nationality', 120)->nullable()->after('date_of_birth');
            $table->text('address')->nullable()->after('nationality');
            $table->boolean('born_again')->default(false)->after('address');
            $table->date('date_of_new_birth')->nullable()->after('born_again');
            $table->string('new_birth_location', 255)->nullable()->after('date_of_new_birth');
            $table->string('place_of_worship', 255)->nullable()->after('new_birth_location');
            $table->string('place_of_worship_address', 255)->nullable()->after('place_of_worship');
            $table->string('pastor_name', 255)->nullable()->after('place_of_worship_address');
            $table->string('activity_group', 120)->nullable()->after('pastor_name');
            $table->string('current_school', 255)->nullable()->after('activity_group');
            $table->string('current_school_year', 80)->nullable()->after('current_school');
            $table->text('allergies')->nullable()->after('current_school_year');
            $table->string('next_of_kin_name', 255)->nullable()->after('allergies');
        });
    }

    public function down(): void
    {
        Schema::table('jbs_student_registrations', function (Blueprint $table): void {
            $table->dropColumn([
                'guardian_phone',
                'gender',
                'date_of_birth',
                'nationality',
                'address',
                'born_again',
                'date_of_new_birth',
                'new_birth_location',
                'place_of_worship',
                'place_of_worship_address',
                'pastor_name',
                'activity_group',
                'current_school',
                'current_school_year',
                'allergies',
                'next_of_kin_name',
            ]);
        });

        Schema::table('jbs_levels', function (Blueprint $table): void {
            $table->dropColumn('placement_group');
        });
    }
};
