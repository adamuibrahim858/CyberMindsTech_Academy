<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CertificatePaymentResource extends JsonResource
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
            'student_id' => $this->student_id,
            'certificate_id' => $this->certificate_id,
            'enrolment_id' => $this->enrolment_id,
            'amount' => (float) $this->amount,
            'discount_amount' => (float) $this->discount_amount,
            'final_amount' => (float) $this->final_amount,
            'currency' => $this->currency,
            'paystack_reference' => $this->paystack_reference,
            'status' => $this->status,
            'paid_at' => $this->paid_at?->toISOString(),
            'channel' => $this->channel,
            'coupon' => new CouponResource($this->whenLoaded('coupon')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
