<?php

declare(strict_types=1);

namespace Site\Admin;

use Site\Scanner;

/*
 * Stage 3 + 4 admin pages: scanner requests (F24), lead magnets (F20, F23,
 * F27), the site assistant's questions (F31) and NeuralForge accounts (F30).
 * Same rules as Pages: everything printed goes through View::e(), every
 * change is a CSRF-checked POST written to the audit log.
 */
final class Growth
{
    public const SCAN_STATUSES = ['waiting' => 'Waiting', 'queued' => 'Queued', 'running' => 'Running', 'done' => 'Done', 'failed' => 'Failed'];

    /* ------------------------------------------------------------------ */
    /* Scans (F24)                                                         */
    /* ------------------------------------------------------------------ */

    public static function scans(Ctx $ctx): void
    {
        $status = $ctx->query('status');
        $where = isset(self::SCAN_STATUSES[$status]) ? 'WHERE status = :s' : '';
        $rows = $ctx->rows("SELECT id, public_id, created_at, url, email, status, passed, failed, mail_sent, lead_id FROM scans {$where} ORDER BY id DESC LIMIT 200", $where ? ['s' => $status] : []);
        $scanner = new Scanner($ctx->config);
        $html = '<p class="adm-muted">"Test my site" requests (F24). '
            . ($scanner->configured() ? 'The scanner is configured: new requests start a GitHub Actions job.' : '<strong>The scanner isn\'t configured</strong> (SCANNER_GITHUB_TOKEN, SCAN_CALLBACK_SECRET): requests wait here until you start them.')
            . ' Times in IST.</p><form method="get" action="' . View::url('/scans') . '" class="adm-filters">'
            . View::select('status', 'Status', ['' => 'All'] + self::SCAN_STATUSES, $status)
            . '<button type="submit" class="adm-btn adm-btn--ghost">Filter</button></form>';
        if (!$rows) {
            $html .= '<p>No scans yet.</p>';
        } else {
            $html .= '<div class="adm-scroll"><table><thead><tr><th scope="col">When</th><th scope="col">Site</th><th scope="col">Email</th><th scope="col">Status</th><th scope="col">Result</th><th scope="col">Mailed</th></tr></thead><tbody>';
            foreach ($rows as $row) {
                $result = $row['status'] === 'done' ? (int) $row['passed'] . ' passed · ' . (int) $row['failed'] . ' failed' : '—';
                $html .= '<tr><td>' . View::date($row['created_at']) . '</td><td><a href="' . View::e(View::url('/scans/' . (int) $row['id'])) . '">' . View::e(mb_strimwidth($row['url'], 0, 60, '…')) . '</a></td><td>'
                    . View::e($row['email']) . '</td><td><span class="adm-pill adm-pill--' . View::e($row['status']) . '">' . View::e(self::SCAN_STATUSES[$row['status']] ?? $row['status'])
                    . '</span></td><td>' . View::e($result) . '</td><td>' . ($row['mail_sent'] ? 'Yes' : '—') . '</td></tr>';
            }
            $html .= '</tbody></table></div>';
        }
        View::page('Scans', $html, '/scans');
    }

    private static function findScan(Ctx $ctx, int $id): array
    {
        $rows = $ctx->rows('SELECT * FROM scans WHERE id = :id', ['id' => $id]);
        if (!$rows) {
            http_response_code(404);
            View::page('Scan not found', '<p>No scan #' . $id . '. <a href="' . View::url('/scans') . '">Back to scans</a>.</p>', '/scans');
        }
        return $rows[0];
    }

