<?php

namespace Tests\Feature;

use App\Models\Certificate;
use App\Models\Course;
use App\Models\Enrolment;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class StudentIsolationAndDownloadTest extends TestCase
{
    use RefreshDatabase;

    private User $studentUser1;
    private Student $student1;
    private User $studentUser2;
    private Student $student2;
    private Course $course;
    private Enrolment $enrolment1;
    private Certificate $certificate1;

    protected function setUp(): void
    {
        parent::setUp();

        $this->studentUser1 = User::create([
            'name' => 'Student One',
            'email' => 'student1@example.com',
            'password' => Hash::make('password123'),
            'role' => 'student',
            'is_active' => true,
        ]);

        $this->student1 = Student::create([
            'user_id' => $this->studentUser1->id,
            'student_id' => 'CMT/STU/2026/001',
            'phone_number' => '+1-555-1111',
            'is_active' => true,
        ]);

        $this->studentUser2 = User::create([
            'name' => 'Student Two',
            'email' => 'student2@example.com',
            'password' => Hash::make('password123'),
            'role' => 'student',
            'is_active' => true,
        ]);

        $this->student2 = Student::create([
            'user_id' => $this->studentUser2->id,
            'student_id' => 'CMT/STU/2026/002',
            'is_active' => true,
        ]);

        $this->course = Course::create([
            'name' => 'Enterprise Architecture',
            'code' => 'CMT-ENT-101',
            'is_active' => true,
        ]);

        $this->enrolment1 = Enrolment::create([
            'student_id' => $this->student1->id,
            'course_id' => $this->course->id,
            'status' => 'completed',
            'enrolled_at' => now()->subMonths(1),
            'completed_at' => now()->subDays(2),
        ]);

        $this->certificate1 = Certificate::create([
            'enrolment_id' => $this->enrolment1->id,
            'certificate_number' => 'CMT/2026/001',
            'verification_code' => 'uuid-1234-abcd',
            'issued_at' => now()->subDays(2),
            'status' => 'valid',
        ]);
    }

    public function test_student_can_only_view_own_profile_and_stats(): void
    {
        $response = $this->actingAs($this->studentUser1, 'sanctum')
            ->getJson('/api/v1/student/profile');

        $response->assertOk()
            ->assertJsonPath('data.student_id', 'CMT/STU/2026/001')
            ->assertJsonPath('data.phone_number', '+1-555-1111');

        $stats = $this->actingAs($this->studentUser1, 'sanctum')
            ->getJson('/api/v1/student/dashboard');

        $stats->assertOk()
            ->assertJsonPath('data.total_enrolled_courses', 1)
            ->assertJsonPath('data.completed_courses', 1)
            ->assertJsonPath('data.available_certificates', 1);
    }

    public function test_student_cannot_download_another_students_certificate(): void
    {
        // Student 2 attempts to download Student 1's certificate
        $response = $this->actingAs($this->studentUser2, 'sanctum')
            ->getJson("/api/v1/student/certificates/{$this->certificate1->id}/download");

        $response->assertStatus(403)
            ->assertJsonPath('status', 'error');
    }

    public function test_student_cannot_download_revoked_certificate(): void
    {
        $this->certificate1->update([
            'status' => 'revoked',
            'revoked_at' => now(),
            'revocation_reason' => 'Invalid exam records',
        ]);

        $response = $this->actingAs($this->studentUser1, 'sanctum')
            ->getJson("/api/v1/student/certificates/{$this->certificate1->id}/download");

        $response->assertStatus(422)
            ->assertJsonPath('status', 'error');
    }

    public function test_student_cannot_download_incomplete_enrolment_certificate(): void
    {
        $this->enrolment1->update(['status' => 'in_progress']);

        $response = $this->actingAs($this->studentUser1, 'sanctum')
            ->getJson("/api/v1/student/certificates/{$this->certificate1->id}/download");

        $response->assertStatus(422);
    }

    public function test_student_can_download_their_own_valid_certificate_pdf(): void
    {
        $response = $this->actingAs($this->studentUser1, 'sanctum')
            ->get("/api/v1/student/certificates/{$this->certificate1->id}/download");

        $response->assertOk();
        $this->assertEquals('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('Certificate-CMT-2026-001.pdf', $response->headers->get('Content-Disposition') ?? '');
    }
}
