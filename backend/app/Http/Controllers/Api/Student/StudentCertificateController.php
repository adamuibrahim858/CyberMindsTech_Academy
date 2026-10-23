<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\CertificateResource;
use App\Models\Certificate;
use App\Services\CertificatePdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Symfony\Component\HttpFoundation\Response;

class StudentCertificateController extends Controller
{
    public function __construct(
        protected CertificatePdfService $pdfService
    ) {}

    /**
     * List certificates earned by the authenticated student.
     */
    public function index(Request $request): JsonResponse
    {
        $student = $request->user()->student;

        if (! $student) {
            return response()->json([
                'status' => 'error',
                'message' => 'Student record not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        $certificates = $student->certificates()
            ->with(['enrolment.course', 'payments', 'latestSuccessfulPayment'])
            ->latest('certificates.id')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => CertificateResource::collection($certificates),
        ]);
    }

    /**
     * Download valid certificate PDF belonging to the authenticated student.
     */
    public function download(Request $request, int $id): HttpResponse|JsonResponse
    {
        $student = $request->user()->student;

        if (! $student) {
            return response()->json([
                'status' => 'error',
                'message' => 'Student record not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        $certificate = Certificate::with(['enrolment.student.user', 'enrolment.course', 'payments'])->findOrFail($id);

        // Security: verify student ownership
        if ($certificate->enrolment->student_id !== $student->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Forbidden. You do not have permission to access this certificate.',
            ], Response::HTTP_FORBIDDEN);
        }

        // Security: ensure course completion
        if (! $certificate->enrolment->isCompleted()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Certificate cannot be downloaded for an incomplete course.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Security: prevent downloading revoked certificates as valid
        if ($certificate->isRevoked()) {
            return response()->json([
                'status' => 'error',
                'message' => 'This certificate has been revoked and cannot be downloaded as a valid certificate.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Security: require certificate payment if not free and not already paid
        if ($certificate->requiresPayment()) {
            $price = (float) ($certificate->enrolment->course->certificate_price ?? 0);
            return response()->json([
                'status' => 'error',
                'message' => 'Payment required to download this certificate. Please complete payment of certificate fee.',
                'payment_required' => true,
                'certificate_id' => $certificate->id,
                'certificate_price' => $price,
            ], Response::HTTP_PAYMENT_REQUIRED);
        }

        return $this->pdfService->download($certificate);
    }
}