    public static function scan(Ctx $ctx, int $id): void
    {
        $scan = self::findScan($ctx, $id);
        $scanner = new Scanner($ctx->config);
        $report = $scan['results'] ? json_decode((string) $scan['results'], true) : null;
        $html = '<p><a href="' . View::url('/scans') . '">← All scans</a></p><dl class="adm-dl">'
            . '<dt>URL</dt><dd>' . View::e($scan['url']) . '</dd>'
            . '<dt>Email</dt><dd><a href="mailto:' . View::e($scan['email']) . '">' . View::e($scan['email']) . '</a></dd>'
            . '<dt>Requested</dt><dd>' . View::date($scan['created_at']) . '</dd>'
            . '<dt>Status</dt><dd><span class="adm-pill adm-pill--' . View::e($scan['status']) . '">' . View::e(self::SCAN_STATUSES[$scan['status']] ?? $scan['status']) . '</span>'
            . ($scan['error'] ? ' ' . View::e($scan['error']) : '') . '</dd>'
            . '<dt>Report page</dt><dd><a href="' . View::e($scanner->reportUrl($scan['public_id'])) . '">' . View::e($scanner->reportUrl($scan['public_id'])) . '</a></dd>'
            . ($scan['run_url'] ? '<dt>GitHub run</dt><dd><a href="' . View::e($scan['run_url']) . '">' . View::e($scan['run_url']) . '</a></dd>' : '')
            . ($scan['lead_id'] ? '<dt>Lead</dt><dd><a href="' . View::e(View::url('/leads/' . (int) $scan['lead_id'])) . '">#' . (int) $scan['lead_id'] . '</a></dd>' : '')
            . '<dt>Report emailed</dt><dd>' . ($scan['mail_sent'] ? 'Yes' : 'No') . '</dd></dl>';

        if (is_array($report) && !empty($report['checks'])) {
            $html .= '<section class="adm-section"><h2>' . View::e(Scanner::verdict((int) $scan['passed'], (int) $scan['failed'])) . '</h2><div class="adm-scroll"><table><thead><tr><th scope="col">Check</th><th scope="col">Result</th><th scope="col">Summary</th></tr></thead><tbody>';
            foreach ($report['checks'] as $check) {
                $html .= '<tr><th scope="row">' . View::e($check['title'] ?? $check['id'] ?? '') . '</th><td>' . View::e($check['status'] ?? '') . '</td><td>' . View::e($check['summary'] ?? '') . '</td></tr>';
            }
            $html .= '</tbody></table></div></section>';
        }
        if (in_array($scan['status'], ['waiting', 'failed', 'queued'], true)) {
            $html .= '<section class="adm-section"><h2>Start the scan</h2><p class="adm-muted">Sends the job to GitHub Actions again. Use it for requests that waited while the scanner wasn\'t configured, or after a failure.</p>'
                . '<form method="post" action="' . View::e(View::url('/scans/' . $id . '/dispatch')) . '">' . View::csrfField()
                . '<button type="submit" class="adm-btn"' . ($scanner->configured() ? '' : ' disabled') . '>Start scan</button></form></section>';
        }
        View::page('Scan #' . $id, $html, '/scans');
    }

    public static function scanDispatch(Ctx $ctx, int $id): void
    {
        $scan = self::findScan($ctx, $id);
        $scanner = new Scanner($ctx->config);
        if ($scanner->dispatch($scan['public_id'], $scan['url'])) {
            $ctx->pdo->prepare("UPDATE scans SET status = 'queued', error = NULL, updated_at = UTC_TIMESTAMP() WHERE id = :id")->execute(['id' => $id]);
            $ctx->audit->log('scan.dispatched', 'scan', $id);
            Session::flash('success', 'Scan sent to GitHub Actions. The report is emailed when it finishes.');
        } else {
            Session::flash('error', 'GitHub didn\'t accept the job. Check the scanner token and the server log.');
        }
        View::redirect('/scans/' . $id);
    }

    /* ------------------------------------------------------------------ */
    /* Lead magnets (F20, F23, F27)                                         */
    /* ------------------------------------------------------------------ */

