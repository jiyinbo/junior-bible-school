<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'admin@jbs.local'],
            [
                'name' => 'JBS Admin',
                'password' => Hash::make('password'),
                'role' => 'admin',
            ],
        );

        User::query()->updateOrCreate(
            ['email' => 'teacher@jbs.local'],
            [
                'name' => 'JBS Teacher',
                'password' => Hash::make('password'),
                'role' => 'teacher',
            ],
        );
    }
}
