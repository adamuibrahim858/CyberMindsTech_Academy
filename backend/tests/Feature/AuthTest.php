<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_login_and_receive_token(): void
    {
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/v1/login', [
            'email' => 'admin@example.com',
            'password' => 'password123',
        ]);

        $response->assertOk()
            ->assertJsonStructure([
                'status',
                'message',
                'token',
                'user' => ['id', 'name', 'email', 'role', 'is_active'],
            ])
            ->assertJsonPath('user.role', 'admin');
    }

    public function test_student_can_login(): void
    {
        $user = User::create([
            'name' => 'Student User',
            'email' => 'student@example.com',
            'password' => Hash::make('password123'),
            'role' => 'student',
            'is_active' => true,
        ]);

        Student::create([
            'user_id' => $user->id,
            'student_id' => 'CMT/STU/2026/001',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/v1/login', [
            'email' => 'student@example.com',
            'password' => 'password123',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.role', 'student');
    }

    public function test_deactivated_user_cannot_login(): void
    {
        User::create([
            'name' => 'Inactive User',
            'email' => 'inactive@example.com',
            'password' => Hash::make('password123'),
            'role' => 'student',
            'is_active' => false,
        ]);

        $response = $this->postJson('/api/v1/login', [
            'email' => 'inactive@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('status', 'error');
    }

    public function test_authenticated_user_can_logout(): void
    {
        $user = User::create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => Hash::make('password123'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/logout');

        $response->assertOk()
            ->assertJsonPath('message', 'Logged out successfully');

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_forgot_and_reset_password_workflow(): void
    {
        $user = User::create([
            'name' => 'Reset Target',
            'email' => 'target@example.com',
            'password' => Hash::make('old_password'),
            'role' => 'student',
            'is_active' => true,
        ]);

        // 1. Request reset token
        $forgotResponse = $this->postJson('/api/v1/forgot-password', [
            'email' => 'target@example.com',
        ]);

        $forgotResponse->assertOk()
            ->assertJsonStructure(['status', 'message', 'reset_token']);

        $token = $forgotResponse->json('reset_token');

        // 2. Perform password reset
        $resetResponse = $this->postJson('/api/v1/reset-password', [
            'email' => 'target@example.com',
            'token' => $token,
            'password' => 'new_secure_password',
            'password_confirmation' => 'new_secure_password',
        ]);

        $resetResponse->assertOk();

        // 3. Login with new password
        $loginResponse = $this->postJson('/api/v1/login', [
            'email' => 'target@example.com',
            'password' => 'new_secure_password',
        ]);

        $loginResponse->assertOk();
    }
}
