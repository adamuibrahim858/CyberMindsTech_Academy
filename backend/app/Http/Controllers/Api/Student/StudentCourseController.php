<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\EnrolmentResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class StudentCourseController extends Controller
{
    /**
     * List courses enrolled by the authenticated student.
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

        $enrolments = $student->enrolments()
            ->with(['course', 'certificate'])
            ->latest('id')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => EnrolmentResource::collection($enrolments),
        ]);
    }
}
