<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class StudentDashboardController extends Controller
{
    /**
     * Return student dashboard statistics.
     */
    public function stats(Request $request): JsonResponse
    {
        $student = $request->user()->student;

        if (! $student) {
            return response()->json([
                'status' => 'error',
                'message' => 'Student record not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        $enrolments = $student->enrolments();

        return response()->json([
            'status' => 'success',
            'data' => [
                'total_enrolled_courses' => (clone $enrolments)->count(),
                'courses_in_progress' => (clone $enrolments)->where('status', 'in_progress')->count(),
                'completed_courses' => (clone $enrolments)->where('status', 'completed')->count(),
                'available_certificates' => $student->certificates()->where('certificates.status', 'valid')->count(),
            ],
        ]);
    }
}
