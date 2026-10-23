<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Central CyberMinds Payment Gateway Service
 *
 * This app does NOT call Paystack directly. All payment operations are
 * routed through the Central Gateway at workspace.cybermindstech.com.ng.
 * The gateway owns the Paystack credentials and acts as the sole intermediary.
 */
class CentralGatewayService
{
    protected string $baseUrl;
    protected ?string $apiKey;
    protected string $frontendUrl;

    public function __construct()
    {
        $this->baseUrl     = rtrim(config('services.central_gateway.url', ''), '/');
        $this->apiKey      = config('services.central_gateway.api_secret_key');
        $this->frontendUrl = rtrim(config('services.central_gateway.frontend_url', ''), '/');
    }

    public function isConfigured(): bool
    {
        return ! empty($this->baseUrl) && ! empty($this->apiKey);
    }

    public function getFrontendUrl(): string
    {
        return $this->frontendUrl;
    }

    /**
     * Build the three auth headers the gateway accepts simultaneously.
     * (Sent as all three for compatibility with different gateway versions.)
     */
    protected function headers(): array
    {
        return [
            'X-CyberMinds-API-Key' => $this->apiKey,
            'X-API-Key'            => $this->apiKey,
            'X-CyberMinds-Key'     => $this->apiKey,
            'Accept'               => 'application/json',
            'Content-Type'         => 'application/json',
        ];
    }

    /**
     * Initialize a payment via the Central Gateway.
     *
     * @param array $payload {
     *   amount: float (Naira, NOT kobo),
     *   currency: string,
     *   email: string,
     *   type: string,
     *   external_reference: string,
     *   callback_url: string,
     *   source_portal: string,
     *   description: string,
     *   metadata: array
     * }
     * @return array { authorization_url, reference (CM-PAY-...), access_code }
     * @throws Exception
     */
    public function initializePayment(array $payload): array
    {
        if (! $this->isConfigured()) {
            throw new Exception('Central Payment Gateway is not configured. Set CENTRAL_PAYMENT_GATEWAY_URL and CENTRAL_PAYMENT_GATEWAY_API_SECRET_KEY in .env.');
        }

        try {
            $response = Http::withHeaders($this->headers())
                ->timeout(25)
                ->post("{$this->baseUrl}/api/payment/initialize", $payload);

            $data = $response->json();

            if (! $response->successful() || ! ($data['success'] ?? false)) {
                $errorMsg = $data['message'] ?? 'Failed to initialize payment via Central Gateway.';
                Log::warning('CentralGateway: payment initialization failed', [
                    'http_status' => $response->status(),
                    'response'    => $data,
                ]);
                throw new Exception($errorMsg);
            }

            return $data['data'];
        } catch (Exception $e) {
            Log::error('CentralGateway: initializePayment exception — ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Query the Central Gateway for a payment's current status.
     * Used by both the browser-callback fallback and the verifyPayment endpoint.
     *
     * @param string      $externalReference  Our local CM_ reference
     * @param string|null $centralReference   Gateway's CM-PAY-... reference (if available)
     * @return array { status, amount, currency, reference, external_reference, ... }
     * @throws Exception
     */
    public function getPaymentStatus(string $externalReference, ?string $centralReference = null): array
    {
        if (! $this->isConfigured()) {
            throw new Exception('Central Payment Gateway is not configured.');
        }

        try {
            $payload = ['external_reference' => $externalReference];
            if ($centralReference) {
                $payload['reference'] = $centralReference;
            }

            $response = Http::withHeaders($this->headers())
                ->timeout(20)
                ->post("{$this->baseUrl}/api/payment/status", $payload);

            $data = $response->json();

            if (! $response->successful() || ! ($data['success'] ?? false)) {
                $errorMsg = $data['message'] ?? 'Failed to retrieve payment status from Central Gateway.';
                Log::warning('CentralGateway: status check failed', [
                    'external_reference' => $externalReference,
                    'central_reference'  => $centralReference,
                    'http_status'        => $response->status(),
                    'response'           => $data,
                ]);
                throw new Exception($errorMsg);
            }

            return $data['data'];
        } catch (Exception $e) {
            Log::error('CentralGateway: getPaymentStatus exception — ' . $e->getMessage(), [
                'external_reference' => $externalReference,
            ]);
            throw $e;
        }
    }
}
