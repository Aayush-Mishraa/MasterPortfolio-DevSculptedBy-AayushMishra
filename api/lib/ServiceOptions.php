<?php

declare(strict_types=1);

namespace Site;

/*
 * F12: what the service enquiry form may send. SERVICES mirrors the slugs and
 * titles in src/data/services.js, BUDGETS the ranges built from BUDGET_STEPS
 * in src/data/pricing.js (tests/e2e/f12-enquiry.spec.ts keeps them in step).
 * Timelines are the contact form's (ContactOptions::TIMELINES).
 */
final class ServiceOptions
{
    public const SERVICES = [
        'release-review' => 'Release Review call',
        'qa-health-check' => 'QA Health Check',
        'playwright-starter-sprint' => 'Playwright Starter Sprint',
        'ai-feature-eval-pack' => 'AI Feature Eval Pack',
        'release-retainer' => '"Signed-off" Release Retainer',
        'wcag-quick-audit' => 'EAA/WCAG Quick Audit',
        'fractional-qa-lead' => 'Fractional QA Lead',
        'mentoring' => 'Mentoring & SDET mock interviews',
    ];

    public const BUDGETS = [
        'under-1000' => 'Under $1,000',
        '1000-3000' => '$1,000–$3,000',
        '3000-5000' => '$3,000–$5,000',
        'over-5000' => 'Over $5,000',
        'not-sure' => 'Not sure yet',
    ];
}
