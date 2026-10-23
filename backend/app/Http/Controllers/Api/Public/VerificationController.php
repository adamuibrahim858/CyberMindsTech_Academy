<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\VerificationResource;
use App\Models\Certificate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerificationController extends Controller
{
    /**
     * Publicly verify a certificate by certificate number or verification code.
     * Accepts the identifier via:
     *   - Query param:  GET /verify?certificate_number=CMT/2026/001  (frontend)
     *   - Path param:   GET /verify/CMT%2F2026%2F001                 (legacy QR links)
     */
    public function verify(Request $request, string $certificateNumber = ''): JsonResponse
    {
        // Prefer query param (avoids Axios double-encoding); fall back to path param
        $raw = $request->query('certificate_number', $certificateNumber);
        $decoded = urldecode($raw);

        $certificate = Certificate::with([
            'enrolment.student.user',
            'enrolment.course',
        ])
            ->where('certificate_number', $decoded)
            ->orWhere('verification_code', $decoded)
            ->first();

        if (! $certificate) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Certificate not found. The provided certificate number or verification code is invalid.',
            ], Response::HTTP_NOT_FOUND);
        }

        return response()->json([
            'status' => 'success',
            'data'   => new VerificationResource($certificate),
        ]);
    }
}
