<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\CertificatePayment;
use App\Models\Coupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CentralGatewayWebhookController extends Controller
{
    /**
     * Handle incoming webhooks from Central CyberMinds Gateway.
     * Authenticated via X-CyberMinds-API-Key / X-API-Key header.
     */
    public function handle(Request $request): JsonResponse
    {
        $configuredKey = (string) config('services.central_gateway.api_secret_key');

        // Verify API secret key if configured
        if ($configuredKey !== '') {
            $incomingKey = (string) (
                $request->header('X-CyberMinds-API-Key')
                ?? $request->header('X-API-Key')
                ?? $request->header('X-CyberMinds-Key')
                ?? ''
            );

            if (!hash_equals($configuredKey, $incomingKey)) {
                Log::warning('CentralGatewayWebhook: Invalid API secret key', [
                    'ip' => $request->ip(),
                ]);
                return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 401);
            }
        }

        $payload = $request->all();
        Log::info('CentralGatewayWebhook: Payload received', [
            'event' => $payload['event'] ?? 'unknown',
            'reference' => $payload['reference'] ?? ($payload['data']['reference'] ?? null),
            'external_reference' => $payload['external_reference'] ?? ($payload['data']['external_reference'] ?? null),
            'status' => $payload['status'] ?? ($payload['data']['status'] ?? null),
        ]);

        $data = $payload['data'] ?? $payload;
        $externalReference = $data['external_reference'] ?? $payload['external_reference'] ?? null;
        $centralReference = $data['reference'] ?? $payload['reference'] ?? null;
        $statusRaw = strtolower((string) ($data['status'] ?? $payload['status'] ?? ''));

        if (!$externalReference && !$centralReference) {
            Log::warning('CentralGatewayWebhook: Missing references in payload');
            return response()->json(['status' => 'ignored', 'message' => 'No reference provided'], 200);
        }

        try {
            DB::beginTransaction();

            $payment = CertificatePayment::where(function ($query) use ($externalReference, $centralReference) {
                if ($externalReference) {
                    $query->where('paystack_reference', $externalReference);
                }
                if ($centralReference) {
                    $query->orWhere('central_reference', $centralReference);
                }
            })->lockForUpdate()->first();

            if (!$payment) {
                DB::rollBack();
                Log::warning('CentralGatewayWebhook: Payment record not found', [
                    'external_reference' => $externalReference,
                    'central_reference' => $centralReference,
                ]);
                return response()->json(['status' => 'ignored', 'message' => 'Payment record not found'], 200);
            }

            // Store central reference if not already set
            if ($centralReference && empty($payment->central_reference)) {
                $payment->central_reference = $centralReference;
            }

            // Idempotency: If already successful, do not process again
            if ($payment->status === 'successful') {
                DB::commit();
                Log::info('CentralGatewayWebhook: Payment already marked successful', [
                    'payment_id' => $payment->id,
                ]);
                return response()->json(['status' => 'success', 'message' => 'Already processed'], 200);
            }

            $successStatuses = ['successful', 'success', 'completed', 'paid'];
            $failureStatuses = ['failed', 'cancelled', 'canceled', 'abandoned'];

            if (in_array($statusRaw, $successStatuses, true)) {
                $payment->status = 'successful';
                $payment->paid_at = now();
                $payment->paystack_response = array_merge($payment->paystack_response ?? [], [
                    'webhook_payload' => $payload,
                    'webhook_processed_at' => now()->toIso8601String(),
                ]);
                $payment->save();

                // Increment coupon usage if used and not yet counted
                if ($payment->coupon_id) {
                    $coupon = Coupon::lockForUpdate()->find($payment->coupon_id);
                    if ($coupon) {
                        $coupon->increment('times_used');
                    }
                }

                DB::commit();
                Log::info('CentralGatewayWebhook: Payment successfully marked as successful', [
                    'payment_id' => $payment->id,
                    'external_reference' => $payment->paystack_reference,
                ]);

                return response()->json(['status' => 'success', 'message' => 'Payment recorded successfully'], 200);
            } elseif (in_array($statusRaw, $failureStatuses, true)) {
                $payment->status = 'failed';
                $payment->paystack_response = array_merge($payment->paystack_response ?? [], [
                    'webhook_payload' => $payload,
                    'webhook_processed_at' => now()->toIso8601String(),
                ]);
                $payment->save();

                DB::commit();
                Log::info('CentralGatewayWebhook: Payment marked as failed', [
                    'payment_id' => $payment->id,
                    'external_reference' => $payment->paystack_reference,
                ]);

                return response()->json(['status' => 'success', 'message' => 'Payment marked failed'], 200);
            } else {
                DB::commit();
                Log::info('CentralGatewayWebhook: Ignored status', ['status' => $statusRaw]);
                return response()->json(['status' => 'ignored', 'message' => 'Unhandled status: ' . $statusRaw], 200);
            }
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('CentralGatewayWebhook: Exception during webhook processing', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['status' => 'error', 'message' => 'Server error'], 500);
        }
    }
}
