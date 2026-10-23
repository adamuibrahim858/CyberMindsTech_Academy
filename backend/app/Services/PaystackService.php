<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaystackService
{
    protected ?string $secretKey;
    protected ?string $publicKey;
    protected string $baseUrl;

    public function __construct()
    {
        $this->secretKey = config('services.paystack.secret_key');
        $this->publicKey = config('services.paystack.public_key');
        $this->baseUrl = rtrim(config('services.paystack.payment_url', 'https://api.paystack.co'), '/');
    }

    public function getPublicKey(): ?string
    {
        return $this->publicKey;
    }

    public function isConfigured(): bool
    {
        return ! empty($this->secretKey);
    }

    /**
     * Initialize transaction with Paystack.
     *
     * @param array{
     *   email: string,
     *   amount: int, // in kobo
     *   reference: string,
     *   callback_url?: string,
     *   metadata?: array
     * } $payload
     * @return array
     * @throws Exception
     */
    public function initializeTransaction(array $payload): array
    {
        if (! $this->isConfigured()) {
            throw new Exception('Paystack is not configured. Missing secret key.');
        }

        try {
            $response = Http::withToken($this->secretKey)
                ->acceptJson()
                ->timeout(20)
                ->post("{$this->baseUrl}/transaction/initialize", $payload);

            $data = $response->json();

            if (! $response->successful() || ! ($data['status'] ?? false)) {
                $errorMsg = $data['message'] ?? 'Failed to initialize Paystack transaction.';
                Log::warning('Paystack transaction initialization failed', [
                    'payload' => $payload,
                    'response' => $data,
                    'status' => $response->status(),
                ]);
                throw new Exception($errorMsg);
            }

            return $data['data'];
        } catch (Exception $e) {
            Log::error('Paystack initialization exception: ' . $e->getMessage(), [
                'payload' => $payload,
            ]);
            throw $e;
        }
    }

    /**
     * Verify a transaction with Paystack.
     *
     * @param string $reference
     * @return array
     * @throws Exception
     */
    public function verifyTransaction(string $reference): array
    {
        if (! $this->isConfigured()) {
            throw new Exception('Paystack is not configured. Missing secret key.');
        }

        try {
            $response = Http::withToken($this->secretKey)
                ->acceptJson()
                ->timeout(20)
                ->get("{$this->baseUrl}/transaction/verify/" . rawurlencode($reference));

            $data = $response->json();

            if (! $response->successful() || ! ($data['status'] ?? false)) {
                $errorMsg = $data['message'] ?? 'Transaction verification failed.';
                Log::warning('Paystack transaction verification failed', [
                    'reference' => $reference,
                    'response' => $data,
                    'status' => $response->status(),
                ]);
                throw new Exception($errorMsg);
            }

            return $data['data'];
        } catch (Exception $e) {
            Log::error('Paystack verification exception: ' . $e->getMessage(), [
                'reference' => $reference,
            ]);
            throw $e;
        }
    }
}
