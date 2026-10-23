<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentResource extends JsonResource
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
            'user_id' => $this->user_id,
            'student_id' => $this->student_id,
            'name' => $this->user?->name,
            'email' => $this->user?->email,
            'phone_number' => $this->phone_number,
            'address' => $this->address,
            'is_active' => (bool) $this->is_active,
            'user' => new UserResource($this->whenLoaded('user')),
            'enrolments' => EnrolmentResource::collection($this->whenLoaded('enrolments')),
            'enrolments_count' => $this->whenCounted('enrolments'),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
