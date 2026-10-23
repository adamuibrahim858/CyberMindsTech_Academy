<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CourseResource;
use App\Models\Course;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class CourseController extends Controller
{
    /**
     * Display a listing of courses with search, filtering, and pagination.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Course::withCount('enrolments');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->has('is_active')) {
            $isActive = filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN);
            $query->where('is_active', $isActive);
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        $courses = $query->latest('id')->paginate($perPage);

        return CourseResource::collection($courses);
    }

    /**
     * Create a new course.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50', 'unique:courses,code'],
            'description' => ['nullable', 'string'],
            'duration' => ['nullable', 'string', 'max:50'],
            'certificate_price' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $course = Course::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Course created successfully.',
            'data' => new CourseResource($course),
        ], Response::HTTP_CREATED);
    }

    /**
     * Display course details.
     */
    public function show(int $id): JsonResponse
    {
        $course = Course::withCount('enrolments')->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => new CourseResource($course),
        ]);
    }

    /**
     * Update course details.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $course = Course::findOrFail($id);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50', Rule::unique('courses', 'code')->ignore($course->id)],
            'description' => ['nullable', 'string'],
            'duration' => ['nullable', 'string', 'max:50'],
            'certificate_price' => ['nullable', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $course->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Course updated successfully.',
            'data' => new CourseResource($course->loadCount('enrolments')),
        ]);
    }

    /**
     * Delete course if no enrolments exist; otherwise safeguard against deletion.
     */
    public function destroy(int $id): JsonResponse
    {
        $course = Course::findOrFail($id);

        if ($course->enrolments()->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Cannot delete course that has existing enrolments. You can deactivate it instead.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $course->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Course deleted successfully.',
        ]);
    }
}
