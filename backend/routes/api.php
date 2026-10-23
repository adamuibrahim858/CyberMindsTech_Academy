<?php

use App\Http\Controllers\Api\Admin\CertificateController as AdminCertificateController;
use App\Http\Controllers\Api\Admin\CouponController as AdminCouponController;
use App\Http\Controllers\Api\Admin\CourseController as AdminCourseController;
use App\Http\Controllers\Api\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\Admin\EnrolmentController as AdminEnrolmentController;
use App\Http\Controllers\Api\Admin\StudentController as AdminStudentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Public\CentralGatewayWebhookController;
use App\Http\Controllers\Api\Public\PaystackWebhookController;
use App\Http\Controllers\Api\Public\VerificationController;
use App\Http\Controllers\Api\Student\StudentCertificateController;
use App\Http\Controllers\Api\Student\StudentCertificatePaymentController;
use App\Http\Controllers\Api\Student\StudentCourseController;
use App\Http\Controllers\Api\Student\StudentDashboardController;
use App\Http\Controllers\Api\Student\StudentProfileController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - Version 1 (/api/v1)
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // -------------------------------------------------------------
    // Public Endpoints
    // -------------------------------------------------------------
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);

    // Public Paystack Webhook
    Route::post('/paystack/webhook', [PaystackWebhookController::class, 'handle']);

    // Public Central CyberMinds Gateway Webhook
    Route::post('/payment/central-webhook', [CentralGatewayWebhookController::class, 'handle']);

    // Public certificate verification — query param (avoids Axios double-encoding slashes)
    Route::get('/verify', [VerificationController::class, 'verify']);
    // Legacy path-param route kept for backward compatibility (e.g. QR code URLs)
    Route::get('/verify/{certificateNumber}', [VerificationController::class, 'verify'])
        ->where('certificateNumber', '.*');

    // -------------------------------------------------------------
    // Authenticated Endpoints (Sanctum)
    // -------------------------------------------------------------
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);

        // ---------------------------------------------------------
        // Admin Protected Routes
        // ---------------------------------------------------------
        Route::prefix('admin')->middleware('role:admin')->group(function () {
            // Dashboard
            Route::get('/dashboard', [AdminDashboardController::class, 'stats']);

            // Student Management
            Route::get('/students', [AdminStudentController::class, 'index']);
            Route::post('/students', [AdminStudentController::class, 'store']);
            Route::get('/students/{id}', [AdminStudentController::class, 'show']);
            Route::put('/students/{id}', [AdminStudentController::class, 'update']);
            Route::post('/students/{id}/reset-password', [AdminStudentController::class, 'resetPassword']);

            // Course Management
            Route::get('/courses', [AdminCourseController::class, 'index']);
            Route::post('/courses', [AdminCourseController::class, 'store']);
            Route::get('/courses/{id}', [AdminCourseController::class, 'show']);
            Route::put('/courses/{id}', [AdminCourseController::class, 'update']);
            Route::delete('/courses/{id}', [AdminCourseController::class, 'destroy']);

            // Coupon Management
            Route::get('/coupons', [AdminCouponController::class, 'index']);
            Route::post('/coupons', [AdminCouponController::class, 'store']);
            Route::get('/coupons/{id}', [AdminCouponController::class, 'show']);
            Route::put('/coupons/{id}', [AdminCouponController::class, 'update']);
            Route::delete('/coupons/{id}', [AdminCouponController::class, 'destroy']);

            // Enrolment Management
            Route::get('/enrolments', [AdminEnrolmentController::class, 'index']);
            Route::post('/enrolments', [AdminEnrolmentController::class, 'store']);
            Route::get('/enrolments/{id}', [AdminEnrolmentController::class, 'show']);
            Route::patch('/enrolments/{id}/status', [AdminEnrolmentController::class, 'updateStatus']);

            // Certificate Management
            Route::get('/certificates', [AdminCertificateController::class, 'index']);
            Route::get('/certificates/{id}', [AdminCertificateController::class, 'show']);
            Route::get('/certificates/{id}/download', [AdminCertificateController::class, 'download']);
            Route::post('/certificates/{id}/revoke', [AdminCertificateController::class, 'revoke']);
        });

        // ---------------------------------------------------------
        // Student Protected Routes
        // ---------------------------------------------------------
        Route::prefix('student')->middleware('role:student')->group(function () {
            // Dashboard
            Route::get('/dashboard', [StudentDashboardController::class, 'stats']);

            // Profile
            Route::get('/profile', [StudentProfileController::class, 'show']);
            Route::put('/profile', [StudentProfileController::class, 'update']);

            // Enrolled Courses
            Route::get('/courses', [StudentCourseController::class, 'index']);

            // Certificates
            Route::get('/certificates', [StudentCertificateController::class, 'index']);
            Route::get('/certificates/{id}/download', [StudentCertificateController::class, 'download']);

            // Certificate Payments & Coupons
            Route::get('/certificates/{id}/payment-status', [StudentCertificatePaymentController::class, 'status']);
            Route::post('/certificates/{id}/apply-coupon', [StudentCertificatePaymentController::class, 'applyCoupon']);
            Route::post('/certificates/{id}/claim-free', [StudentCertificatePaymentController::class, 'claimFree']);
            Route::post('/certificates/{id}/initialize-payment', [StudentCertificatePaymentController::class, 'initializePayment']);
            Route::post('/certificates/{id}/verify-payment', [StudentCertificatePaymentController::class, 'verifyPayment']);
            Route::post('/payment/check-callback', [StudentCertificatePaymentController::class, 'handleCallback']);
        });
    });
});
