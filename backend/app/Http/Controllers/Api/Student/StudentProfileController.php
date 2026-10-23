<?php

namespace App\Http\Controllers\Api\Student;

use App\Http\Controllers\Controller;
use App\Http\Resources\StudentResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class StudentProfileController extends Controller
{
    /**
     * View authenticated student profile.
     */
    public function show(Request $request): JsonResponse
    {
        $student = $request->user()->student?->loadMissing(['user', 'enrolments.course']);

        if (! $student) {
            return response()->json([
                'status' => 'error',
                'message' => 'Student record not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        return response()->json([
            'status' => 'success',
            'data' => new StudentResource($student),
        ]);
    }

    /**
     * Update permitted student profile information.
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $student = $user->student;

        if (! $student) {
            return response()->json([
                'status' => 'error',
                'message' => 'Student record not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone_number' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:500'],
            'current_password' => ['nullable', 'required_with:password', 'string'],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ]);

        if (! empty($validated['password'])) {
            if (! Hash::check($validated['current_password'], $user->password)) {
                throw ValidationException::withMessages([
                    'current_password' => ['The current password provided is incorrect.'],
                ]);
            }
        }

        DB::transaction(function () use ($user, $student, $validated) {
            if (isset($validated['name'])) {
                $user->name = $validated['name'];
            }
            if (! empty($validated['password'])) {
                $user->password = Hash::make($validated['password']);
            }
            $user->save();

            $studentUpdates = [];
            if (array_key_exists('phone_number', $validated)) {
                $studentUpdates['phone_number'] = $validated['phone_number'];
            }
            if (array_key_exists('address', $validated)) {
                $studentUpdates['address'] = $validated['address'];
            }

            if (! empty($studentUpdates)) {
                $student->update($studentUpdates);
            }
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Profile updated successfully.',
            'data' => new StudentResource($student->fresh(['user', 'enrolments.course'])),
        ]);
    }
}