    public static function magnets(Ctx $ctx): void
    {
        $totals = $ctx->rows(
            "SELECT magnet, COUNT(*) AS total, SUM(created_at >= :t) AS recent, SUM(newsletter) AS newsletter, SUM(downloads) AS downloads
             FROM magnet_requests GROUP BY magnet ORDER BY total DESC",
            ['t' => gmdate('Y-m-d H:i:s', time() - 30 * 86400)]
        );
        $html = '<p class="adm-muted">Checklist downloads, quiz reports and the Starter Kit waitlist. Each request is also a lead (source "magnet:…").</p>';
        if (!$totals) {
            $html .= '<p>No requests yet.</p>';
        } else {
            $html .= '<div class="adm-scroll"><table><thead><tr><th scope="col">Magnet</th><th scope="col">Last 30 days</th><th scope="col">All</th><th scope="col">Also subscribed</th><th scope="col">Downloads</th></tr></thead><tbody>';
            foreach ($totals as $row) {
                $html .= '<tr><th scope="row"><a href="' . View::e(View::url('/leads', ['source' => 'magnet:' . $row['magnet']])) . '">' . View::e($row['magnet']) . '</a></th><td>' . (int) $row['recent'] . '</td><td>' . (int) $row['total']
                    . '</td><td>' . (int) $row['newsletter'] . '</td><td>' . (int) $row['downloads'] . '</td></tr>';
            }
            $html .= '</tbody></table></div>';
            $recent = $ctx->rows('SELECT created_at, magnet, email, newsletter, detail, downloads, lead_id FROM magnet_requests ORDER BY id DESC LIMIT 50');
            $html .= '<section class="adm-section"><h2>Latest 50</h2><div class="adm-scroll"><table><thead><tr><th scope="col">When</th><th scope="col">Magnet</th><th scope="col">Email</th><th scope="col">Newsletter</th><th scope="col">Detail</th><th scope="col">Downloads</th></tr></thead><tbody>';
            foreach ($recent as $row) {
                $email = $row['lead_id'] ? '<a href="' . View::e(View::url('/leads/' . (int) $row['lead_id'])) . '">' . View::e($row['email']) . '</a>' : View::e($row['email']);
                $html .= '<tr><td>' . View::date($row['created_at']) . '</td><td>' . View::e($row['magnet']) . '</td><td>' . $email . '</td><td>' . ($row['newsletter'] ? 'Yes' : '—')
                    . '</td><td>' . View::e($row['detail'] ?? '') . '</td><td>' . (int) $row['downloads'] . '</td></tr>';
            }
            $html .= '</tbody></table></div></section>';
        }
        View::page('Lead magnets', $html, '/magnets');
    }

    /* ------------------------------------------------------------------ */
    /* Site assistant (F31)                                                */
    /* ------------------------------------------------------------------ */

