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

class IndependentCourseCompletionAndCertificateTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Student $student;
    private Course $courseA;
    private Course $courseB;

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
            'name' => 'Alice Green',
            'email' => 'alice@example.com',
            'password' => Hash::make('secret123'),
            'role' => 'student',
            'is_active' => true,
        ]);

        $this->student = Student::create([
            'user_id' => $user->id,
            'student_id' => 'CMT/STU/2026/001',
            'is_active' => true,
        ]);

        $this->courseA = Course::create([
            'name' => 'Course Alpha',
            'code' => 'ALPHA-101',
            'is_active' => true,
        ]);

        $this->courseB = Course::create([
            'name' => 'Course Beta',
            'code' => 'BETA-101',
            'is_active' => true,
        ]);
    }

    public function test_completing_one_course_does_not_affect_other_courses(): void
    {
        $enrolmentA = Enrolment::create([
            'student_id' => $this->student->id,
            'course_id' => $this->courseA->id,
            'status' => 'in_progress',
            'enrolled_at' => now()->subDays(10),
        ]);

        $enrolmentB = Enrolment::create([
            'student_id' => $this->student->id,
            'course_id' => $this->courseB->id,
            'status' => 'in_progress',
            'enrolled_at' => now()->subDays(5),
        ]);

        // Complete Course A
        $response = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/admin/enrolments/{$enrolmentA->id}/status", [
                'status' => 'completed',
                'remarks' => 'Passed practical training with excellence.',
            ]);

        $response->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.certificate.status', 'valid');

        // Verify Certificate was created
        $this->assertDatabaseHas('certificates', [
            'enrolment_id' => $enrolmentA->id,
            'status' => 'valid',
        ]);

        // Course B MUST remain strictly in_progress without completion or certificate!
        $enrolmentB->refresh();
        $this->assertEquals('in_progress', $enrolmentB->status);
        $this->assertNull($enrolmentB->completed_at);
        $this->assertNull($enrolmentB->certificate);
    }

    public function test_certificate_number_format_and_duplicate_prevention(): void
    {
        $enrolment = Enrolment::create([
            'student_id' => $this->student->id,
            'course_id' => $this->courseA->id,
            'status' => 'in_progress',
            'enrolled_at' => now(),
        ]);

        // Mark completed first time
        $res1 = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/admin/enrolments/{$enrolment->id}/status", [
                'status' => 'completed',
            ]);

        $res1->assertOk();
        $certNo = $res1->json('data.certificate.certificate_number');
        $this->assertMatchesRegularExpression('/^CMT\/\d{4}\/\d{3}$/', $certNo);

        // Mark completed second time (repeat request)
        $res2 = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/v1/admin/enrolments/{$enrolment->id}/status", [
                'status' => 'completed',
            ]);

        $res2->assertOk();
        $certNo2 = $res2->json('data.certificate.certificate_number');

        // Must NOT create duplicate certificate
        $this->assertEquals($certNo, $certNo2);
        $this->assertEquals(1, Certificate::where('enrolment_id', $enrolment->id)->count());
    }

    public function test_admin_can_revoke_certificate_with_reason(): void
    {
        $enrolment = Enrolment::create([
            'student_id' => $this->student->id,
            'course_id' => $this->courseA->id,
            'status' => 'completed',
            'enrolled_at' => now()->subDays(10),
            'completed_at' => now(),
        ]);

        $certificate = Certificate::create([
            'enrolment_id' => $enrolment->id,
            'certificate_number' => 'CMT/2026/001',
            'verification_code' => 'test-uuid-code-1234',
            'issued_at' => now(),
            'status' => 'valid',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/admin/certificates/{$certificate->id}/revoke", [
                'reason' => 'Academic misconduct discovered post-graduation.',
            ]);

        $response->assertOk()
            ->assertJsonPath('data.status', 'revoked')
            ->assertJsonPath('data.is_valid', false)
            ->assertJsonPath('data.revocation_reason', 'Academic misconduct discovered post-graduation.')
            ->assertJsonPath('data.revoker.id', $this->admin->id);

        $this->assertDatabaseHas('certificates', [
            'id' => $certificate->id,
            'status' => 'revoked',
            'revoked_by' => $this->admin->id,
        ]);
    }
}
