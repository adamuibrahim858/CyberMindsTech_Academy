<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class AuthController extends Controller
{
    /**
     * Authenticate user and issue Sanctum token.
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        if (! $user->is_active) {
            return response()->json([
                'status' => 'error',
                'message' => 'Your account has been deactivated. Please contact support.',
            ], Response::HTTP_FORBIDDEN);
        }

        if ($user->isStudent() && $user->student && ! $user->student->is_active) {
            return response()->json([
                'status' => 'error',
                'message' => 'Your student profile has been deactivated.',
            ], Response::HTTP_FORBIDDEN);
        }

        $token = $user->createToken('react-frontend')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'message' => 'Login successful',
            'token' => $token,
            'user' => new UserResource($user->loadMissing('student')),
        ]);
    }

    /**
     * Terminate current access token.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Retrieve authenticated user details.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('student');

        return response()->json([
            'status' => 'success',
            'user' => new UserResource($user),
            'student' => $user->student ? [
                'id' => $user->student->id,
                'student_id' => $user->student->student_id,
                'phone_number' => $user->student->phone_number,
                'address' => $user->student->address,
                'is_active' => (bool) $user->student->is_active,
            ] : null,
        ]);
    }

    /**
     * Request password reset token.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
        ]);

        $token = Str::random(60);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $validated['email']],
            [
                'token' => Hash::make($token),
                'created_at' => now(),
            ]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Password reset token generated successfully.',
            'reset_token' => $token,
        ]);
    }

    /**
     * Reset user password using token.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $validated['email'])
            ->first();

        if (! $record || ! Hash::check($validated['token'], $record->token)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid or expired password reset token.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Token expires after 60 minutes
        if (now()->subMinutes(60)->isAfter($record->created_at)) {
            DB::table('password_reset_tokens')->where('email', $validated['email'])->delete();

            return response()->json([
                'status' => 'error',
                'message' => 'Password reset token has expired.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $user = User::where('email', $validated['email'])->firstOrFail();
        $user->forceFill([
            'password' => Hash::make($validated['password']),
        ])->save();

        // Revoke all tokens for safety
        $user->tokens()->delete();

        DB::table('password_reset_tokens')->where('email', $validated['email'])->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Password has been successfully reset. Please log in with your new credentials.',
        ]);
    }
}