    public static function askLog(Ctx $ctx): void
    {
        $since = gmdate('Y-m-d H:i:s', time() - 30 * 86400);
        $stats = $ctx->rows(
            "SELECT mode, COUNT(*) AS n, AVG(grounded) AS grounded, AVG(cited) AS cited, AVG(retrieval) AS retrieval, SUM(input_tokens) AS input_tokens, SUM(output_tokens) AS output_tokens
             FROM ask_log WHERE created_at >= :t GROUP BY mode",
            ['t' => $since]
        );
        $configured = $ctx->config->string('anthropic.api_key') !== '';
        $html = '<p class="adm-muted">Questions to /ask (F31), last 30 days. The AI writer is ' . ($configured ? 'on (Claude ' . View::e($ctx->config->string('anthropic.model')) . ', ' . (int) $ctx->config->get('anthropic.daily_cap', 200) . ' answers a day)' : '<strong>off</strong>: no ANTHROPIC_API_KEY, so answers are the matching passages') . '. Low "grounded" scores are the answers to read first.</p>';
        $pct = static fn ($value): string => $value === null ? '—' : round(100 * (float) $value) . '%';
        if ($stats) {
            $html .= '<div class="adm-scroll"><table><thead><tr><th scope="col">Mode</th><th scope="col">Questions</th><th scope="col">Grounded</th><th scope="col">Cited</th><th scope="col">Retrieval</th><th scope="col">Tokens in / out</th></tr></thead><tbody>';
            foreach ($stats as $row) {
                $html .= '<tr><th scope="row">' . View::e($row['mode']) . '</th><td>' . (int) $row['n'] . '</td><td>' . $pct($row['grounded']) . '</td><td>' . $pct($row['cited']) . '</td><td>' . $pct($row['retrieval'])
                    . '</td><td>' . number_format((int) $row['input_tokens']) . ' / ' . number_format((int) $row['output_tokens']) . '</td></tr>';
            }
            $html .= '</tbody></table></div>';
        }
        $rows = $ctx->rows('SELECT created_at, question, answer, mode, grounded, cited, retrieval FROM ask_log ORDER BY id DESC LIMIT 100');
        if (!$rows) {
            $html .= '<p>No questions yet.</p>';
        } else {
            $html .= '<section class="adm-section"><h2>Latest 100</h2><div class="adm-scroll"><table><thead><tr><th scope="col">When</th><th scope="col">Question</th><th scope="col">Answer</th><th scope="col">Mode</th><th scope="col">Grounded</th><th scope="col">Cited</th></tr></thead><tbody>';
            foreach ($rows as $row) {
                $html .= '<tr><td>' . View::date($row['created_at']) . '</td><td>' . View::e($row['question']) . '</td><td>' . View::e(mb_strimwidth((string) $row['answer'], 0, 240, '…'))
                    . '</td><td>' . View::e($row['mode']) . '</td><td>' . $pct($row['grounded']) . '</td><td>' . $pct($row['cited']) . '</td></tr>';
            }
            $html .= '</tbody></table></div></section>';
        }
        View::page('AI questions', $html, '/ask');
    }

    /* ------------------------------------------------------------------ */
    /* NeuralForge (F30)                                                   */
    /* ------------------------------------------------------------------ */

    public static function neuralforge(Ctx $ctx): void
    {
        $total = (int) $ctx->value('SELECT COUNT(*) FROM nf_users');
        $active = (int) $ctx->value('SELECT COUNT(*) FROM nf_users WHERE last_seen_at >= :t', ['t' => gmdate('Y-m-d H:i:s', time() - 7 * 86400)]);
        $html = '<ul class="adm-tiles"><li><span class="adm-card adm-tile"><span>Learners signed up</span><strong>' . $total . '</strong></span></li>'
            . '<li><span class="adm-card adm-tile"><span>Active, last 7 days</span><strong>' . $active . '</strong></span></li></ul>';
        $levels = $ctx->rows('SELECT COALESCE(level, 0) AS level, COUNT(*) AS n FROM nf_users GROUP BY COALESCE(level, 0) ORDER BY level');
        if ($levels) {
            $html .= '<section class="adm-section"><h2>Learners by level</h2><div class="adm-scroll"><table><thead><tr><th scope="col">Level</th><th scope="col">Learners</th></tr></thead><tbody>';
            foreach ($levels as $row) {
                $html .= '<tr><th scope="row">' . (int) $row['level'] . '</th><td>' . (int) $row['n'] . '</td></tr>';
            }
            $html .= '</tbody></table></div></section>';
        }
        $rows = $ctx->rows('SELECT email, created_at, last_seen_at, level FROM nf_users ORDER BY id DESC LIMIT 100');
        if ($rows) {
            $html .= '<section class="adm-section"><h2>Latest sign-ups</h2><div class="adm-scroll"><table><thead><tr><th scope="col">Email</th><th scope="col">Joined</th><th scope="col">Last seen</th><th scope="col">Level</th></tr></thead><tbody>';
            foreach ($rows as $row) {
                $html .= '<tr><td>' . View::e($row['email']) . '</td><td>' . View::date($row['created_at']) . '</td><td>' . View::date($row['last_seen_at']) . '</td><td>' . (int) $row['level'] . '</td></tr>';
            }
            $html .= '</tbody></table></div></section>';
        }
        View::page('NeuralForge', $html, '/neuralforge');
    }
}
