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

class PublicCertificateVerificationTest extends TestCase
{
    use RefreshDatabase;

    private Certificate $validCert;
    private Certificate $revokedCert;

    protected function setUp(): void
    {
        parent::setUp();

        $studentUser = User::create([
            'name' => 'Sophia Loren',
            'email' => 'sophia.private@example.com',
            'password' => Hash::make('secret123'),
            'role' => 'student',
            'is_active' => true,
        ]);

        $student = Student::create([
            'user_id' => $studentUser->id,
            'student_id' => 'CMT/STU/2026/088',
            'phone_number' => '+1-555-9876',
            'address' => 'Private Secret Address',
            'is_active' => true,
        ]);

        $course = Course::create([
            'name' => 'Full-Stack Software Engineering',
            'code' => 'CMT-SWE-101',
            'is_active' => true,
        ]);

        $enrolment1 = Enrolment::create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'status' => 'completed',
            'enrolled_at' => now()->subMonths(2),
            'completed_at' => now()->subWeeks(1),
        ]);

        $this->validCert = Certificate::create([
            'enrolment_id' => $enrolment1->id,
            'certificate_number' => 'CMT/2026/088',
            'verification_code' => 'valid-uuid-code-999',
            'issued_at' => now()->subWeeks(1),
            'status' => 'valid',
        ]);

        $enrolment2 = Enrolment::create([
            'student_id' => $student->id,
            'course_id' => $course->id,
            'status' => 'completed',
            'enrolled_at' => now()->subMonths(4),
            'completed_at' => now()->subMonths(2),
        ]);

        $this->revokedCert = Certificate::create([
            'enrolment_id' => $enrolment2->id,
            'certificate_number' => 'CMT/2026/007',
            'verification_code' => 'revoked-uuid-code-007',
            'issued_at' => now()->subMonths(2),
            'status' => 'revoked',
            'revoked_at' => now()->subDays(1),
            'revocation_reason' => 'Certificate invalidated due to curriculum audit failure.',
        ]);
    }

    public function test_public_can_verify_valid_certificate_without_sensitive_info(): void
    {
        // URL with certificate number
        $response = $this->getJson('/api/v1/verify/CMT/2026/088');

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.certificate_number', 'CMT/2026/088')
            ->assertJsonPath('data.validity_status', 'valid')
            ->assertJsonPath('data.is_valid', true)
            ->assertJsonPath('data.student_name', 'Sophia Loren')
            ->assertJsonPath('data.course_name', 'Full-Stack Software Engineering');

        // Verify sensitive fields are strictly excluded
        $data = $response->json('data');
        $this->assertArrayNotHasKey('email', $data);
        $this->assertArrayNotHasKey('phone_number', $data);
        $this->assertArrayNotHasKey('address', $data);
        $this->assertArrayNotHasKey('password', $data);
        $this->assertStringNotContainsString('sophia.private@example.com', json_encode($data));
        $this->assertStringNotContainsString('+1-555-9876', json_encode($data));
    }

    public function test_public_can_verify_by_verification_code(): void
    {
        $response = $this->getJson('/api/v1/verify/valid-uuid-code-999');

        $response->assertOk()
            ->assertJsonPath('data.certificate_number', 'CMT/2026/088')
            ->assertJsonPath('data.is_valid', true);
    }

    public function test_public_verification_reports_revoked_status(): void
    {
        $response = $this->getJson('/api/v1/verify/CMT/2026/007');

        $response->assertOk()
            ->assertJsonPath('data.validity_status', 'revoked')
            ->assertJsonPath('data.is_valid', false)
            ->assertJsonPath('data.revocation_reason', 'Certificate invalidated due to curriculum audit failure.');
    }

    public function test_invalid_certificate_returns_404(): void
    {
        $response = $this->getJson('/api/v1/verify/NON-EXISTENT-CERT');

        $response->assertStatus(404)
            ->assertJsonPath('status', 'error');
    }
}
