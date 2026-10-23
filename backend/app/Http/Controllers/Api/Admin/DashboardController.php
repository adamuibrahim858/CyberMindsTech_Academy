<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use App\Models\Course;
use App\Models\Enrolment;
use App\Models\Student;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    /**
     * Return admin dashboard statistics.
     */
    public function stats(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => [
                'total_students' => Student::count(),
                'total_courses' => Course::count(),
                'active_enrolments' => Enrolment::where('status', 'in_progress')->count(),
                'completed_enrolments' => Enrolment::where('status', 'completed')->count(),
                'certificates_issued' => Certificate::count(),
                'revoked_certificates' => Certificate::where('status', 'revoked')->count(),
            ],
        ]);
    }
}
