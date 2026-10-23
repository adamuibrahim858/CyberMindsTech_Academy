<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CertificateResource;
use App\Models\Certificate;
use App\Services\CertificatePdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response as HttpResponse;
use Symfony\Component\HttpFoundation\Response;

class CertificateController extends Controller
{
    public function __construct(
        protected CertificatePdfService $pdfService
    ) {}

    /**
     * Display a listing of certificates.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Certificate::with([
            'enrolment.student.user',
            'enrolment.course',
            'revoker',
        ]);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('certificate_number', 'like', "%{$search}%")
                    ->orWhere('verification_code', 'like', "%{$search}%")
                    ->orWhereHas('enrolment.student.user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('enrolment.course', function ($cq) use ($search) {
                        $cq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        $certificates = $query->latest('id')->paginate($perPage);

        return CertificateResource::collection($certificates);
    }

    /**
     * Display certificate details.
     */
    public function show(int $id): JsonResponse
    {
        $certificate = Certificate::with([
            'enrolment.student.user',
            'enrolment.course',
            'revoker',
        ])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => new CertificateResource($certificate),
        ]);
    }

    /**
     * Revoke a certificate with reason.
     */
    public function revoke(Request $request, int $id): JsonResponse
    {
        $certificate = Certificate::findOrFail($id);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        if ($certificate->isRevoked()) {
            return response()->json([
                'status' => 'error',
                'message' => 'This certificate has already been revoked.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $certificate->update([
            'status' => 'revoked',
            'revoked_at' => now(),
            'revocation_reason' => $validated['reason'],
            'revoked_by' => $request->user()->id,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Certificate revoked successfully.',
            'data' => new CertificateResource($certificate->fresh(['enrolment.student.user', 'enrolment.course', 'revoker'])),
        ]);
    }

    /**
     * Download certificate PDF.
     */
    public function download(int $id): HttpResponse
    {
        $certificate = Certificate::with(['enrolment.student.user', 'enrolment.course'])->findOrFail($id);

        return $this->pdfService->download($certificate);
    }
}
