<?php

declare(strict_types=1);

namespace Site;

/*
 * The choices the contact form offers, by id, with the labels used in the
 * email. They mirror INTENTS / TIMELINES in src/pages/contact/ContactComponent.js
 * and contactSection.topics in src/portfolio.js (a Playwright test keeps them in step).
 */
final class ContactOptions
{
    public const INTENTS = [
        'full-time' => 'Full-time role',
        'freelance' => 'Freelance project',
        'audit' => 'Automation audit',
        'collab' => 'Collaboration',
        'mentoring' => 'Mentoring',
        'hello' => 'Just saying hi',
    ];

    public const TOPICS = [
        'frameworks' => 'Test automation frameworks',
        'ai-testing' => 'AI-powered testing',
        'performance' => 'Performance testing',
        'cicd' => 'CI/CD pipelines',
        'ml-qa' => 'ML model QA',
        'mobile' => 'Mobile testing',
        'cloud' => 'Cloud test infra',
        'open-source' => 'Open-source tooling',
    ];

    public const TIMELINES = ['ASAP', '< 1 month', '1–3 months', 'Flexible'];

    public const SOURCES = ['contact', 'footer'];
}
