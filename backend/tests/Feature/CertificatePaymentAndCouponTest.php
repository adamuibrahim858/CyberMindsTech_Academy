<?php

namespace Tests\Feature;

use App\Models\Certificate;
use App\Models\CertificatePayment;
use App\Models\Coupon;
use App\Models\Course;
use App\Models\Enrolment;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CertificatePaymentAndCouponTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $studentUser1;
    protected Student $student1;
    protected User $studentUser2;
    protected Student $student2;

    protected function setUp(): void
    {
        parent::setUp();

        // Create Admin
        $this->adminUser = User::factory()->create([
            'role' => 'admin',
            'is_active' => true,
        ]);

        // Create Student 1
        $this->studentUser1 = User::factory()->create([
            'role' => 'student',
            'email' => 'student1@example.com',
            'is_active' => true,
        ]);
        $this->student1 = Student::create([
            'user_id' => $this->studentUser1->id,
            'student_id' => 'CMT/STU/001',
            'phone_number' => '08011112222',
            'is_active' => true,
        ]);

        // Create Student 2
        $this->studentUser2 = User::factory()->create([
            'role' => 'student',
            'email' => 'student2@example.com',
            'is_active' => true,
        ]);
        $this->student2 = Student::create([
            'user_id' => $this->studentUser2->id,
            'student_id' => 'CMT/STU/002',
            'phone_number' => '08033334444',
            'is_active' => true,
        ]);

        config([
            'services.paystack.secret_key' => 'sk_test_fake_secret_key',
            'services.paystack.public_key' => 'pk_test_fake_public_key',
            'services.paystack.payment_url' => 'https://api.paystack.co',
        ]);
    }

    public function test_admin_can_set_and_update_course_certificate_price(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->postJson('/api/v1/admin/courses', [
                'name' => 'Cybersecurity Analyst Track',
                'code' => 'CMT-SEC-101',
                'duration' => '12 Weeks',
                'certificate_price' => 15000.00,
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.certificate_price', 15000)
            ->assertJsonPath('data.is_certificate_free', false);

        $courseId = $response->json('data.id');

        // Admin updates price
        $updateResponse = $this->actingAs($this->adminUser)
            ->putJson("/api/v1/admin/courses/{$courseId}", [
                'certificate_price' => 20000.00,
            ]);

        $updateResponse->assertOk()
            ->assertJsonPath('data.certificate_price', 20000);
    }

    public function test_admin_can_manage_coupons_including_100_percent_discount(): void
    {
        // Create 50% discount coupon
        $res50 = $this->actingAs($this->adminUser)
            ->postJson('/api/v1/admin/coupons', [
                'code' => 'halfoff',
                'discount_percentage' => 50,
                'max_uses' => 10,
            ]);

        $res50->assertCreated()
            ->assertJsonPath('data.code', 'HALFOFF')
            ->assertJsonPath('data.discount_percentage', 50);

        // Create 100% discount coupon
        $res100 = $this->actingAs($this->adminUser)
            ->postJson('/api/v1/admin/coupons', [
                'code' => 'scholarship100',
                'discount_percentage' => 100,
                'max_uses' => 5,
            ]);

        $res100->assertCreated()
            ->assertJsonPath('data.code', 'SCHOLARSHIP100')
            ->assertJsonPath('data.discount_percentage', 100);

        // Listing coupons
        $listRes = $this->actingAs($this->adminUser)
            ->getJson('/api/v1/admin/coupons');

        $listRes->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_student_can_download_free_course_certificate_without_payment(): void
    {
        $freeCourse = Course::create([
            'name' => 'Intro to Python',
            'certificate_price' => 0.00,
        ]);

        $enrolment = Enrolment::create([
            'student_id' => $this->student1->id,
            'course_id' => $freeCourse->id,
            'status' => 'completed',
            'enrolled_at' => now()->subMonth(),
            'completed_at' => now(),
        ]);

        $certificate = Certificate::create([
            'enrolment_id' => $enrolment->id,
            'certificate_number' => 'CMT/2026/001',
            'verification_code' => 'uuid-free-cert',
            'issued_at' => now(),
            'status' => 'valid',
        ]);

        // Student can directly download
        $downloadRes = $this->actingAs($this->studentUser1)
            ->get("/api/v1/student/certificates/{$certificate->id}/download");

        $downloadRes->assertOk();
    }

    public function test_student_is_blocked_from_downloading_paid_certificate_until_payment_is_completed(): void
    {
        $paidCourse = Course::create([
            'name' => 'Fullstack Engineering',
            'certificate_price' => 10000.00,
        ]);

        $enrolment = Enrolment::create([
            'student_id' => $this->student1->id,
            'course_id' => $paidCourse->id,
            'status' => 'completed',
            'enrolled_at' => now()->subMonth(),
            'completed_at' => now(),
        ]);

        $certificate = Certificate::create([
            'enrolment_id' => $enrolment->id,
            'certificate_number' => 'CMT/2026/002',
            'verification_code' => 'uuid-paid-cert',
            'issued_at' => now(),
            'status' => 'valid',
        ]);

        // Attempting download before payment results in 402 Payment Required
        $downloadRes = $this->actingAs($this->studentUser1)
            ->getJson("/api/v1/student/certificates/{$certificate->id}/download");

        $downloadRes->assertStatus(402)
            ->assertJsonPath('payment_required', true)
            ->assertJsonPath('certificate_price', 10000);
    }

    public function test_student_can_apply_coupon_and_claim_free_with_100_percent_discount(): void
    {
        $paidCourse = Course::create([
            'name' => 'DevOps & Cloud Masterclass',
            'certificate_price' => 8000.00,
        ]);

        $coupon100 = Coupon::create([
            'code' => 'FREEPASS',
            'discount_percentage' => 100,
            'is_active' => true,
        ]);

        $enrolment = Enrolment::create([
            'student_id' => $this->student1->id,
            'course_id' => $paidCourse->id,
            'status' => 'completed',
            'enrolled_at' => now()->subMonth(),
            'completed_at' => now(),
        ]);

        $certificate = Certificate::create([
            'enrolment_id' => $enrolment->id,
            'certificate_number' => 'CMT/2026/003',
            'verification_code' => 'uuid-coupon-cert',
            'issued_at' => now(),
            'status' => 'valid',
        ]);

        // 1. Preview coupon
        $couponRes = $this->actingAs($this->studentUser1)
            ->postJson("/api/v1/student/certificates/{$certificate->id}/apply-coupon", [
                'code' => 'freepass',
            ]);

        $couponRes->assertOk()
            ->assertJsonPath('data.discount_percentage', 100)
            ->assertJsonPath('data.final_amount', 0)
            ->assertJsonPath('data.is_free', true);

        // 2. Claim free with 100% coupon
        $claimRes = $this->actingAs($this->studentUser1)
            ->postJson("/api/v1/student/certificates/{$certificate->id}/claim-free", [
                'code' => 'freepass',
            ]);

        $claimRes->assertOk()
            ->assertJsonPath('status', 'success');

        // Coupon uses count incremented
        $this->assertEquals(1, $coupon100->fresh()->uses_count);

        // 3. Now download succeeds immediately without any further payment
        $downloadRes = $this->actingAs($this->studentUser1)
            ->get("/api/v1/student/certificates/{$certificate->id}/download");

        $downloadRes->assertOk();
    }

    public function test_student_paystack_payment_flow_and_verification(): void
    {
        $paidCourse = Course::create([
            'name' => 'Data Science Professional',
            'certificate_price' => 5000.00,
        ]);

        $enrolment = Enrolment::create([
            'student_id' => $this->student1->id,
            'course_id' => $paidCourse->id,
            'status' => 'completed',
            'enrolled_at' => now()->subMonth(),
            'completed_at' => now(),
        ]);

        $certificate = Certificate::create([
            'enrolment_id' => $enrolment->id,
            'certificate_number' => 'CMT/2026/004',
            'verification_code' => 'uuid-paystack-cert',
            'issued_at' => now(),
            'status' => 'valid',
        ]);

        // Mock Paystack initialize
        Http::fake([
            'https://api.paystack.co/transaction/initialize' => Http::response([
                'status' => true,
                'message' => 'Authorization URL created',
                'data' => [
                    'authorization_url' => 'https://checkout.paystack.com/auth123',
                    'access_code' => 'acc_123',
                    'reference' => 'CMT-PAY-REF-001',
                ],
            ], 200),
            'https://api.paystack.co/transaction/verify/*' => Http::response([
                'status' => true,
                'message' => 'Verification successful',
                'data' => [
                    'id' => 999888,
                    'status' => 'success',
                    'reference' => 'CMT-PAY-REF-001',
                    'amount' => 500000, // 5000 NGN in kobo
                    'currency' => 'NGN',
                    'channel' => 'card',
                    'gateway_response' => 'Approved',
                    'paid_at' => now()->toISOString(),
                ],
            ], 200),
        ]);

        // 1. Initialize payment
        $initRes = $this->actingAs($this->studentUser1)
            ->postJson("/api/v1/student/certificates/{$certificate->id}/initialize-payment");

        $initRes->assertOk()
            ->assertJsonPath('status', 'success');

        $ref = $initRes->json('data.reference');
        $this->assertNotEmpty($ref);

        // Update the mock to match the generated reference
        Http::fake([
            'https://api.paystack.co/transaction/verify/' . rawurlencode($ref) => Http::response([
                'status' => true,
                'message' => 'Verification successful',
                'data' => [
                    'id' => 999888,
                    'status' => 'success',
                    'reference' => $ref,
                    'amount' => 500000,
                    'currency' => 'NGN',
                    'channel' => 'card',
                    'gateway_response' => 'Approved',
                    'paid_at' => now()->toISOString(),
                ],
            ], 200),
        ]);

        // 2. Verify payment securely on backend
        $verifyRes = $this->actingAs($this->studentUser1)
            ->postJson("/api/v1/student/certificates/{$certificate->id}/verify-payment", [
                'reference' => $ref,
            ]);

        $verifyRes->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.status', 'successful');

        // Payment record is marked successful
        $this->assertDatabaseHas('certificate_payments', [
            'certificate_id' => $certificate->id,
            'status' => 'successful',
            'amount' => 5000.00,
        ]);

        // 3. One-time payment: student can download certificate anytime without paying again
        $downloadRes = $this->actingAs($this->studentUser1)
            ->get("/api/v1/student/certificates/{$certificate->id}/download");

        $downloadRes->assertOk();

        // 4. Student cannot pay for this certificate again
        $rePayRes = $this->actingAs($this->studentUser1)
            ->postJson("/api/v1/student/certificates/{$certificate->id}/initialize-payment");

        $rePayRes->assertStatus(422)
            ->assertJsonPath('already_paid', true);
    }

    public function test_student_cannot_access_or_pay_for_another_students_certificate(): void
    {
        $course = Course::create([
            'name' => 'Network Engineering',
            'certificate_price' => 5000.00,
        ]);

        // Enrolment for Student 1
        $enrolment1 = Enrolment::create([
            'student_id' => $this->student1->id,
            'course_id' => $course->id,
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        $cert1 = Certificate::create([
            'enrolment_id' => $enrolment1->id,
            'certificate_number' => 'CMT/2026/005',
            'verification_code' => 'uuid-student1-cert',
            'issued_at' => now(),
            'status' => 'valid',
        ]);

        // Student 2 tries to initialize payment for Student 1's certificate -> 403 Forbidden
        $res = $this->actingAs($this->studentUser2)
            ->postJson("/api/v1/student/certificates/{$cert1->id}/initialize-payment");

        $res->assertStatus(403);

        // Student 2 tries to download Student 1's certificate -> 403 Forbidden
        $dlRes = $this->actingAs($this->studentUser2)
            ->getJson("/api/v1/student/certificates/{$cert1->id}/download");

        $dlRes->assertStatus(403);
    }
}
