<?php

return [
    'company_name' => env('ACADEMY_COMPANY_NAME', 'CMT Academy'),
    'company_tagline' => env('ACADEMY_COMPANY_TAGLINE', 'Center for Management & Technology Excellence'),
    'company_address' => env('ACADEMY_COMPANY_ADDRESS', '123 Innovation Boulevard, Suite 500, Tech City'),
    'company_email' => env('ACADEMY_COMPANY_EMAIL', 'info@cmtacademy.org'),
    'company_website' => env('ACADEMY_COMPANY_WEBSITE', 'https://cmtacademy.org'),

    'ceo_name' => env('ACADEMY_CEO_NAME', 'Dr. Sarah Jenkins'),
    'ceo_title' => env('ACADEMY_CEO_TITLE', 'Chief Executive Officer'),

    'chairman_name' => env('ACADEMY_CHAIRMAN_NAME', 'Abdulazeez Nuhu'),
    'chairman_title' => env('ACADEMY_CHAIRMAN_TITLE', 'CTO'),

    'verification_base_url' => env('ACADEMY_VERIFICATION_URL', 'http://localhost:8000/api/v1/verify'),

    'certificate_prefix' => env('ACADEMY_CERTIFICATE_PREFIX', 'CMT'),
    'student_id_prefix' => env('ACADEMY_STUDENT_ID_PREFIX', 'CMT/STU'),
];
