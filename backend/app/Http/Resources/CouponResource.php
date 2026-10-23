<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CouponResource extends JsonResource
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
            'code' => $this->code,
            'discount_percentage' => (int) $this->discount_percentage,
            'max_uses' => $this->max_uses !== null ? (int) $this->max_uses : null,
            'uses_count' => (int) $this->uses_count,
            'course_id' => $this->course_id,
            'course' => new CourseResource($this->whenLoaded('course')),
            'is_active' => (bool) $this->is_active,
            'expires_at' => $this->expires_at?->toISOString(),
            'is_expired' => $this->isExpired(),
            'is_exhausted' => $this->isExhausted(),
            'creator' => new UserResource($this->whenLoaded('creator')),
            'payments_count' => $this->whenCounted('payments'),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
