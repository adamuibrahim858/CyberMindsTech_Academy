<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\CertificatePayment;
use App\Models\Coupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class PaystackWebhookController extends Controller
{
    /**
     * Handle incoming webhook from Paystack.
     */
    public function handle(Request $request): JsonResponse
    {
        $secretKey = config('services.paystack.secret_key');
        $signature = $request->header('x-paystack-signature');
        $payload = $request->getContent();

        // Security: Validate HMAC SHA512 signature
        if ($secretKey) {
            $computedSignature = hash_hmac('sha512', $payload, $secretKey);
            if (! hash_equals($computedSignature, (string) $signature)) {
                Log::warning('Paystack webhook signature mismatch', [
                    'signature' => $signature,
                ]);
                return response()->json(['message' => 'Invalid signature'], Response::HTTP_UNAUTHORIZED);
            }
        }

        $event = $request->input('event');
        $data = $request->input('data', []);

        if ($event === 'charge.success' && ! empty($data['reference'])) {
            $reference = $data['reference'];

            $payment = CertificatePayment::where('paystack_reference', $reference)->first();

            if ($payment && ! $payment->isSuccessful()) {
                $expectedAmountInKobo = (int) round($payment->final_amount * 100);
                $actualAmountInKobo = (int) ($data['amount'] ?? 0);

                if ($actualAmountInKobo >= $expectedAmountInKobo) {
                    DB::transaction(function () use ($payment, $data) {
                        $lockedPayment = CertificatePayment::where('id', $payment->id)->lockForUpdate()->first();
                        if ($lockedPayment && ! $lockedPayment->isSuccessful()) {
                            $lockedPayment->update([
                                'status' => 'successful',
                                'paid_at' => now(),
                                'paystack_transaction_id' => (string) ($data['id'] ?? null),
                                'channel' => $data['channel'] ?? 'webhook',
                                'metadata' => array_merge($lockedPayment->metadata ?? [], [
                                    'webhook_received_at' => now()->toIso8601String(),
                                ]),
                            ]);

                            if ($lockedPayment->coupon_id) {
                                Coupon::where('id', $lockedPayment->coupon_id)->increment('uses_count');
                            }
                        }
                    });
                }
            }
        }

        return response()->json(['status' => 'success']);
    }
}
