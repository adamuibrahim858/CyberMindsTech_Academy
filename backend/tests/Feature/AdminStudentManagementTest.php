<?php

namespace Tests\Feature;

use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminStudentManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $studentUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'name' => 'Admin Boss',
            'email' => 'admin@cmt.org',
            'password' => Hash::make('secret123'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->studentUser = User::create([
            'name' => 'Regular Student',
            'email' => 'student@cmt.org',
            'password' => Hash::make('secret123'),
            'role' => 'student',
            'is_active' => true,
        ]);

        Student::create([
            'user_id' => $this->studentUser->id,
            'student_id' => 'CMT/STU/2026/001',
            'is_active' => true,
        ]);
    }

    public function test_admin_can_create_student_with_auto_generated_id(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/students', [
                'name' => 'Michael Scott',
                'email' => 'michael@dunder.com',
                'password' => 'Scranton123!',
                'phone_number' => '+1-555-0199',
                'address' => '1725 Slough Avenue, Scranton, PA',
            ]);

        $response->assertCreated()
            ->assertJsonStructure([
                'status',
                'data' => ['id', 'student_id', 'name', 'email', 'phone_number'],
            ]);

        $studentId = $response->json('data.student_id');
        $this->assertMatchesRegularExpression('/^CMT\/STU\/\d{4}\/\d{3}$/', $studentId);

        $this->assertDatabaseHas('users', [
            'email' => 'michael@dunder.com',
            'role' => 'student',
        ]);
        $this->assertDatabaseHas('students', [
            'student_id' => $studentId,
            'phone_number' => '+1-555-0199',
        ]);
    }

    public function test_duplicate_student_emails_are_rejected(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/students', [
                'name' => 'Duplicate Person',
                'email' => 'student@cmt.org', // Existing email
                'password' => 'Password123!',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_admin_can_update_student_profile_and_deactivate(): void
    {
        $student = Student::first();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/admin/students/{$student->id}", [
                'name' => 'Updated Name',
                'phone_number' => '+1-999-888-7777',
                'is_active' => false,
            ]);

        $response->assertOk()
            ->assertJsonPath('data.name', 'Updated Name')
            ->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('students', [
            'id' => $student->id,
            'is_active' => false,
        ]);
    }

    public function test_admin_can_reset_student_password(): void
    {
        $student = Student::first();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/admin/students/{$student->id}/reset-password", [
                'password' => 'BrandNewPassword123!',
                'password_confirmation' => 'BrandNewPassword123!',
            ]);

        $response->assertOk()
            ->assertJsonPath('status', 'success');

        // Test logging in with newly reset password
        $loginResponse = $this->postJson('/api/v1/login', [
            'email' => $this->studentUser->email,
            'password' => 'BrandNewPassword123!',
        ]);

        $loginResponse->assertOk();
    }

    public function test_student_cannot_access_admin_endpoints(): void
    {
        $response = $this->actingAs($this->studentUser, 'sanctum')
            ->getJson('/api/v1/admin/students');

        $response->assertStatus(403);
    }
}
