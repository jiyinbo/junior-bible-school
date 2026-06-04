<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\JbsLevel;
use App\Models\JbsSession;
use App\Models\JbsStudentRegistration;
use App\Services\JbsAdminMailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminMailController extends Controller
{
    public function __construct(
        private JbsAdminMailService $mail,
    ) {}

    public function options(): JsonResponse
    {
        $sessions = JbsSession::query()
            ->orderByDesc('session_starts_at')
            ->orderBy('name')
            ->get(['id', 'name', 'slug']);

        $levels = JbsLevel::query()
            ->orderBy('jbs_session_id')
            ->orderBy('name')
            ->get(['id', 'jbs_session_id', 'name']);

        return response()->json([
            'data' => [
                'audiences' => [
                    ['key' => JbsAdminMailService::AUDIENCE_PARENT_ONE, 'label' => 'One parent / guardian (by student)'],
                    ['key' => JbsAdminMailService::AUDIENCE_PARENTS_TIER, 'label' => 'All parents in a tier'],
                    ['key' => JbsAdminMailService::AUDIENCE_PARENTS_SESSION, 'label' => 'All parents in a session (all tiers)'],
                    ['key' => JbsAdminMailService::AUDIENCE_STAFF_TEACHERS, 'label' => 'All teachers'],
                    ['key' => JbsAdminMailService::AUDIENCE_STAFF_ADMINS, 'label' => 'All administrators'],
                    ['key' => JbsAdminMailService::AUDIENCE_STAFF_ASSISTANTS, 'label' => 'All assistants'],
                    ['key' => JbsAdminMailService::AUDIENCE_STAFF_ALL, 'label' => 'All staff (admins, teachers, assistants)'],
                ],
                'sessions' => $sessions,
                'levels' => $levels,
            ],
        ]);
    }

    public function registrationOptions(Request $request): JsonResponse
    {
        $data = $request->validate([
            'jbs_session_id' => ['required', 'integer', 'exists:jbs_sessions,id'],
            'jbs_level_id' => ['nullable', 'integer', 'exists:jbs_levels,id'],
        ]);

        $query = JbsStudentRegistration::query()
            ->where('jbs_session_id', $data['jbs_session_id'])
            ->orderBy('last_name')
            ->orderBy('first_name');

        if (! empty($data['jbs_level_id'])) {
            $level = JbsLevel::query()->find($data['jbs_level_id']);
            if ($level === null || $level->jbs_session_id !== (int) $data['jbs_session_id']) {
                throw ValidationException::withMessages([
                    'jbs_level_id' => ['Tier does not belong to the selected session.'],
                ]);
            }
            $query->where('jbs_level_id', $data['jbs_level_id']);
        }

        $rows = $query->with('level')->limit(500)->get();

        return response()->json([
            'data' => $rows->map(fn (JbsStudentRegistration $reg): array => [
                'id' => $reg->id,
                'registration_number' => $reg->registration_number,
                'full_name' => $reg->fullName(),
                'guardian_name' => $reg->guardian_name,
                'guardian_email' => $reg->guardian_email,
                'has_guardian_email' => filled($reg->guardian_email),
                'level_name' => $reg->level->name ?? null,
            ]),
        ]);
    }

    public function recipients(Request $request): JsonResponse
    {
        $data = $this->validateMailRequest($request, requireBody: false);

        $recipients = $this->mail->resolveRecipients($data['audience'], $data);

        return response()->json([
            'data' => [
                'count' => count($recipients),
                'recipients' => $recipients,
            ],
        ]);
    }

    public function send(Request $request): JsonResponse
    {
        $data = $this->validateMailRequest($request, requireBody: true);

        $recipients = $this->mail->resolveRecipients($data['audience'], $data);

        if ($recipients === []) {
            throw ValidationException::withMessages([
                'audience' => ['No recipients with a valid email address were found for this selection.'],
            ]);
        }

        $attachments = $this->buildAttachments($request);
        $result = $this->mail->send($data['subject'], $data['body'], $recipients, $attachments);

        $this->audit()->record(
            'mail.broadcast',
            $request,
            subjectLabel: 'Email broadcast',
            metadata: [
                'audience' => $data['audience'],
                'jbs_session_id' => $data['jbs_session_id'] ?? null,
                'jbs_level_id' => $data['jbs_level_id'] ?? null,
                'registration_id' => $data['registration_id'] ?? null,
                'recipient_count' => count($recipients),
                'sent' => $result['sent'],
                'failed' => $result['failed'],
                'subject' => $data['subject'],
                'attachment_count' => count($attachments),
                'attachment_names' => collect($request->file('attachments', []))
                    ->filter(fn ($f) => $f instanceof UploadedFile)
                    ->map(fn (UploadedFile $f): string => $f->getClientOriginalName())
                    ->values()
                    ->all(),
            ],
            status: $result['failed'] > 0 && $result['sent'] === 0 ? 'error' : 'success',
        );

        return response()->json([
            'data' => [
                'recipient_count' => count($recipients),
                'sent' => $result['sent'],
                'failed' => $result['failed'],
                'failures' => $result['failures'],
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateMailRequest(Request $request, bool $requireBody): array
    {
        $rules = [
            'audience' => ['required', 'string', Rule::in(JbsAdminMailService::audienceKeys())],
            'jbs_session_id' => ['nullable', 'integer', 'exists:jbs_sessions,id'],
            'jbs_level_id' => ['nullable', 'integer', 'exists:jbs_levels,id'],
            'registration_id' => ['nullable', 'integer', 'exists:jbs_student_registrations,id'],
        ];

        if ($requireBody) {
            $rules['subject'] = ['required', 'string', 'max:200'];
            $rules['body'] = ['required', 'string', 'max:20000'];
            $rules['confirm'] = ['accepted'];
            $rules['attachments'] = ['nullable', 'array', 'max:3'];
            $rules['attachments.*'] = [
                'file',
                'max:10240',
                'mimes:pdf,jpeg,jpg,png,gif,doc,docx,xls,xlsx',
            ];
        }

        return $request->validate($rules);
    }

    /**
     * @return list<Attachment>
     */
    private function buildAttachments(Request $request): array
    {
        $files = $request->file('attachments', []);
        if (! is_array($files)) {
            return [];
        }

        $attachments = [];
        foreach ($files as $file) {
            if (! $file instanceof UploadedFile || ! $file->isValid()) {
                continue;
            }
            $attachments[] = Attachment::fromPath($file->getRealPath())
                ->as($file->getClientOriginalName())
                ->withMime($file->getClientMimeType() ?? 'application/octet-stream');
        }

        return $attachments;
    }
}
