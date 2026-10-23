<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Certificate of Completion - {{ $certificate->certificate_number }}</title>
    <style>
        @page {
            size: a4 landscape;
            margin: 0;
        }
        @font-face {
            font-family: 'Great Vibes';
            font-style: normal;
            font-weight: normal;
            src: url('{{ storage_path("fonts/GreatVibes-Regular.ttf") }}') format('truetype');
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: 'DejaVu Sans', Helvetica, Arial, sans-serif;
            color: #0f172a;
            width: 100%;
            height: 100%;
            position: relative;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact;
        }
        .bg-layer {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
        }
        .content-layer {
            position: relative;
            z-index: 2;
            width: 100%;
            height: 100%;
            text-align: center;
        }
        
        /* Spacer from top to position recipient name precisely below THIS IS TO CERTIFY THAT */
        .top-spacer {
            height: 312px;
        }

        .recipient-name {
            font-family: 'Great Vibes', 'DejaVu Serif', cursive, serif;
            font-size: 44px;
            color: #11254e;
            line-height: 1.1;
            letter-spacing: 0.5px;
        }

        .name-underline-bar {
            width: 440px;
            height: 2px;
            background: #0284c7;
            margin: 4px auto 10px auto;
        }

        .completion-lead {
            font-size: 11px;
            color: #334155;
            font-weight: 500;
            margin-bottom: 2px;
        }

        .course-title {
            font-size: 21px;
            font-weight: 800;
            color: #11254e;
            letter-spacing: 0.2px;
            margin-bottom: 2px;
        }

        .company-affiliation {
            font-size: 11px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 6px;
        }

        .dedication-text {
            font-size: 9.5px;
            color: #64748b;
            max-width: 560px;
            margin: 0 auto 10px auto;
            line-height: 1.35;
        }

        .cert-no-box {
            margin-bottom: 14px;
        }

        .cert-no-pill {
            display: inline-block;
            border: 1.5px solid #6366f1;
            border-radius: 12px;
            padding: 3px 20px;
            background-color: #ffffff;
        }

        .cert-no-label {
            font-size: 9px;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 1px;
        }

        .cert-no-code {
            font-family: 'DejaVu Sans Mono', monospace, sans-serif;
            font-size: 11px;
            font-weight: 800;
            color: #11254e;
            letter-spacing: 0.5px;
        }

        /* Signatures Section */
        .signatures-table {
            width: 86%;
            margin: 4px auto 0 auto;
            border-collapse: collapse;
        }

        .sig-col-left {
            width: 38%;
            text-align: center;
            vertical-align: bottom;
            padding-bottom: 4px;
        }

        .sig-col-center {
            width: 24%;
            text-align: center;
            vertical-align: middle;
        }

        .sig-col-right {
            width: 38%;
            text-align: center;
            vertical-align: bottom;
            padding-bottom: 4px;
        }

        .sig-img-container {
            height: 60px;
            display: block;
            margin: 0 auto;
            line-height: 60px;
        }

        .sig-img {
            max-height: 58px;
            max-width: 180px;
            vertical-align: middle;
            display: inline-block;
        }

        .sig-line {
            width: 160px;
            height: 1.5px;
            background-color: #6366f1;
            margin: 2px auto 4px auto;
        }

        .sig-name {
            font-size: 11.5px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 1px;
        }

        .sig-title {
            font-size: 9.5px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .qr-badge-corner {
            position: absolute;
            bottom: 22px;
            left: 32px;
            z-index: 10;
            text-align: center;
        }

        .qr-badge-img {
            width: 36px;
            height: 36px;
            display: block;
            margin: 0 auto;
        }

        .qr-badge-text {
            font-size: 6.5px;
            color: #64748b;
            margin-top: 1px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
    </style>
</head>
<body>
    @if(!empty($bgTemplateBase64))
        <img src="data:image/png;base64,{{ $bgTemplateBase64 }}" class="bg-layer" alt="Certificate Background" />
    @endif

    <div class="content-layer">
        <div class="top-spacer"></div>

        <div class="recipient-name">{{ $user->name ?? $student->name ?? 'Student Name' }}</div>
        <div class="name-underline-bar"></div>

        <div class="completion-lead">has successfully completed the tech course in</div>
        <div class="course-title">{{ $course->name ?? 'Course Title' }}</div>
        <div class="company-affiliation">at {{ $company['company_name'] ?? 'CyberMinds Tech Limited' }}.</div>

        <div class="dedication-text">
            Your dedication, hard work and commitment to learning have been proven through the successful completion of this course.
        </div>

        <div class="cert-no-box">
            <div class="cert-no-pill">
                <div class="cert-no-label">Certificate No:</div>
                <div class="cert-no-code">{{ $certificate->certificate_number }}</div>
            </div>
        </div>

        <table class="signatures-table">
            <tr>
                <td class="sig-col-left">
                    <div class="sig-img-container">
                        @if(!empty($ceoSignatureBase64))
                            <img src="data:image/png;base64,{{ $ceoSignatureBase64 }}" class="sig-img" alt="CEO Signature" />
                        @endif
                    </div>
                    <div class="sig-line"></div>
                    <div class="sig-name">{{ $company['ceo_name'] ?? 'Ibrahim Adam' }}</div>
                    <div class="sig-title">{{ $company['ceo_title'] ?? 'CEO' }}</div>
                </td>
                <td class="sig-col-center">
                    <!-- The gold accredited rosette medal is in the background image -->
                </td>
                <td class="sig-col-right">
                    <div class="sig-img-container">
                        @if(!empty($chairmanSignatureBase64))
                            <img src="data:image/png;base64,{{ $chairmanSignatureBase64 }}" class="sig-img" alt="CTO Signature" />
                        @endif
                    </div>
                    <div class="sig-line"></div>
                    <div class="sig-name">{{ $company['chairman_name'] ?? 'Abdulazeez Nuhu' }}</div>
                    <div class="sig-title">{{ $company['chairman_title'] ?? 'CTO' }}</div>
                </td>
            </tr>
        </table>
    </div>

</body>
</html>
