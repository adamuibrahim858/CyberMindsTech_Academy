<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VerificationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $enrolment = $this->enrolment;
        $studentUser = $enrolment?->student?->user;
        $course = $enrolment?->course;

        return [
            'certificate_number' => $this->certificate_number,
            'verification_code' => $this->verification_code,
            'validity_status' => $this->status,
            'is_valid' => $this->status === 'valid',
            'student_name' => $studentUser?->name,
            'course_name' => $course?->name,
            'completion_date' => $enrolment?->completed_at?->format('Y-m-d'),
            'issue_date' => $this->issued_at?->format('Y-m-d'),
            'revoked_at' => $this->status === 'revoked' ? $this->revoked_at?->format('Y-m-d H:i:s') : null,
            'revocation_reason' => $this->status === 'revoked' ? $this->revocation_reason : null,
        ];
    }
}
