<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\EnrolmentResource;
use App\Models\Certificate;
use App\Models\Enrolment;
use App\Services\SequentialNumberService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class EnrolmentController extends Controller
{
    /**
     * Display a listing of enrolments with filtering and pagination.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Enrolment::with(['student.user', 'course', 'certificate']);

        if ($studentId = $request->input('student_id')) {
            $query->where('student_id', $studentId);
        }

        if ($courseId = $request->input('course_id')) {
            $query->where('course_id', $courseId);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('student.user', function ($uq) use ($search) {
                    $uq->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                })->orWhereHas('student', function ($sq) use ($search) {
                    $sq->where('student_id', 'like', "%{$search}%");
                })->orWhereHas('course', function ($cq) use ($search) {
                    $cq->where('name', 'like', "%{$search}%");
                });
            });
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        $enrolments = $query->latest('id')->paginate($perPage);

        return EnrolmentResource::collection($enrolments);
    }

    /**
     * Enrol a student in a course.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'student_id' => ['required', 'exists:students,id'],
            'course_id' => ['required', 'exists:courses,id'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ]);

        // Prevent duplicate active enrolments for the same student and course
        $existingActive = Enrolment::where('student_id', $validated['student_id'])
            ->where('course_id', $validated['course_id'])
            ->where('status', 'in_progress')
            ->exists();

        if ($existingActive) {
            return response()->json([
                'status' => 'error',
                'message' => 'Student already has an active in-progress enrolment for this course.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $enrolment = Enrolment::create([
            'student_id' => $validated['student_id'],
            'course_id' => $validated['course_id'],
            'status' => 'in_progress',
            'enrolled_at' => now(),
            'remarks' => $validated['remarks'] ?? null,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Student enrolled successfully.',
            'data' => new EnrolmentResource($enrolment->load(['student.user', 'course'])),
        ], Response::HTTP_CREATED);
    }

    /**
     * Display enrolment details.
     */
    public function show(int $id): JsonResponse
    {
        $enrolment = Enrolment::with(['student.user', 'course', 'certificate'])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => new EnrolmentResource($enrolment),
        ]);
    }

    /**
     * Update enrolment status. If marked as completed, issue certificate idempotently.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:in_progress,completed,cancelled'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ]);

        $enrolment = DB::transaction(function () use ($id, $validated) {
            $enrolment = Enrolment::with(['student.user', 'course', 'certificate'])
                ->lockForUpdate()
                ->findOrFail($id);

            $newStatus = $validated['status'];
            $updateData = ['status' => $newStatus];

            if (array_key_exists('remarks', $validated)) {
                $updateData['remarks'] = $validated['remarks'];
            }

            if ($newStatus === 'completed') {
                if (! $enrolment->completed_at) {
                    $updateData['completed_at'] = now();
                }

                $enrolment->update($updateData);

                // Auto-issue unique certificate if not already issued for this enrolment
                if (! $enrolment->certificate) {
                    $certificateNumber = SequentialNumberService::generateCertificateNumber();
                    $verificationCode = (string) Str::uuid();

                    Certificate::create([
                        'enrolment_id' => $enrolment->id,
                        'certificate_number' => $certificateNumber,
                        'verification_code' => $verificationCode,
                        'issued_at' => now(),
                        'status' => 'valid',
                    ]);
                }
            } else {
                $enrolment->update($updateData);
            }

            return $enrolment;
        });

        return response()->json([
            'status' => 'success',
            'message' => "Enrolment status updated to {$validated['status']}.",
            'data' => new EnrolmentResource($enrolment->fresh(['student.user', 'course', 'certificate'])),
        ]);
    }
}
