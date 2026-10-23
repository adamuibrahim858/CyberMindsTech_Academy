<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CertificateResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'enrolment_id' => $this->enrolment_id,
            'certificate_number' => $this->certificate_number,
            'verification_code' => $this->verification_code,
            'issued_at' => $this->issued_at?->toISOString(),
            'status' => $this->status,
            'is_valid' => $this->status === 'valid',
            'revoked_at' => $this->revoked_at?->toISOString(),
            'revocation_reason' => $this->revocation_reason,
            'revoker' => new UserResource($this->whenLoaded('revoker')),
            'enrolment' => new EnrolmentResource($this->whenLoaded('enrolment')),
            'certificate_price' => (float) ($this->enrolment?->course?->certificate_price ?? 0),
            'is_paid' => $this->isPaid(),
            'requires_payment' => $this->requiresPayment(),
            'latest_payment' => new CertificatePaymentResource($this->whenLoaded('latestSuccessfulPayment')),
            'download_url' => url("/api/v1/certificates/{$this->id}/download"),
            'verification_url' => config('academy.verification_base_url') . '/' . urlencode($this->certificate_number),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
