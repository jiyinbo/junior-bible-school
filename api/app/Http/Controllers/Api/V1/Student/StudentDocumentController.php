<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\JbsStudentRegistration;
use App\Services\JbsIdCardPdfService;
use App\Services\JbsStudentProgressService;
use App\Services\JbsQrService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class StudentDocumentController extends Controller
{
    public function __construct(
        private JbsStudentProgressService $progress,
        private JbsQrService $qr,
        private JbsIdCardPdfService $idCardPdf,
    ) {}

    private function registration(Request $request): JbsStudentRegistration
    {
        $data = $request->validate([
            'registration_number' => ['required', 'string', 'max:191'],
        ]);
        $reg = JbsStudentRegistration::query()
            ->where('registration_number', trim($data['registration_number']))
            ->with(['session', 'level.modules'])
            ->first();
        abort_if(! $reg, 404, 'Registration not found.');

        return $reg;
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

    public function statement(Request $request): Response
    {
        $reg = $this->registration($request);
        $this->progress->assertDocumentsAllowed($reg);

        $reg->load(['session', 'level.modules', 'scoreOutcomes' => fn ($q) => $q->with('module')]);

        $pdf = Pdf::loadView('pdf.statement', [
            'registration' => $reg,
        ])->setPaper('a4', 'portrait');

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="jbs-statement.pdf"',
        ]);
    }

    public function certificate(Request $request): Response
    {
        $reg = $this->registration($request);
        $this->progress->assertDocumentsAllowed($reg);

        $reg->load(['session', 'level']);

        $pdf = Pdf::loadView('pdf.certificate', [
            'registration' => $reg,
        ])->setPaper('a4', 'landscape');

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="jbs-certificate.pdf"',
        ]);
    }
}
