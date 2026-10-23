<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\CertificatePaymentResource;
use App\Models\Certificate;
use App\Models\CertificatePayment;
use App\Models\Coupon;
use App\Services\CentralGatewayService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class StudentCertificatePaymentController extends Controller
{
    public function __construct(
        protected CentralGatewayService $gateway
    ) {}

    /**
     * Get payment status and pricing information for a certificate.
     */
    public function status(Request $request, int $id): JsonResponse
    {
        $student = $request->user()->student;

        if (! $student) {
            return response()->json([
                'status' => 'error',
                'message' => 'Student record not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        $certificate = Certificate::with(['enrolment.course', 'latestSuccessfulPayment.coupon'])
            ->findOrFail($id);

        if ($certificate->enrolment->student_id !== $student->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Forbidden. You do not own this certificate.',
            ], Response::HTTP_FORBIDDEN);
        }

        $course = $certificate->enrolment->course;
        $price = (float) ($course->certificate_price ?? 0);
        $isPaid = $certificate->isPaid();

        return response()->json([
            'status' => 'success',
            'data' => [
                'certificate_id'   => $certificate->id,
                'certificate_number' => $certificate->certificate_number,
                'course_name'      => $course->name,
                'course_id'        => $course->id,
                'price'            => $price,
                'is_paid'          => $isPaid,
                'requires_payment' => $price > 0 && ! $isPaid,
                'latest_payment'   => $certificate->latestSuccessfulPayment
                    ? new CertificatePaymentResource($certificate->latestSuccessfulPayment)
                    : null,
                'gateway_configured' => $this->gateway->isConfigured(),
            ],
        ]);
    }

    /**
     * Validate and preview a coupon for a certificate before checkout.
     */
    public function applyCoupon(Request $request, int $id): JsonResponse
    {
        $student = $request->user()->student;

        if (! $student) {
            return response()->json([
                'status' => 'error',
                'message' => 'Student record not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:50'],
        ]);

        $certificate = Certificate::with(['enrolment.course'])->findOrFail($id);

        if ($certificate->enrolment->student_id !== $student->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Forbidden. You do not own this certificate.',
            ], Response::HTTP_FORBIDDEN);
        }

        if ($certificate->isPaid()) {
            return response()->json([
                'status' => 'error',
                'message' => 'This certificate has already been paid and unlocked.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $code = Str::upper(trim($validated['code']));
        $coupon = Coupon::where('code', $code)->first();

        if (! $coupon) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid coupon code. Please verify and try again.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (! $coupon->is_active) {
            return response()->json([
                'status' => 'error',
                'message' => 'This coupon is currently inactive.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if ($coupon->isExpired()) {
            return response()->json([
                'status' => 'error',
                'message' => 'This coupon has expired.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if ($coupon->isExhausted()) {
            return response()->json([
                'status' => 'error',
                'message' => 'This coupon has reached its maximum usage limit.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $course = $certificate->enrolment->course;
        if (! $coupon->isValidFor($course->id)) {
            return response()->json([
                'status' => 'error',
                'message' => 'This coupon is not applicable to this course.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $basePrice = (float) ($course->certificate_price ?? 0);
        $discountData = $coupon->calculateDiscount($basePrice);

        return response()->json([
            'status' => 'success',
            'data' => [
                'coupon_id' => $coupon->id,
                'code' => $coupon->code,
                'discount_percentage' => (int) $coupon->discount_percentage,
                'original_price' => $basePrice,
                'discount_amount' => $discountData['discount_amount'],
                'final_amount' => $discountData['final_amount'],
                'is_free' => $discountData['is_free'],
            ],
        ]);
    }

    /**
     * Claim free certificate (price is 0 or 100% coupon applied).
     */
    public function claimFree(Request $request, int $id): JsonResponse
    {
        $student = $request->user()->student;

        if (! $student) {
            return response()->json([
                'status' => 'error',
                'message' => 'Student record not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        $certificate = Certificate::with(['enrolment.course'])->findOrFail($id);

        if ($certificate->enrolment->student_id !== $student->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Forbidden. You do not own this certificate.',
            ], Response::HTTP_FORBIDDEN);
        }

        if (! $certificate->enrolment->isCompleted()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cannot unlock certificate for an incomplete course.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if ($certificate->isRevoked()) {
            return response()->json([
                'status' => 'error',
                'message' => 'This certificate has been revoked.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Idempotency: if already paid, return success immediately
        if ($certificate->isPaid()) {
            $payment = $certificate->latestSuccessfulPayment;
            return response()->json([
                'status' => 'success',
                'message' => 'Certificate is already unlocked.',
                'data' => $payment ? new CertificatePaymentResource($payment) : null,
            ]);
        }

        $course = $certificate->enrolment->course;
        $basePrice = (float) ($course->certificate_price ?? 0);

        $coupon = null;
        if ($basePrice > 0) {
            $validated = $request->validate([
                'code' => ['required', 'string', 'max:50'],
            ]);

            $code = Str::upper(trim($validated['code']));
            $coupon = Coupon::where('code', $code)->first();

            if (! $coupon || ! $coupon->isValidFor($course->id) || $coupon->discount_percentage < 100) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'A valid 100% discount coupon is required to claim this certificate for free.',
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
        }

        $payment = DB::transaction(function () use ($certificate, $student, $basePrice, $coupon) {
            // Lock certificate row to prevent duplicate claims
            Certificate::where('id', $certificate->id)->lockForUpdate()->first();

            // Re-check payment existence inside transaction
            $existing = CertificatePayment::where('certificate_id', $certificate->id)
                ->where('status', 'successful')
                ->first();

            if ($existing) {
                return $existing;
            }

            if ($coupon) {
                $coupon->increment('uses_count');
            }

            $reference = 'FREE-' . $certificate->id . '-' . time() . '-' . Str::upper(Str::random(6));

            return CertificatePayment::create([
                'student_id' => $student->id,
                'certificate_id' => $certificate->id,
                'enrolment_id' => $certificate->enrolment_id,
                'coupon_id' => $coupon?->id,
                'amount' => $basePrice,
                'discount_amount' => $basePrice,
                'final_amount' => 0.00,
                'currency' => 'NGN',
                'paystack_reference' => $reference,
                'status' => 'successful',
                'paid_at' => now(),
                'channel' => $coupon ? 'coupon_100' : 'free_course',
                'metadata' => [
                    'source' => $coupon ? '100% Coupon Redemption' : 'Free Course Program',
                    'coupon_code' => $coupon?->code,
                ],
            ]);
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Certificate unlocked successfully! You can now download your certificate.',
            'data' => new CertificatePaymentResource($payment),
        ]);
    }

    /**
     * Initialize Paystack payment for a certificate.
     */
    public function initializePayment(Request $request, int $id): JsonResponse
    {
        $student = $request->user()->student;

        if (! $student) {
            return response()->json([
                'status' => 'error',
                'message' => 'Student record not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        $certificate = Certificate::with(['enrolment.course', 'enrolment.student.user'])->findOrFail($id);

        if ($certificate->enrolment->student_id !== $student->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Forbidden. You do not own this certificate.',
            ], Response::HTTP_FORBIDDEN);
        }

        if (! $certificate->enrolment->isCompleted()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cannot pay for certificate of an incomplete course.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if ($certificate->isRevoked()) {
            return response()->json([
                'status' => 'error',
                'message' => 'This certificate has been revoked.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Prevent duplicate payment if already successfully paid
        if ($certificate->isPaid()) {
            return response()->json([
                'status' => 'error',
                'message' => 'This certificate has already been paid for.',
                'already_paid' => true,
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $course = $certificate->enrolment->course;
        $basePrice = (float) ($course->certificate_price ?? 0);

        if ($basePrice <= 0) {
            return response()->json([
                'status' => 'error',
                'message' => 'This certificate is free. Please use claim-free to unlock.',
                'is_free' => true,
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Validate optional coupon
        $coupon = null;
        $discountAmount = 0.00;
        $finalAmount = $basePrice;

        if ($couponCode = $request->input('coupon_code')) {
            $code = Str::upper(trim($couponCode));
            $coupon = Coupon::where('code', $code)->first();

            if (! $coupon || ! $coupon->isValidFor($course->id)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Coupon code is invalid, expired, or not applicable.',
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $discountData = $coupon->calculateDiscount($basePrice);
            $discountAmount = $discountData['discount_amount'];
            $finalAmount = $discountData['final_amount'];

            if ($finalAmount <= 0) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'This coupon provides 100% discount. Please use claim-free instead of Paystack checkout.',
                    'is_free' => true,
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
        }

        // Generate unique external reference (CM_ prefix per Central Gateway convention)
        $externalReference = 'CM_' . Str::upper(Str::random(12));

        // Build callback URL pointing to the React frontend with context to resume
        $callbackUrl = rtrim($this->gateway->getFrontendUrl(), '/') .
            '/student/certificates?payment_return=1' .
            '&cert_id=' . $certificate->id .
            '&reference=' . $externalReference;

        // Create pending payment record inside a transaction BEFORE calling the gateway
        $payment = DB::transaction(function () use (
            $student, $certificate, $course, $coupon,
            $basePrice, $discountAmount, $finalAmount, $externalReference, $request
        ) {
            return CertificatePayment::create([
                'student_id'         => $student->id,
                'certificate_id'     => $certificate->id,
                'enrolment_id'       => $certificate->enrolment_id,
                'coupon_id'          => $coupon?->id,
                'amount'             => $basePrice,
                'discount_amount'    => $discountAmount,
                'final_amount'       => $finalAmount,
                'currency'           => 'NGN',
                'paystack_reference' => $externalReference,
                'status'             => 'pending',
                'metadata'           => [
                    'course_name'        => $course->name,
                    'certificate_number' => $certificate->certificate_number,
                    'student_name'       => $request->user()->name,
                    'coupon_code'        => $coupon?->code,
                    'source'             => 'central_gateway',
                ],
            ]);
        });

        // POST to Central Gateway — it creates the Paystack session and returns authorization_url
        try {
            $gatewayData = $this->gateway->initializePayment([
                'amount'             => $finalAmount,
                'currency'           => 'NGN',
                'email'              => $request->user()->email,
                'type'               => 'certificate_payment',
                'external_reference' => $externalReference,
                'callback_url'       => $callbackUrl,
                'source_portal'      => config('app.url'),
                'description'        => 'Certificate Unlock — ' . $course->name,
                'metadata'           => [
                    'payment_id'     => $payment->id,
                    'certificate_id' => $certificate->id,
                    'student_id'     => $student->id,
                    'course_id'      => $course->id,
                ],
            ]);
        } catch (Exception $e) {
            Log::error('CentralGateway: failed to initialize certificate payment', [
                'payment_id'         => $payment->id,
                'external_reference' => $externalReference,
                'error'              => $e->getMessage(),
            ]);
            $payment->update([
                'status'   => 'failed',
                'metadata' => array_merge($payment->metadata ?? [], ['init_error' => $e->getMessage()]),
            ]);
            return response()->json([
                'status'  => 'error',
                'message' => 'Could not connect to payment gateway. Please try again later.',
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        // Store the gateway reference for reconciliation (webhook + callback lookups)
        $payment->update([
            'central_reference' => $gatewayData['reference'] ?? null,
            'metadata'          => array_merge($payment->metadata ?? [], [
                'access_code'       => $gatewayData['access_code'] ?? null,
                'central_reference' => $gatewayData['reference'] ?? null,
            ]),
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Payment initialized.',
            'data'    => [
                'payment_id'        => $payment->id,
                'reference'         => $externalReference,
                'central_reference' => $gatewayData['reference'] ?? null,
                'amount'            => $finalAmount,
                'currency'          => 'NGN',
                'email'             => $request->user()->email,
                'authorization_url' => $gatewayData['authorization_url'],
            ],
        ]);
    }

    /**
     * Verify Paystack payment on the Laravel backend.
     * Never trusts frontend status alone.
     */
    public function verifyPayment(Request $request, int $id): JsonResponse
    {
        $student = $request->user()->student;

        if (! $student) {
            return response()->json([
                'status' => 'error',
                'message' => 'Student record not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        $validated = $request->validate([
            'reference' => ['required', 'string', 'max:100'],
        ]);

        $reference = trim($validated['reference']);

        $certificate = Certificate::with(['enrolment.course'])->findOrFail($id);

        if ($certificate->enrolment->student_id !== $student->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Forbidden. You do not own this certificate.',
            ], Response::HTTP_FORBIDDEN);
        }

        // Find the payment record
        $payment = CertificatePayment::where('paystack_reference', $reference)
            ->where('certificate_id', $certificate->id)
            ->first();

        if (! $payment) {
            return response()->json([
                'status' => 'error',
                'message' => 'Payment record not found for this reference.',
            ], Response::HTTP_NOT_FOUND);
        }

        // Idempotency: if already verified successfully, return success immediately
        if ($payment->isSuccessful()) {
            return response()->json([
                'status' => 'success',
                'message' => 'Payment already verified successfully.',
                'data' => new CertificatePaymentResource($payment),
            ]);
        }

        // Mandatory server-side verification via Central Gateway (never trust frontend status alone)
        try {
            $gatewayData = $this->gateway->getPaymentStatus(
                $reference,
                $payment->central_reference
            );
        } catch (Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Failed to verify payment with Central Gateway: ' . $e->getMessage(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Normalize the status returned by the Central Gateway
        $gatewayStatus = strtolower($gatewayData['status'] ?? '');
        $isSuccess = in_array($gatewayStatus, ['success', 'successful', 'completed', 'charge.success'], true);

        if (! $isSuccess) {
            $isFailed = in_array($gatewayStatus, ['failed', 'cancelled', 'abandoned'], true);

            $payment->update([
                'status'   => $isFailed ? 'failed' : 'pending',
                'metadata' => array_merge($payment->metadata ?? [], [
                    'gateway_status_check' => $gatewayData,
                ]),
            ]);

            $message = $isFailed
                ? 'Payment was not successful. Please try again.'
                : 'Payment is still being processed. Please wait a moment and try again.';

            return response()->json([
                'status'  => $isFailed ? 'error' : 'pending',
                'message' => $message,
            ], $isFailed ? Response::HTTP_UNPROCESSABLE_ENTITY : Response::HTTP_ACCEPTED);
        }

        // Security: verify the amount paid matches what we expect (Central Gateway returns amount in Naira)
        $expectedAmount   = (float) $payment->final_amount;
        $gatewayAmount    = (float) ($gatewayData['amount'] ?? $gatewayData['paid_amount'] ?? 0);

        // Allow small floating-point tolerance; some gateways may return kobo — detect and convert
        if ($gatewayAmount > $expectedAmount * 100) {
            // Likely returned in kobo; convert to naira
            $gatewayAmount = $gatewayAmount / 100;
        }

        if ($gatewayAmount < ($expectedAmount - 0.01)) {
            return response()->json([
                'status'  => 'error',
                'message' => "Payment amount mismatch. Expected ₦{$expectedAmount}, gateway reported ₦{$gatewayAmount}.",
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Mark payment successful atomically with idempotency lock
        $payment = DB::transaction(function () use ($payment, $gatewayData) {
            $lockedPayment = CertificatePayment::where('id', $payment->id)->lockForUpdate()->first();

            if ($lockedPayment->isSuccessful()) {
                return $lockedPayment; // Already handled (webhook beat us to it)
            }

            $lockedPayment->update([
                'status'   => 'successful',
                'paid_at'  => now(),
                'channel'  => $gatewayData['channel'] ?? $gatewayData['payment_channel'] ?? 'gateway',
                'central_reference' => $gatewayData['reference'] ?? $lockedPayment->central_reference,
                'metadata' => array_merge($lockedPayment->metadata ?? [], [
                    'gateway_verification' => [
                        'verified_at'      => now()->toIso8601String(),
                        'gateway_status'   => $gatewayData['status'] ?? null,
                        'gateway_response' => $gatewayData['gateway_response'] ?? null,
                        'channel'          => $gatewayData['channel'] ?? null,
                    ],
                ]),
            ]);

            if ($lockedPayment->coupon_id) {
                Coupon::where('id', $lockedPayment->coupon_id)->increment('uses_count');
            }

            return $lockedPayment;
        });

        return response()->json([
            'status'  => 'success',
            'message' => 'Payment verified successfully! Certificate has been unlocked.',
            'data'    => new CertificatePaymentResource($payment->fresh('coupon')),
        ]);
    }

    // -------------------------------------------------------------------------
    // Browser Callback Fallback
    // -------------------------------------------------------------------------

    /**
     * Called when the frontend detects a payment_return=1 query param after
     * the Central Gateway redirects the user's browser back from Paystack.
     *
     * Looks up the pending payment by external_reference, queries the Central
     * Gateway for its status, and returns the result. The frontend then shows
     * success/failure UI without needing the user to manually re-verify.
     *
     * Route: POST /api/v1/student/payment/check-callback
     */
    public function handleCallback(Request $request): JsonResponse
    {
        $student = $request->user()->student;

        if (! $student) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Student record not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        $validated = $request->validate([
            'reference'   => ['required', 'string', 'max:100'],
            'certificate_id' => ['required', 'integer'],
        ]);

        $payment = CertificatePayment::where('paystack_reference', $validated['reference'])
            ->where('certificate_id', $validated['certificate_id'])
            ->first();

        if (! $payment) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Payment record not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        // Verify the student owns this certificate
        $certificate = Certificate::with(['enrolment'])->find($validated['certificate_id']);
        if (! $certificate || $certificate->enrolment->student_id !== $student->id) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Forbidden.',
            ], Response::HTTP_FORBIDDEN);
        }

        // Idempotency: already resolved (webhook processed it while user was on Paystack)
        if ($payment->isSuccessful()) {
            return response()->json([
                'status'  => 'success',
                'message' => 'Payment already verified. Certificate is unlocked.',
                'data'    => new CertificatePaymentResource($payment->fresh('coupon')),
            ]);
        }

        // Query Central Gateway for current status
        try {
            $gatewayData = $this->gateway->getPaymentStatus(
                $validated['reference'],
                $payment->central_reference
            );
        } catch (Exception $e) {
            return response()->json([
                'status'  => 'pending',
                'message' => 'Could not reach payment gateway. Your payment may still be processing.',
            ], Response::HTTP_ACCEPTED);
        }

        $gatewayStatus = strtolower($gatewayData['status'] ?? '');
        $isSuccess = in_array($gatewayStatus, ['success', 'successful', 'completed', 'charge.success'], true);
        $isFailed  = in_array($gatewayStatus, ['failed', 'cancelled', 'abandoned'], true);

        if ($isSuccess) {
            $payment = DB::transaction(function () use ($payment, $gatewayData) {
                $locked = CertificatePayment::where('id', $payment->id)->lockForUpdate()->first();
                if ($locked->isSuccessful()) {
                    return $locked;
                }
                $locked->update([
                    'status'            => 'successful',
                    'paid_at'           => now(),
                    'channel'           => $gatewayData['channel'] ?? 'gateway_callback',
                    'central_reference' => $gatewayData['reference'] ?? $locked->central_reference,
                    'metadata'          => array_merge($locked->metadata ?? [], [
                        'callback_verified_at' => now()->toIso8601String(),
                        'gateway_status'       => $gatewayData['status'] ?? null,
                    ]),
                ]);
                if ($locked->coupon_id) {
                    Coupon::where('id', $locked->coupon_id)->increment('uses_count');
                }
                return $locked;
            });

            return response()->json([
                'status'  => 'success',
                'message' => 'Payment confirmed! Certificate is unlocked.',
                'data'    => new CertificatePaymentResource($payment->fresh('coupon')),
            ]);
        }

        if ($isFailed) {
            $payment->update(['status' => 'failed', 'metadata' => array_merge($payment->metadata ?? [], [
                'callback_gateway_response' => $gatewayData,
            ])]);
            return response()->json([
                'status'  => 'error',
                'message' => 'Payment was not successful. Please try again.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Still pending
        return response()->json([
            'status'  => 'pending',
            'message' => 'Payment is still being processed. Please wait a moment.',
        ], Response::HTTP_ACCEPTED);
    }
}
