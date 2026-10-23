<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\StudentResource;
use App\Models\Student;
use App\Models\User;
use App\Services\SequentialNumberService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class StudentController extends Controller
{
    /**
     * Display a listing of students with search, filters, and pagination.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Student::with(['user'])->withCount('enrolments');

        // Search by name, email, student ID, or phone number
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('student_id', 'like', "%{$search}%")
                    ->orWhere('phone_number', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        // Filter by active status
        if ($request->has('is_active')) {
            $isActive = filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN);
            $query->where('is_active', $isActive);
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        $students = $query->latest('id')->paginate($perPage);

        return StudentResource::collection($students);
    }

    /**
     * Create a new student account.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'phone_number' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:500'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $student = DB::transaction(function () use ($validated) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role' => 'student',
                'is_active' => $validated['is_active'] ?? true,
            ]);

            $studentId = SequentialNumberService::generateStudentId();

            return Student::create([
                'user_id' => $user->id,
                'student_id' => $studentId,
                'phone_number' => $validated['phone_number'] ?? null,
                'address' => $validated['address'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
            ]);
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Student created successfully.',
            'data' => new StudentResource($student->load('user')),
        ], Response::HTTP_CREATED);
    }

    /**
     * Display student details.
     */
    public function show(int $id): JsonResponse
    {
        $student = Student::with([
            'user',
            'enrolments.course',
            'enrolments.certificate',
        ])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => new StudentResource($student),
        ]);
    }

    /**
     * Update student details and active status.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $student = Student::with('user')->findOrFail($id);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($student->user_id)],
            'phone_number' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:500'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        DB::transaction(function () use ($student, $validated) {
            $userUpdates = [];
            if (isset($validated['name'])) {
                $userUpdates['name'] = $validated['name'];
            }
            if (isset($validated['email'])) {
                $userUpdates['email'] = $validated['email'];
            }
            if (isset($validated['is_active'])) {
                $userUpdates['is_active'] = $validated['is_active'];
            }

            if (! empty($userUpdates)) {
                $student->user->update($userUpdates);
            }

            $studentUpdates = [];
            if (array_key_exists('phone_number', $validated)) {
                $studentUpdates['phone_number'] = $validated['phone_number'];
            }
            if (array_key_exists('address', $validated)) {
                $studentUpdates['address'] = $validated['address'];
            }
            if (isset($validated['is_active'])) {
                $studentUpdates['is_active'] = $validated['is_active'];
            }

            if (! empty($studentUpdates)) {
                $student->update($studentUpdates);
            }
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Student updated successfully.',
            'data' => new StudentResource($student->fresh(['user', 'enrolments'])),
        ]);
    }

    /**
     * Admin reset password for a student.
     */
    public function resetPassword(Request $request, int $id): JsonResponse
    {
        $student = Student::with('user')->findOrFail($id);

        $validated = $request->validate([
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $student->user->update([
            'password' => Hash::make($validated['password']),
        ]);

        // Revoke student's existing sessions/tokens
        $student->user->tokens()->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Student password reset successfully. All active sessions have been terminated.',
        ]);
    }
}
