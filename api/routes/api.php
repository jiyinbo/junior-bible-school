<?php

use App\Http\Controllers\Api\V1\Admin\AdminMailController;
use App\Http\Controllers\Api\V1\Admin\AssignmentController;
use App\Http\Controllers\Api\V1\Admin\AuditLogAdminController;
use App\Http\Controllers\Api\V1\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\V1\Admin\LevelModuleController;
use App\Http\Controllers\Api\V1\Admin\RegistrationAdminController;
use App\Http\Controllers\Api\V1\Admin\RegistrationController;
use App\Http\Controllers\Api\V1\Admin\ScoreAdminController;
use App\Http\Controllers\Api\V1\Admin\SessionController;
use App\Http\Controllers\Api\V1\Admin\StaffUserAdminController;
use App\Http\Controllers\Api\V1\Admin\TestAdminController;
use App\Http\Controllers\Api\V1\Admin\TimetableAdminController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\PublicRegistrationController;
use App\Http\Controllers\Api\V1\PublicSessionController;
use App\Http\Controllers\Api\V1\Staff\AttendanceController;
use App\Http\Controllers\Api\V1\Staff\DashboardController as StaffDashboardController;
use App\Http\Controllers\Api\V1\Staff\MyModulesController;
use App\Http\Controllers\Api\V1\Student\StudentDocumentController;
use App\Http\Controllers\Api\V1\Student\StudentLookupController;
use App\Http\Controllers\Api\V1\Student\StudentPortalPinController;
use App\Http\Controllers\Api\V1\Student\StudentTestController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('health', fn () => response('Junior Bible School API OK', 200, ['Content-Type' => 'text/plain']));

    Route::prefix('public')->middleware('throttle:120,1')->group(function (): void {
        Route::get('sessions', [PublicSessionController::class, 'index']);
        Route::get('sessions/{slug}', [PublicSessionController::class, 'show']);
        Route::post('registrations', [PublicRegistrationController::class, 'store']);
    });

    Route::prefix('student')->middleware('throttle:60,1')->group(function (): void {
        Route::post('lookup', StudentLookupController::class);
        Route::patch('pin', [StudentPortalPinController::class, 'update']);
        Route::post('tests/{jbs_test}/questions', [StudentTestController::class, 'questions']);
        Route::post('tests/{jbs_test}/submit', [StudentTestController::class, 'submit']);
        Route::post('documents/id-card', [StudentDocumentController::class, 'idCard']);
        Route::post('documents/statement', [StudentDocumentController::class, 'statement']);
        Route::post('documents/certificate', [StudentDocumentController::class, 'certificate']);
    });

    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:12,1');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);

        Route::middleware(['role:admin,teacher,assistant'])->prefix('staff')->group(function (): void {
            Route::get('dashboard/stats', [StaffDashboardController::class, 'stats']);
            Route::get('attendance/status', [AttendanceController::class, 'status']);
            Route::get('attendance/sessions', [AttendanceController::class, 'sessionsIndex']);
            Route::post('attendance/scan', [AttendanceController::class, 'scan']);
            Route::get('my-modules', MyModulesController::class);
            Route::post('scores/manual', [ScoreAdminController::class, 'manual']);
        });

        Route::middleware(['role:admin'])->prefix('staff')->group(function (): void {
            Route::get('attendance/logs', [AttendanceController::class, 'index']);
        });

        // Admin-only management. Literal routes (e.g. registrations/export) are declared
        // here BEFORE the admin+assistant group so they take precedence over the
        // {jbs_student_registration} wildcard registered in that group.
        Route::middleware(['role:admin'])->prefix('admin')->group(function (): void {
            Route::get('dashboard/stats', [AdminDashboardController::class, 'stats']);
            Route::post('sessions', [SessionController::class, 'store']);
            Route::patch('sessions/{jbs_session}', [SessionController::class, 'update']);

            Route::get('audit-logs', [AuditLogAdminController::class, 'index']);
            Route::get('audit-logs/actions', [AuditLogAdminController::class, 'actions']);

            Route::get('mail/options', [AdminMailController::class, 'options']);
            Route::get('mail/registration-options', [AdminMailController::class, 'registrationOptions']);
            Route::post('mail/recipients', [AdminMailController::class, 'recipients']);
            Route::post('mail/send', [AdminMailController::class, 'send'])->middleware('throttle:10,1');

            Route::get('staff-users', [StaffUserAdminController::class, 'index']);
            Route::post('staff-users', [StaffUserAdminController::class, 'store']);
            Route::patch('staff-users/{user}', [StaffUserAdminController::class, 'update']);
            Route::delete('staff-users/{user}', [StaffUserAdminController::class, 'destroy']);

            Route::post('sessions/{jbs_session}/levels', [LevelModuleController::class, 'storeLevel']);
            Route::patch('levels/{jbs_level}', [LevelModuleController::class, 'updateLevel']);
            Route::post('levels/{jbs_level}/modules', [LevelModuleController::class, 'storeModule']);
            Route::patch('modules/{jbs_module}', [LevelModuleController::class, 'updateModule']);
            Route::delete('modules/{jbs_module}', [LevelModuleController::class, 'destroyModule']);

            Route::post('modules/{jbs_module}/assignment', [AssignmentController::class, 'store']);

            // Timetable builder (admin-only edits).
            Route::post('sessions/{jbs_session}/timetable/seed', [TimetableAdminController::class, 'seedPeriods']);
            Route::post('sessions/{jbs_session}/timetable/periods', [TimetableAdminController::class, 'storePeriod']);
            Route::patch('timetable/periods/{jbs_timetable_period}', [TimetableAdminController::class, 'updatePeriod']);
            Route::delete('timetable/periods/{jbs_timetable_period}', [TimetableAdminController::class, 'destroyPeriod']);
            Route::post('sessions/{jbs_session}/timetable/days', [TimetableAdminController::class, 'storeDay']);
            Route::delete('timetable/days/{jbs_timetable_day}', [TimetableAdminController::class, 'destroyDay']);
            Route::patch('levels/{jbs_level}/timetable/entry', [TimetableAdminController::class, 'setEntry']);

            Route::get('registrations/export', [RegistrationAdminController::class, 'export']);
            Route::patch('registrations/{jbs_student_registration}/completion', [RegistrationAdminController::class, 'updateCompletion']);
            Route::patch('registrations/{jbs_student_registration}/scores', [RegistrationAdminController::class, 'updateScore']);
            Route::delete('registrations/{jbs_student_registration}/scores', [RegistrationAdminController::class, 'deleteScore']);
            Route::get('registrations/{jbs_student_registration}/documents/id-card', [RegistrationAdminController::class, 'idCard']);
            Route::get('registrations/{jbs_student_registration}/documents/statement', [RegistrationAdminController::class, 'statement']);
            Route::get('registrations/{jbs_student_registration}/documents/certificate', [RegistrationAdminController::class, 'certificate']);
        });

        // Assistants share these read + registration-management endpoints with admins:
        // view sessions/timetable (read-only), register participants, and check/update
        // registration details (including moving students between tiers).
        Route::middleware(['role:admin,assistant'])->prefix('admin')->group(function (): void {
            Route::get('sessions', [SessionController::class, 'index']);
            Route::get('sessions/{jbs_session}', [SessionController::class, 'show']);

            Route::get('registrations', [RegistrationAdminController::class, 'index']);
            Route::get('registrations/{jbs_student_registration}', [RegistrationAdminController::class, 'show']);
            Route::patch('registrations/{jbs_student_registration}', [RegistrationAdminController::class, 'update']);
            Route::patch('registrations/{jbs_student_registration}/pin', [RegistrationAdminController::class, 'resetPin']);
            Route::post('registrations', [RegistrationController::class, 'store']);

            // Timetable read + export (assistants may view, not edit).
            Route::get('sessions/{jbs_session}/timetable', [TimetableAdminController::class, 'sessionGrid']);
            Route::get('levels/{jbs_level}/timetable', [TimetableAdminController::class, 'tierGrid']);
            Route::get('levels/{jbs_level}/timetable/pdf', [TimetableAdminController::class, 'exportPdf']);
        });

        Route::middleware(['role:admin,teacher,assistant'])->prefix('admin')->group(function (): void {
            Route::get('modules/{jbs_module}/tests', [TestAdminController::class, 'show']);
            Route::get('modules/{jbs_module}/tests/pdf', [TestAdminController::class, 'exportPdf']);
            Route::post('modules/{jbs_module}/tests/open', [TestAdminController::class, 'open']);
            Route::post('modules/{jbs_module}/tests/close', [TestAdminController::class, 'close']);
            Route::post('modules/{jbs_module}/tests/questions', [TestAdminController::class, 'syncQuestions']);
        });
    });
});
