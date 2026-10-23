<?php

namespace App\Services;

use App\Models\Certificate;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class CertificatePdfService
{
    /**
     * Generate the PDF instance for a given certificate.
     */
    public function makePdf(Certificate $certificate): \Barryvdh\DomPDF\PDF
    {
        $certificate->loadMissing(['enrolment.student.user', 'enrolment.course']);

        $verificationUrl = config('academy.verification_base_url') . '/' . urlencode($certificate->certificate_number);

        $qrCodeSvg = QrCode::format('svg')
            ->size(100)
            ->margin(0)
            ->errorCorrection('H')
            ->generate($verificationUrl);

        $qrCodeBase64 = base64_encode($qrCodeSvg);

        $templatePath = public_path('images/certificate_template.png');
        if (!file_exists($templatePath)) {
            $templatePath = base_path('../frontend/src/assets/certificate_template.png');
        }
        $bgTemplateBase64 = file_exists($templatePath) ? base64_encode(file_get_contents($templatePath)) : '';

        $ceoPath = public_path('images/ceo_transparent.png');
        if (!file_exists($ceoPath)) {
            $ceoPath = base_path('../frontend/src/assets/ceo_transparent.png');
        }
        if (!file_exists($ceoPath)) {
            $ceoPath = base_path('../frontend/src/assets/ceo.png');
        }
        $ceoSignatureBase64 = file_exists($ceoPath) ? base64_encode(file_get_contents($ceoPath)) : '';

        $chairmanPath = public_path('images/chairman_transparent.png');
        if (!file_exists($chairmanPath)) {
            $chairmanPath = base_path('../frontend/src/assets/chairman_transparent.png');
        }
        if (!file_exists($chairmanPath)) {
            $chairmanPath = base_path('../frontend/src/assets/chairman.png');
        }
        $chairmanSignatureBase64 = file_exists($chairmanPath) ? base64_encode(file_get_contents($chairmanPath)) : '';

        return Pdf::loadView('certificates.pdf', [
            'certificate' => $certificate,
            'student' => $certificate->enrolment->student,
            'user' => $certificate->enrolment->student->user,
            'course' => $certificate->enrolment->course,
            'enrolment' => $certificate->enrolment,
            'company' => config('academy'),
            'qrCodeBase64' => $qrCodeBase64,
            'verificationUrl' => $verificationUrl,
            'bgTemplateBase64' => $bgTemplateBase64,
            'ceoSignatureBase64' => $ceoSignatureBase64,
            'chairmanSignatureBase64' => $chairmanSignatureBase64,
        ])->setPaper('a4', 'landscape');
    }

    /**
     * Stream or download the PDF file.
     */
    public function download(Certificate $certificate): Response
    {
        $safeNumber = str_replace(['/', '\\'], '-', $certificate->certificate_number);
        $fileName = "Certificate-{$safeNumber}.pdf";

        return $this->makePdf($certificate)->download($fileName);
    }

    /**
     * View/stream the PDF in browser.
     */
    public function stream(Certificate $certificate): Response
    {
        $safeNumber = str_replace(['/', '\\'], '-', $certificate->certificate_number);
        $fileName = "Certificate-{$safeNumber}.pdf";

        return $this->makePdf($certificate)->stream($fileName);
    }
}
