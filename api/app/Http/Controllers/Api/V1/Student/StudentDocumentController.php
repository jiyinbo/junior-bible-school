<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\JbsStudentRegistration;
use App\Services\JbsDocumentDataService;
use App\Services\JbsIdCardPdfService;
use App\Services\JbsQrService;
use App\Services\JbsStudentPortalPinService;
use App\Services\JbsStudentProgressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class StudentDocumentController extends Controller
{
    public function __construct(
        private JbsStudentProgressService $progress,
        private JbsQrService $qr,
        private JbsIdCardPdfService $idCardPdf,
        private JbsStudentPortalPinService $portalPin,
        private JbsDocumentDataService $documents,
    ) {}

    private function registration(Request $request): JbsStudentRegistration
    {
        return $this->portalPin->resolveRegistration($request, ['session', 'level.modules']);
    }

    public function idCard(Request $request): Response
    {
        $reg = $this->registration($request);
        $qr = $this->qr->registrationNumberToDataUri($reg->registration_number);

        $pdf = $this->idCardPdf->make($reg, $qr);

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="jbs-id-card-'.$reg->registration_number.'.pdf"',
        ]);
    }

    /**
     * Data used to render the statement of result and certificate in the browser.
     * Only available once the student's tier has been marked completed.
     */
    public function data(Request $request): JsonResponse
    {
        $reg = $this->registration($request);
        $this->progress->assertDocumentsAllowed($reg);

        return response()->json(['data' => $this->documents->forRegistration($reg)]);
    }
}
