<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Enrolment;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CourseAndEnrolmentTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Student $student;

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

        $user = User::create([
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => Hash::make('secret123'),
            'role' => 'student',
            'is_active' => true,
        ]);

        $this->student = Student::create([
            'user_id' => $user->id,
            'student_id' => 'CMT/STU/2026/001',
            'is_active' => true,
        ]);
    }

    public function test_admin_can_create_and_manage_courses(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/courses', [
                'name' => 'Cloud Infrastructure & DevOps',
                'code' => 'CMT-OPS-101',
                'description' => 'Docker, Kubernetes, CI/CD and AWS.',
                'duration' => '6 Weeks',
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.code', 'CMT-OPS-101');

        $courseId = $response->json('data.id');

        // Update
        $updateResponse = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/admin/courses/{$courseId}", [
                'name' => 'Cloud Infrastructure Masterclass',
            ]);

        $updateResponse->assertOk()
            ->assertJsonPath('data.name', 'Cloud Infrastructure Masterclass');
    }

    public function test_deleting_course_with_existing_enrolments_is_safeguarded(): void
    {
        $course = Course::create([
            'name' => 'Data Science Essentials',
            'code' => 'CMT-DAT-101',
            'is_active' => true,
        ]);

        Enrolment::create([
            'student_id' => $this->student->id,
            'course_id' => $course->id,
            'status' => 'in_progress',
            'enrolled_at' => now(),
        ]);

        // Attempt delete
        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/v1/admin/courses/{$course->id}");

        $response->assertStatus(422)
            ->assertJsonPath('status', 'error');

        $this->assertDatabaseHas('courses', ['id' => $course->id]);
    }

    public function test_admin_can_enrol_student_in_course(): void
    {
        $course = Course::create([
            'name' => 'Mobile App Development',
            'code' => 'CMT-MOB-101',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/enrolments', [
                'student_id' => $this->student->id,
                'course_id' => $course->id,
                'remarks' => 'Registered for morning cohort.',
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'in_progress');

        $this->assertDatabaseHas('enrolments', [
            'student_id' => $this->student->id,
            'course_id' => $course->id,
            'status' => 'in_progress',
        ]);
    }

    public function test_duplicate_active_enrolments_are_rejected(): void
    {
        $course = Course::create([
            'name' => 'UX Design',
            'code' => 'CMT-UX-101',
            'is_active' => true,
        ]);

        Enrolment::create([
            'student_id' => $this->student->id,
            'course_id' => $course->id,
            'status' => 'in_progress',
            'enrolled_at' => now(),
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/enrolments', [
                'student_id' => $this->student->id,
                'course_id' => $course->id,
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('status', 'error');
    }
}
