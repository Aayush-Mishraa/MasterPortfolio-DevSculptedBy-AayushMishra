<?php

declare(strict_types=1);

namespace Site\Admin;

use Site\Buttondown;
use Site\Settings;

/*
 * Every admin page and action. GET handlers render with View::page(); POST
 * handlers change one thing, write the audit log, set a flash message and
 * redirect (303) back. All SQL is prepared; all output is escaped (View::e).
 */
final class Pages
{
    private const PER_PAGE = 50;
    private const SUBSCRIBER_STATUSES = ['pending' => 'Pending', 'confirmed' => 'Confirmed', 'unsubscribed' => 'Unsubscribed'];
    // The plan's day-90 targets (section 8); recalibrate here.
    private const TARGETS = ['leads_month' => 10, 'confirmed_subscribers' => 300];

    /* ------------------------------------------------------------------ */
    /* Sign-in                                                             */
    /* ------------------------------------------------------------------ */

    public static function loginForm(Ctx $ctx): void
    {
        if (!$ctx->auth->hasUsers()) {
            View::redirect('/setup');
        }
        if (Session::userId() !== null) {
            View::redirect('/');
        }
        View::page('Sign in', '<form method="post" action="' . View::url('/login') . '" class="adm-form adm-card">' . View::csrfField()
            . '<label for="f-username">Username</label><input id="f-username" name="username" autocomplete="username" required autofocus>'
            . '<label for="f-password">Password</label><input id="f-password" name="password" type="password" autocomplete="current-password" required>'
            . '<button type="submit" class="adm-btn">Sign in</button></form>');
    }

    public static function login(Ctx $ctx): void
    {
        $username = mb_substr(trim($ctx->post('username')), 0, 60);
        $result = $ctx->auth->attempt($username, $ctx->post('password'));
        if ($result['status'] === 'locked') {
            $ctx->audit->log('login.locked', 'admin_user', null, 'username: ' . $username);
            self::locked($result['retry_after']);
        }
        if ($result['status'] === 'invalid') {
            $ctx->audit->log('login.failed', 'admin_user', null, 'username: ' . $username);
            Session::flash('error', 'Wrong username or password.');
            View::redirect('/login');
        }
        if ($result['status'] === 'totp') {
            session_regenerate_id(true);
            $_SESSION['pending_2fa'] = ['id' => (int) $result['user']['id'], 'at' => time()];
            View::redirect('/2fa');
        }
        Session::login($result['user']);
        $ctx->audit->log('login', 'admin_user', $result['user']['id']);
        View::redirect('/');
    }

    private static function pendingUser(Ctx $ctx): ?array
    {
        $pending = $_SESSION['pending_2fa'] ?? null;
        if (!is_array($pending) || time() - (int) $pending['at'] > 300) {
            unset($_SESSION['pending_2fa']);
            return null;
        }
        return $ctx->auth->user((int) $pending['id']);
    }

    public static function totpForm(Ctx $ctx): void
    {
        if (self::pendingUser($ctx) === null) {
            View::redirect('/login');
        }
        View::page('Two-factor code', '<form method="post" action="' . View::url('/2fa') . '" class="adm-form adm-card">' . View::csrfField()
            . '<label for="f-code">The 6-digit code from your authenticator app</label>'
            . '<input id="f-code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]{6,7}" maxlength="7" required autofocus>'
            . '<button type="submit" class="adm-btn">Verify</button></form>');
    }

    public static function totp(Ctx $ctx): void
    {
        $user = self::pendingUser($ctx);
        if ($user === null) {
            Session::flash('error', 'Please sign in again.');
            View::redirect('/login');
        }
        $result = $ctx->auth->attemptTotp($user, $ctx->post('code'));
        if ($result['status'] === 'locked') {
            unset($_SESSION['pending_2fa']);
            $ctx->audit->log('login.locked', 'admin_user', $user['id'], '2fa');
            self::locked($result['retry_after']);
        }
        if ($result['status'] !== 'ok') {
            $ctx->audit->log('login.failed', 'admin_user', $user['id'], '2fa code');
            Session::flash('error', "That code didn't work. Codes change every 30 seconds.");
            View::redirect('/2fa');
        }
        Session::login($user);
        $ctx->audit->log('login', 'admin_user', $user['id'], 'with 2fa');
        View::redirect('/');
    }

    private static function locked(int $retryAfter): never
    {
        http_response_code(429);
        header('Retry-After: ' . $retryAfter);
        $minutes = max(1, (int) ceil($retryAfter / 60));
        View::page('Too many attempts', '<p class="adm-flash adm-flash--error" role="alert">Too many failed sign-ins. Try again in ' . $minutes . ' minute' . ($minutes === 1 ? '' : 's') . '.</p>');
    }

    public static function setupForm(Ctx $ctx): void
    {
        if ($ctx->auth->hasUsers()) {
            View::redirect('/login');
        }
        View::page('Create the first admin', '<p>No admin exists yet. Enter the API admin token (the <code>API_ADMIN_TOKEN</code> secret) to create one.</p>'
            . '<form method="post" action="' . View::url('/setup') . '" class="adm-form adm-card">' . View::csrfField()
            . '<label for="f-token">API admin token</label><input id="f-token" name="token" type="password" autocomplete="off" required>'
            . '<label for="f-username">Username</label><input id="f-username" name="username" autocomplete="username" pattern="[a-z0-9._-]{3,60}" required>'
            . '<label for="f-password">Password (at least ' . Auth::MIN_PASSWORD . ' characters)</label><input id="f-password" name="password" type="password" autocomplete="new-password" minlength="' . Auth::MIN_PASSWORD . '" required>'
            . '<label for="f-confirm">Password again</label><input id="f-confirm" name="confirm" type="password" autocomplete="new-password" required>'
            . '<button type="submit" class="adm-btn">Create admin</button></form>');
    }

    public static function setup(Ctx $ctx): void
    {
        if ($ctx->auth->hasUsers()) {
            View::redirect('/login');
        }
        $throttle = $ctx->auth->throttle();
        $ipHash = $ctx->ipHash;
        $lock = $throttle->check($ipHash, '#setup');
        if ($lock['locked']) {
            self::locked($lock['retry_after']);
        }
        if (!$ctx->auth->validSetupToken($ctx->post('token'))) {
            $throttle->record($ipHash, '#setup', false);
            $ctx->audit->log('setup.failed', null, null, 'wrong token');
            Session::flash('error', "That token isn't the API admin token.");
            View::redirect('/setup');
        }
        $username = strtolower(trim($ctx->post('username')));
        if (!preg_match('/^[a-z0-9._-]{3,60}$/', $username)) {
            Session::flash('error', 'Username: 3–60 characters, lowercase letters, digits, dot, dash or underscore.');
            View::redirect('/setup');
        }
        $problem = Auth::passwordProblem($ctx->post('password'), $ctx->post('confirm'));
        if ($problem !== null) {
            Session::flash('error', $problem);
            View::redirect('/setup');
        }
        $id = $ctx->auth->createUser($username, $ctx->post('password'));
        $user = $ctx->auth->user($id);
        Session::login($user);
        $ctx->audit->log('admin.created', 'admin_user', $id, 'first admin');
        Session::flash('success', 'Admin created. Consider turning on two-factor sign-in in Settings.');
        View::redirect('/');
    }

    public static function logout(Ctx $ctx): void
    {
        $ctx->audit->log('logout', 'admin_user', Session::userId());
        Session::logout();
        header('Location: ' . View::url('/login'), true, 303);
        exit;
    }

    /* ------------------------------------------------------------------ */
    /* Overview                                                            */
    /* ------------------------------------------------------------------ */

    public static function overview(Ctx $ctx): void
    {
        $now = time();
        $weekAgo = gmdate('Y-m-d H:i:s', $now - 7 * 86400);
        $monthStart = gmdate('Y-m-01 00:00:00', $now);
        $nowSql = gmdate('Y-m-d H:i:s', $now);

        $leadsWeek = (int) $ctx->value('SELECT COUNT(*) FROM leads WHERE created_at >= :t', ['t' => $weekAgo]);
        $leadsMonth = (int) $ctx->value('SELECT COUNT(*) FROM leads WHERE created_at >= :t', ['t' => $monthStart]);
        $enquiriesMonth = (int) $ctx->value("SELECT COUNT(*) FROM leads WHERE source LIKE 'service:%' AND created_at >= :t", ['t' => $monthStart]);
        $newLeads = (int) $ctx->value("SELECT COUNT(*) FROM leads WHERE status = 'new'");
        $subs = array_fill_keys(array_keys(self::SUBSCRIBER_STATUSES), 0);
        foreach ($ctx->rows('SELECT status, COUNT(*) AS n FROM subscribers GROUP BY status') as $row) {
            $subs[$row['status']] = (int) $row['n'];
        }
        $upcoming = (int) $ctx->value("SELECT COUNT(*) FROM bookings WHERE status = 'booked' AND start_at >= :now", ['now' => $nowSql]);
        $paidMonth = (int) $ctx->value('SELECT COUNT(*) FROM bookings WHERE paid = 1 AND created_at >= :t', ['t' => $monthStart]);
        $wonMonth = (int) $ctx->value("SELECT COUNT(*) FROM leads WHERE status = 'won' AND status_changed_at >= :t", ['t' => $monthStart]);

        // Stage 3 exit gate: qualified leads = contact, enquiries and scanner (not lead magnets), plus bookings.
        $qualifiedMonth = (int) $ctx->value("SELECT COUNT(*) FROM leads WHERE source NOT LIKE 'magnet:%' AND created_at >= :t", ['t' => $monthStart])
            + (int) $ctx->value('SELECT COUNT(*) FROM bookings WHERE created_at >= :t', ['t' => $monthStart]);
        $magnetsMonth = (int) $ctx->value('SELECT COUNT(*) FROM magnet_requests WHERE created_at >= :t', ['t' => $monthStart]);
        $scansMonth = (int) $ctx->value('SELECT COUNT(*) FROM scans WHERE created_at >= :t', ['t' => $monthStart]);

        $tiles = [
            ['Leads, last 7 days', $leadsWeek, View::url('/leads')],
            ['Qualified leads this month', $qualifiedMonth . ' / ' . self::TARGETS['leads_month'], View::url('/leads')],
            ['All leads this month', $leadsMonth, View::url('/leads')],
            ['Lead magnets this month', $magnetsMonth, View::url('/magnets')],
            ['Scans this month', $scansMonth, View::url('/scans')],
            ['Service enquiries this month', $enquiriesMonth, View::url('/leads', ['source' => 'service'])],
            ['New, not yet answered', $newLeads, View::url('/leads', ['status' => 'new'])],
            ['Subscribers confirmed', $subs['confirmed'] . ' / ' . self::TARGETS['confirmed_subscribers'], View::url('/subscribers', ['status' => 'confirmed'])],
            ['Subscribers pending · unsubscribed', $subs['pending'] . ' · ' . $subs['unsubscribed'], View::url('/subscribers')],
            ['Upcoming bookings', $upcoming, View::url('/bookings')],
            ['Paid bookings this month', $paidMonth, View::url('/bookings')],
            ['Won this month', $wonMonth, View::url('/leads', ['status' => 'won'])],
        ];
        $html = '<ul class="adm-tiles">';
        foreach ($tiles as [$label, $value, $href]) {
            $html .= '<li><a class="adm-card adm-tile" href="' . View::e($href) . '"><span>' . View::e($label) . '</span><strong>' . View::e($value) . '</strong></a></li>';
        }
        $html .= '</ul>';

        // Conversion by source: lead → won (visits need analytics, F00b).
        $sources = $ctx->rows(
            "SELECT source, COUNT(*) AS total, SUM(created_at >= :t) AS recent, SUM(status = 'won') AS won, SUM(status = 'lost') AS lost
             FROM leads GROUP BY source ORDER BY total DESC",
            ['t' => gmdate('Y-m-d H:i:s', $now - 30 * 86400)]
        );
        $html .= '<section class="adm-section"><h2>Conversion by source</h2><p class="adm-muted">Lead → won, per form. Visit → lead needs the analytics baseline (F00b).</p>';
        if (!$sources) {
            $html .= '<p>No leads yet.</p>';
        } else {
            $html .= '<div class="adm-scroll"><table><thead><tr><th scope="col">Source</th><th scope="col">Leads (30 days)</th><th scope="col">Leads (all)</th><th scope="col">Won</th><th scope="col">Lost</th><th scope="col">Won rate</th></tr></thead><tbody>';
            foreach ($sources as $row) {
                $rate = (int) $row['total'] > 0 ? round(100 * (int) $row['won'] / (int) $row['total']) . '%' : '—';
                $html .= '<tr><th scope="row"><a href="' . View::e(View::url('/leads', ['source' => $row['source']])) . '">' . View::e($row['source']) . '</a></th><td>' . (int) $row['recent'] . '</td><td>' . (int) $row['total']
                    . '</td><td>' . (int) $row['won'] . '</td><td>' . (int) $row['lost'] . '</td><td>' . View::e($rate) . '</td></tr>';
            }
            $html .= '</tbody></table></div>';
        }
        $html .= '</section>';

        // The weekly metrics (plan, section 8), last 8 weeks, Monday to Sunday (UTC).
        $monday = strtotime('monday this week', $now) ?: $now;
        $metrics = [
            'Leads' => "SELECT COUNT(*) FROM leads WHERE created_at >= :a AND created_at < :b",
            'Service enquiries' => "SELECT COUNT(*) FROM leads WHERE source LIKE 'service:%' AND created_at >= :a AND created_at < :b",
            'Bookings' => 'SELECT COUNT(*) FROM bookings WHERE created_at >= :a AND created_at < :b',
            'Paid bookings' => 'SELECT COUNT(*) FROM bookings WHERE paid = 1 AND created_at >= :a AND created_at < :b',
            'Won' => "SELECT COUNT(*) FROM leads WHERE status = 'won' AND status_changed_at >= :a AND status_changed_at < :b",
            'New confirmed subscribers' => 'SELECT COUNT(*) FROM subscribers WHERE confirmed_at >= :a AND confirmed_at < :b',
            'Lead magnets' => 'SELECT COUNT(*) FROM magnet_requests WHERE created_at >= :a AND created_at < :b',
            'Scans' => 'SELECT COUNT(*) FROM scans WHERE created_at >= :a AND created_at < :b',
            'AI questions' => 'SELECT COUNT(*) FROM ask_log WHERE created_at >= :a AND created_at < :b',
            'NeuralForge sign-ups' => 'SELECT COUNT(*) FROM nf_users WHERE created_at >= :a AND created_at < :b',
        ];
        $weeks = [];
        for ($i = 7; $i >= 0; $i--) {
            $weeks[] = $monday - $i * 7 * 86400;
        }
        $html .= '<section class="adm-section"><h2>Weekly metrics</h2><div class="adm-scroll"><table><thead><tr><th scope="col">Week of</th>';
        foreach ($weeks as $start) {
            $html .= '<th scope="col">' . View::e(gmdate('j M', $start)) . '</th>';
        }
        $html .= '</tr></thead><tbody>';
        foreach ($metrics as $label => $sql) {
            $html .= '<tr><th scope="row">' . View::e($label) . '</th>';
            foreach ($weeks as $start) {
                $count = (int) $ctx->value($sql, ['a' => gmdate('Y-m-d H:i:s', $start), 'b' => gmdate('Y-m-d H:i:s', $start + 7 * 86400)]);
                $html .= '<td>' . $count . '</td>';
            }
            $html .= '</tr>';
        }
        $html .= '</tbody></table></div></section>';

        View::page('Overview', $html, '/');
    }

    /* ------------------------------------------------------------------ */
    /* Leads                                                               */
    /* ------------------------------------------------------------------ */

    /** @return array{0: string, 1: array<string, mixed>, 2: array<string, string>} WHERE clause, params, active filters */
    private static function leadFilters(Ctx $ctx): array
    {
        $where = [];
        $params = [];
        $filters = ['q' => $ctx->query('q'), 'source' => $ctx->query('source'), 'status' => $ctx->query('status')];
        if ($filters['q'] !== '') {
            $where[] = '(name LIKE :q1 OR email LIKE :q2 OR company LIKE :q3 OR message LIKE :q4)';
            $like = '%' . addcslashes(mb_substr($filters['q'], 0, 100), '%_\\') . '%';
            $params += ['q1' => $like, 'q2' => $like, 'q3' => $like, 'q4' => $like];
        }
        if ($filters['source'] === 'service') {
            $where[] = "source LIKE 'service:%'";
        } elseif ($filters['source'] !== '') {
            $where[] = 'source = :source';
            $params['source'] = mb_substr($filters['source'], 0, 40);
        }
        if (isset(Auth::STATUSES[$filters['status']])) {
            $where[] = 'status = :status';
            $params['status'] = $filters['status'];
        } else {
            $filters['status'] = '';
        }
        return [$where ? 'WHERE ' . implode(' AND ', $where) : '', $params, $filters];
    }

    public static function leads(Ctx $ctx): void
    {
        [$where, $params, $filters] = self::leadFilters($ctx);
        $page = max(1, (int) $ctx->query('page'));
        $total = (int) $ctx->value("SELECT COUNT(*) FROM leads {$where}", $params);
        $rows = $ctx->rows(
            "SELECT id, created_at, source, name, email, company, budget, status FROM leads {$where} ORDER BY created_at DESC, id DESC LIMIT "
            . self::PER_PAGE . ' OFFSET ' . (($page - 1) * self::PER_PAGE),
            $params
        );
        $sources = ['' => 'All sources', 'service' => 'All service enquiries'];
        foreach ($ctx->rows('SELECT DISTINCT source FROM leads ORDER BY source') as $row) {
            $sources[$row['source']] = $row['source'];
        }

        $html = '<form method="get" action="' . View::url('/leads') . '" class="adm-filters">'
            . '<label for="f-q">Search</label><input id="f-q" name="q" type="search" value="' . View::e($filters['q']) . '" placeholder="Name, email, company or message">'
            . View::select('source', 'Source', $sources, $filters['source'])
            . View::select('status', 'Status', ['' => 'Any status'] + Auth::STATUSES, $filters['status'])
            . '<button type="submit" class="adm-btn">Filter</button>'
            . '<a class="adm-btn adm-btn--ghost" href="' . View::e(View::url('/leads.csv', $filters)) . '">Export CSV</a></form>';
        $html .= '<p class="adm-muted">' . $total . ' lead' . ($total === 1 ? '' : 's') . '</p>';
        if ($rows) {
            $html .= '<div class="adm-scroll"><table><thead><tr><th scope="col">Received (IST)</th><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Company</th><th scope="col">Source</th><th scope="col">Budget</th><th scope="col">Status</th></tr></thead><tbody>';
            foreach ($rows as $row) {
                $html .= '<tr><td>' . View::date($row['created_at']) . '</td>'
                    . '<td><a href="' . View::url('/leads/' . (int) $row['id']) . '">' . View::e($row['name']) . '</a></td>'
                    . '<td>' . View::e($row['email']) . '</td><td>' . View::e($row['company'] ?? '') . '</td>'
                    . '<td>' . View::e($row['source']) . '</td><td>' . View::e($row['budget'] ?? '') . '</td>'
                    . '<td><span class="adm-pill adm-pill--' . View::e($row['status']) . '">' . View::e(Auth::STATUSES[$row['status']] ?? $row['status']) . '</span></td></tr>';
            }
            $html .= '</tbody></table></div>' . self::pager('/leads', $filters, $page, $total);
        }
        View::page('Leads', $html, '/leads');
    }

    private static function pager(string $path, array $filters, int $page, int $total): string
    {
        $pages = (int) ceil($total / self::PER_PAGE);
        if ($pages <= 1) {
            return '';
        }
        $html = '<nav class="adm-pager" aria-label="Pages">';
        if ($page > 1) {
            $html .= '<a href="' . View::e(View::url($path, $filters + ['page' => $page - 1])) . '">← Newer</a>';
        }
        $html .= '<span>Page ' . $page . ' of ' . $pages . '</span>';
        if ($page < $pages) {
            $html .= '<a href="' . View::e(View::url($path, $filters + ['page' => $page + 1])) . '">Older →</a>';
        }
        return $html . '</nav>';
    }

    public static function leadsCsv(Ctx $ctx): void
    {
        [$where, $params, $filters] = self::leadFilters($ctx);
        $rows = $ctx->rows("SELECT id, created_at, source, intent, status, name, email, company, budget, timeline, topics, message, page FROM leads {$where} ORDER BY created_at DESC", $params);
        $ctx->audit->log('leads.exported', 'lead', null, count($rows) . ' rows; filters: ' . json_encode(array_filter($filters)));
        Csv::download('leads-' . gmdate('Y-m-d') . '.csv', ['id', 'created_at_utc', 'source', 'intent', 'status', 'name', 'email', 'company', 'budget', 'timeline', 'topics', 'message', 'page'], $rows);
    }

    private static function findLead(Ctx $ctx, int $id): array
    {
        $rows = $ctx->rows('SELECT * FROM leads WHERE id = :id', ['id' => $id]);
        if (!$rows) {
            http_response_code(404);
            View::page('Lead not found', '<p>No lead #' . $id . '. It may have been deleted. <a href="' . View::url('/leads') . '">All leads</a></p>', '/leads');
        }
        return $rows[0];
    }

    public static function lead(Ctx $ctx, int $id): void
    {
        $lead = self::findLead($ctx, $id);
        $fields = [
            'Received' => View::date($lead['created_at']) . ' IST',
            'Source' => View::e($lead['source']),
            'Reason' => View::e($lead['intent'] ?? ''),
            'Email' => '<a href="mailto:' . View::e(rawurlencode($lead['email'])) . '">' . View::e($lead['email']) . '</a>',
            'Company' => View::e($lead['company'] ?? ''),
            'Budget' => View::e($lead['budget'] ?? ''),
            'Timeline' => View::e($lead['timeline'] ?? ''),
            'Topics' => View::e($lead['topics'] ?? ''),
            'Page' => View::e($lead['page'] ?? ''),
            'Emailed to you' => $lead['mail_sent'] ? 'yes' : 'no',
        ];
        $html = '<p><a href="' . View::url('/leads') . '">← All leads</a></p><div class="adm-grid"><section class="adm-card"><h2>' . View::e($lead['name']) . '</h2><dl class="adm-dl">';
        foreach ($fields as $label => $value) {
            if ($value !== '') {
                $html .= '<dt>' . View::e($label) . '</dt><dd>' . $value . '</dd>';
            }
        }
        $html .= '</dl><h3>Message</h3><div class="adm-message">' . nl2br(View::e($lead['message'])) . '</div></section>';

        $html .= '<section class="adm-card"><h2>Pipeline</h2><form method="post" action="' . View::url('/leads/' . $id . '/status') . '" class="adm-form">' . View::csrfField()
            . View::select('status', 'Status', Auth::STATUSES, $lead['status'])
            . '<button type="submit" class="adm-btn">Update status</button></form>'
            . '<p class="adm-muted">New → Contacted → Proposal → Won / Lost' . ($lead['status_changed_at'] ? ' · changed ' . View::date($lead['status_changed_at']) . ' IST' : '') . '</p>';

        $notes = $ctx->rows('SELECT * FROM lead_notes WHERE lead_id = :id ORDER BY created_at DESC, id DESC', ['id' => $id]);
        $html .= '<h2>Private notes</h2><form method="post" action="' . View::url('/leads/' . $id . '/notes') . '" class="adm-form">' . View::csrfField()
            . '<label for="f-note">Add a note</label><textarea id="f-note" name="body" rows="3" maxlength="5000" required></textarea>'
            . '<button type="submit" class="adm-btn">Add note</button></form>';
        if ($notes) {
            $html .= '<ol class="adm-notes">';
            foreach ($notes as $note) {
                $html .= '<li><p>' . nl2br(View::e($note['body'])) . '</p><span class="adm-muted">' . View::e($note['username'] ?? '') . ' · ' . View::date($note['created_at']) . ' IST</span></li>';
            }
            $html .= '</ol>';
        }
        $html .= '<h2>Delete on request</h2><form method="post" action="' . View::url('/leads/' . $id . '/delete') . '" class="adm-form adm-danger">' . View::csrfField()
            . '<label class="adm-check"><input type="checkbox" name="confirm" value="yes" required> This person asked for their data to be deleted (DPDP / GDPR). Delete the lead and its notes for good.</label>'
            . '<button type="submit" class="adm-btn adm-btn--danger">Delete lead</button></form></section></div>';
        View::page('Lead #' . $id, $html, '/leads');
    }

    public static function leadStatus(Ctx $ctx, int $id): void
    {
        $lead = self::findLead($ctx, $id);
        $status = $ctx->post('status');
        if (!isset(Auth::STATUSES[$status])) {
            Session::flash('error', 'Pick a status from the list.');
            View::redirect('/leads/' . $id);
        }
        if ($status !== $lead['status']) {
            $ctx->pdo->prepare('UPDATE leads SET status = :s, status_changed_at = UTC_TIMESTAMP() WHERE id = :id')->execute(['s' => $status, 'id' => $id]);
            $ctx->audit->log('lead.status', 'lead', $id, $lead['status'] . ' → ' . $status);
        }
        Session::flash('success', 'Status: ' . Auth::STATUSES[$status] . '.');
        View::redirect('/leads/' . $id);
    }

    public static function leadNote(Ctx $ctx, int $id): void
    {
        self::findLead($ctx, $id);
        $body = trim($ctx->post('body'));
        if ($body === '' || mb_strlen($body) > 5000) {
            Session::flash('error', 'A note needs 1–5,000 characters.');
            View::redirect('/leads/' . $id);
        }
        $ctx->pdo->prepare('INSERT INTO lead_notes (lead_id, created_at, username, body) VALUES (:id, UTC_TIMESTAMP(), :u, :b)')
            ->execute(['id' => $id, 'u' => Session::username(), 'b' => $body]);
        $ctx->audit->log('lead.note', 'lead', $id);
        Session::flash('success', 'Note added.');
        View::redirect('/leads/' . $id);
    }

    public static function leadDelete(Ctx $ctx, int $id): void
    {
        self::findLead($ctx, $id);
        if ($ctx->post('confirm') !== 'yes') {
            Session::flash('error', 'Tick the box to confirm the deletion.');
            View::redirect('/leads/' . $id);
        }
        $ctx->pdo->prepare('DELETE FROM lead_notes WHERE lead_id = :id')->execute(['id' => $id]);
        $ctx->pdo->prepare('DELETE FROM leads WHERE id = :id')->execute(['id' => $id]);
        $ctx->audit->log('lead.deleted', 'lead', $id, 'deleted on request');
        Session::flash('success', 'Lead #' . $id . ' and its notes were deleted.');
        View::redirect('/leads');
    }

    /* ------------------------------------------------------------------ */
    /* Subscribers                                                         */
    /* ------------------------------------------------------------------ */

    private static function subscriberFilters(Ctx $ctx): array
    {
        $where = [];
        $params = [];
        $filters = ['q' => $ctx->query('q'), 'status' => $ctx->query('status')];
        if ($filters['q'] !== '') {
            $where[] = 'email LIKE :q';
            $params['q'] = '%' . addcslashes(mb_substr($filters['q'], 0, 100), '%_\\') . '%';
        }
        if (isset(self::SUBSCRIBER_STATUSES[$filters['status']])) {
            $where[] = 'status = :status';
            $params['status'] = $filters['status'];
        } else {
            $filters['status'] = '';
        }
        return [$where ? 'WHERE ' . implode(' AND ', $where) : '', $params, $filters];
    }

    public static function subscribers(Ctx $ctx): void
    {
        [$where, $params, $filters] = self::subscriberFilters($ctx);
        $page = max(1, (int) $ctx->query('page'));
        $total = (int) $ctx->value("SELECT COUNT(*) FROM subscribers {$where}", $params);
        $rows = $ctx->rows("SELECT * FROM subscribers {$where} ORDER BY created_at DESC, id DESC LIMIT " . self::PER_PAGE . ' OFFSET ' . (($page - 1) * self::PER_PAGE), $params);

        $html = '<form method="get" action="' . View::url('/subscribers') . '" class="adm-filters">'
            . '<label for="f-q">Search</label><input id="f-q" name="q" type="search" value="' . View::e($filters['q']) . '" placeholder="Email">'
            . View::select('status', 'Status', ['' => 'Any status'] + self::SUBSCRIBER_STATUSES, $filters['status'])
            . '<button type="submit" class="adm-btn">Filter</button>'
            . '<a class="adm-btn adm-btn--ghost" href="' . View::e(View::url('/subscribers.csv', $filters)) . '">Export CSV</a></form>'
            . '<p class="adm-muted">' . $total . ' subscriber' . ($total === 1 ? '' : 's') . '. Buttondown owns the double opt-in; its webhooks keep these statuses in step, and Resync asks it directly.</p>';
        if ($rows) {
            $html .= '<div class="adm-scroll"><table><thead><tr><th scope="col">Email</th><th scope="col">Status</th><th scope="col">Source</th><th scope="col">Signed up (IST)</th><th scope="col">Confirmed</th><th scope="col">Actions</th></tr></thead><tbody>';
            foreach ($rows as $row) {
                $id = (int) $row['id'];
                $html .= '<tr><td>' . View::e($row['email']) . '</td>'
                    . '<td><span class="adm-pill adm-pill--' . View::e($row['status']) . '">' . View::e(self::SUBSCRIBER_STATUSES[$row['status']] ?? $row['status']) . '</span></td>'
                    . '<td>' . View::e($row['source'] ?? '') . '</td><td>' . View::date($row['created_at']) . '</td><td>' . View::date($row['confirmed_at']) . '</td><td class="adm-actions">'
                    . '<form method="post" action="' . View::url('/subscribers/' . $id . '/resync') . '">' . View::csrfField() . '<button type="submit" class="adm-btn adm-btn--ghost" aria-label="Resync ' . View::e($row['email']) . ' from Buttondown">Resync</button></form>'
                    . '<form method="post" action="' . View::url('/subscribers/' . $id . '/delete') . '" class="adm-inline-danger">' . View::csrfField()
                    . '<label class="adm-check"><input type="checkbox" name="confirm" value="yes" required> <span class="adm-sr">Confirm deleting ' . View::e($row['email']) . '</span>sure</label>'
                    . '<button type="submit" class="adm-btn adm-btn--danger" aria-label="Delete ' . View::e($row['email']) . ' on request">Delete</button></form></td></tr>';
            }
            $html .= '</tbody></table></div>' . self::pager('/subscribers', $filters, $page, $total);
        }
        View::page('Subscribers', $html, '/subscribers');
    }

    public static function subscribersCsv(Ctx $ctx): void
    {
        [$where, $params, $filters] = self::subscriberFilters($ctx);
        $rows = $ctx->rows("SELECT id, email, status, source, created_at, confirmed_at, unsubscribed_at, buttondown_id FROM subscribers {$where} ORDER BY created_at DESC", $params);
        $ctx->audit->log('subscribers.exported', 'subscriber', null, count($rows) . ' rows; filters: ' . json_encode(array_filter($filters)));
        Csv::download('subscribers-' . gmdate('Y-m-d') . '.csv', ['id', 'email', 'status', 'source', 'created_at_utc', 'confirmed_at_utc', 'unsubscribed_at_utc', 'buttondown_id'], $rows);
    }

    private static function findSubscriber(Ctx $ctx, int $id): array
    {
        $rows = $ctx->rows('SELECT * FROM subscribers WHERE id = :id', ['id' => $id]);
        if (!$rows) {
            Session::flash('error', 'That subscriber no longer exists.');
            View::redirect('/subscribers');
        }
        return $rows[0];
    }

    public static function subscriberResync(Ctx $ctx, int $id): void
    {
        $row = self::findSubscriber($ctx, $id);
        $buttondown = new Buttondown($ctx->config);
        if (!$buttondown->configured() || empty($row['buttondown_id'])) {
            Session::flash('error', 'Nothing to resync: Buttondown isn\'t configured or doesn\'t know this subscriber.');
            View::redirect('/subscribers');
        }
        $remote = $buttondown->subscriber((string) $row['buttondown_id']);
        $status = $remote ? Buttondown::statusFromType((string) ($remote['type'] ?? $remote['subscriber_type'] ?? '')) : null;
        if ($status === null) {
            Session::flash('error', "Buttondown didn't return a status for this subscriber.");
            View::redirect('/subscribers');
        }
        $ctx->pdo->prepare(
            "UPDATE subscribers SET status = :s, updated_at = UTC_TIMESTAMP(),
                confirmed_at = IF(:s2 = 'confirmed', COALESCE(confirmed_at, UTC_TIMESTAMP()), confirmed_at),
                unsubscribed_at = IF(:s3 = 'unsubscribed', COALESCE(unsubscribed_at, UTC_TIMESTAMP()), unsubscribed_at)
             WHERE id = :id"
        )->execute(['s' => $status, 's2' => $status, 's3' => $status, 'id' => $id]);
        $ctx->audit->log('subscriber.resync', 'subscriber', $id, $row['status'] . ' → ' . $status);
        Session::flash('success', 'Resynced from Buttondown: ' . (self::SUBSCRIBER_STATUSES[$status] ?? $status) . '.');
        View::redirect('/subscribers');
    }

    public static function subscriberDelete(Ctx $ctx, int $id): void
    {
        $row = self::findSubscriber($ctx, $id);
        if ($ctx->post('confirm') !== 'yes') {
            Session::flash('error', 'Tick the box to confirm the deletion.');
            View::redirect('/subscribers');
        }
        $buttondown = new Buttondown($ctx->config);
        $remote = 'not in Buttondown';
        if (!empty($row['buttondown_id']) && $buttondown->configured()) {
            if (!$buttondown->delete((string) $row['buttondown_id'])) {
                Session::flash('error', "Buttondown didn't confirm the deletion, so nothing was deleted. Try again, or delete it in Buttondown first.");
                View::redirect('/subscribers');
            }
            $remote = 'deleted in Buttondown';
        }
        $ctx->pdo->prepare('DELETE FROM subscribers WHERE id = :id')->execute(['id' => $id]);
        $ctx->audit->log('subscriber.deleted', 'subscriber', $id, 'deleted on request; ' . $remote);
        Session::flash('success', 'Subscriber deleted (' . $remote . ').');
        View::redirect('/subscribers');
    }

    /* ------------------------------------------------------------------ */
    /* Bookings, scans, audit                                              */
    /* ------------------------------------------------------------------ */

    public static function bookings(Ctx $ctx): void
    {
        $show = $ctx->query('show') === 'all' ? 'all' : 'upcoming';
        $rows = $show === 'all'
            ? $ctx->rows('SELECT * FROM bookings ORDER BY start_at DESC, id DESC LIMIT 200')
            : $ctx->rows("SELECT * FROM bookings WHERE start_at >= :now AND status IN ('booked', 'awaiting_payment', 'requested') ORDER BY start_at ASC LIMIT 200", ['now' => gmdate('Y-m-d H:i:s')]);
        $html = '<p class="adm-tabs"><a href="' . View::url('/bookings') . '"' . ($show === 'upcoming' ? ' aria-current="page"' : '') . '>Upcoming</a> <a href="' . View::url('/bookings', ['show' => 'all']) . '"' . ($show === 'all' ? ' aria-current="page"' : '') . '>All</a></p>'
            . '<p class="adm-muted">From the Cal.com webhook (F12). Times in IST.</p>';
        if (!$rows) {
            $html .= '<p>No bookings ' . ($show === 'upcoming' ? 'coming up' : 'yet') . '.</p>';
        } else {
            $html .= '<div class="adm-scroll"><table><thead><tr><th scope="col">Starts</th><th scope="col">Who</th><th scope="col">Email</th><th scope="col">Event</th><th scope="col">Status</th><th scope="col">Paid</th></tr></thead><tbody>';
            foreach ($rows as $row) {
                $price = $row['price'] !== null && $row['currency'] ? number_format(((int) $row['price']) / 100, 2) . ' ' . $row['currency'] : '';
                $html .= '<tr><td>' . View::date($row['start_at']) . '</td><td>' . View::e($row['attendee_name'] ?? '') . '</td><td>' . View::e($row['attendee_email'] ?? '')
                    . '</td><td>' . View::e($row['event_type'] ?? $row['title'] ?? '') . '</td><td><span class="adm-pill adm-pill--' . View::e($row['status']) . '">' . View::e(str_replace('_', ' ', $row['status']))
                    . '</span></td><td>' . ($row['paid'] ? 'Paid ' . View::e($price) : View::e($price === '' ? '—' : 'Not yet · ' . $price)) . '</td></tr>';
            }
            $html .= '</tbody></table></div>';
        }
        View::page('Bookings', $html, '/bookings');
    }

    public static function auditLog(Ctx $ctx): void
    {
        $rows = $ctx->rows('SELECT * FROM audit_log ORDER BY id DESC LIMIT 200');
        $html = '<p class="adm-muted">The last 200 admin actions. Times in IST.</p><div class="adm-scroll"><table><thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">Action</th><th scope="col">Record</th><th scope="col">Details</th></tr></thead><tbody>';
        foreach ($rows as $row) {
            $target = $row['target_type'] ? $row['target_type'] . ($row['target_id'] !== null ? ' #' . $row['target_id'] : '') : '';
            $html .= '<tr><td>' . View::date($row['created_at'], 'j M, H:i:s') . '</td><td>' . View::e($row['username'] ?? '—') . '</td><td>' . View::e($row['action'])
                . '</td><td>' . View::e($target) . '</td><td>' . View::e($row['details'] ?? '') . '</td></tr>';
        }
        View::page('Audit log', $html . '</tbody></table></div>', '/audit');
    }

    /* ------------------------------------------------------------------ */
    /* Settings                                                            */
    /* ------------------------------------------------------------------ */

    public static function settings(Ctx $ctx): void
    {
        $user = $ctx->user;
        $email = Settings::notificationEmail($ctx->config, $ctx->pdo);
        $html = '<div class="adm-grid"><section class="adm-card"><h2>Password</h2><form method="post" action="' . View::url('/settings/password') . '" class="adm-form">' . View::csrfField()
            . '<input type="text" name="username" value="' . View::e($user['username']) . '" autocomplete="username" hidden>'
            . '<label for="f-current">Current password</label><input id="f-current" name="current" type="password" autocomplete="current-password" required>'
            . '<label for="f-new">New password (at least ' . Auth::MIN_PASSWORD . ' characters)</label><input id="f-new" name="password" type="password" autocomplete="new-password" minlength="' . Auth::MIN_PASSWORD . '" required>'
            . '<label for="f-confirm">New password again</label><input id="f-confirm" name="confirm" type="password" autocomplete="new-password" required>'
            . '<button type="submit" class="adm-btn">Change password</button></form></section>';

        $html .= '<section class="adm-card"><h2>Notification email</h2><p class="adm-muted">Contact messages and service enquiries are emailed here.</p><form method="post" action="' . View::url('/settings/email') . '" class="adm-form">' . View::csrfField()
            . '<label for="f-email">Email</label><input id="f-email" name="email" type="email" value="' . View::e($email) . '" required>'
            . '<button type="submit" class="adm-btn">Save</button></form></section>';

        $html .= '<section class="adm-card"><h2>Two-factor sign-in</h2>';
        $pending = $_SESSION['totp_setup'] ?? null;
        if (!empty($user['totp_secret'])) {
            $html .= '<p><span class="adm-pill adm-pill--won">On</span> Sign-in asks for a code from your authenticator app.</p>'
                . '<form method="post" action="' . View::url('/settings/totp/disable') . '" class="adm-form">' . View::csrfField()
                . '<label for="f-dis-pass">Password</label><input id="f-dis-pass" name="current" type="password" autocomplete="current-password" required>'
                . '<label for="f-dis-code">Current code</label><input id="f-dis-code" name="code" inputmode="numeric" autocomplete="one-time-code" required>'
                . '<button type="submit" class="adm-btn adm-btn--danger">Turn off two-factor</button></form>';
        } elseif (is_string($pending)) {
            $html .= '<p>Add this key to your authenticator app (Google Authenticator, 1Password, Authy…), then enter the code it shows.</p>'
                . '<p class="adm-secret"><code>' . View::e(trim(chunk_split($pending, 4, ' '))) . '</code></p>'
                . '<p class="adm-muted adm-break">' . View::e(Totp::uri($pending, (string) $user['username'])) . '</p>'
                . '<form method="post" action="' . View::url('/settings/totp/confirm') . '" class="adm-form">' . View::csrfField()
                . '<label for="f-totp">Code from the app</label><input id="f-totp" name="code" inputmode="numeric" autocomplete="one-time-code" required>'
                . '<button type="submit" class="adm-btn">Turn on two-factor</button></form>';
        } else {
            $html .= '<p><span class="adm-pill adm-pill--lost">Off</span> Recommended: add a code from an authenticator app to every sign-in.</p>'
                . '<form method="post" action="' . View::url('/settings/totp') . '" class="adm-form">' . View::csrfField()
                . '<button type="submit" class="adm-btn">Set up two-factor</button></form>';
        }
        $html .= '</section><section class="adm-card"><h2>Account</h2><dl class="adm-dl"><dt>Username</dt><dd>' . View::e($user['username']) . '</dd>'
            . '<dt>Created</dt><dd>' . View::date($user['created_at']) . ' IST</dd><dt>Last sign-in</dt><dd>' . View::date($user['last_login_at']) . ' IST</dd></dl></section></div>';
        View::page('Settings', $html, '/settings');
    }

    public static function changePassword(Ctx $ctx): void
    {
        $user = $ctx->user;
        if (!password_verify($ctx->post('current'), (string) $user['password_hash'])) {
            $ctx->audit->log('password.failed', 'admin_user', $user['id'], 'wrong current password');
            Session::flash('error', "The current password isn't right.");
            View::redirect('/settings');
        }
        $problem = Auth::passwordProblem($ctx->post('password'), $ctx->post('confirm'));
        if ($problem !== null) {
            Session::flash('error', $problem);
            View::redirect('/settings');
        }
        $ctx->auth->setPassword((int) $user['id'], $ctx->post('password'));
        session_regenerate_id(true);
        $ctx->audit->log('password.changed', 'admin_user', $user['id']);
        Session::flash('success', 'Password changed.');
        View::redirect('/settings');
    }

    public static function changeEmail(Ctx $ctx): void
    {
        $email = trim($ctx->post('email'));
        if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Session::flash('error', "That email address doesn't look right.");
            View::redirect('/settings');
        }
        Settings::set($ctx->pdo, 'notification_email', $email);
        $ctx->audit->log('settings.notification_email', 'setting', 'notification_email', $email);
        Session::flash('success', 'Leads and enquiries now go to ' . $email . '.');
        View::redirect('/settings');
    }

    public static function enableTotp(Ctx $ctx): void
    {
        $_SESSION['totp_setup'] = Totp::newSecret();
        View::redirect('/settings');
    }

    public static function confirmTotp(Ctx $ctx): void
    {
        $secret = $_SESSION['totp_setup'] ?? null;
        $step = is_string($secret) ? Totp::verify($secret, $ctx->post('code')) : null;
        if ($step === null) {
            Session::flash('error', "That code didn't match. Check the key in your app and try again.");
            View::redirect('/settings');
        }
        $ctx->pdo->prepare('UPDATE admin_users SET totp_secret = :s, totp_last_step = :step WHERE id = :id')
            ->execute(['s' => $secret, 'step' => $step, 'id' => $ctx->user['id']]);
        unset($_SESSION['totp_setup']);
        $ctx->audit->log('2fa.enabled', 'admin_user', $ctx->user['id']);
        Session::flash('success', 'Two-factor sign-in is on.');
        View::redirect('/settings');
    }

    public static function disableTotp(Ctx $ctx): void
    {
        $user = $ctx->user;
        $passwordOk = password_verify($ctx->post('current'), (string) $user['password_hash']);
        $step = Totp::verify((string) $user['totp_secret'], $ctx->post('code'), $user['totp_last_step'] !== null ? (int) $user['totp_last_step'] : null);
        if (!$passwordOk || $step === null) {
            $ctx->audit->log('2fa.disable_failed', 'admin_user', $user['id']);
            Session::flash('error', 'The password or the code is wrong.');
            View::redirect('/settings');
        }
        $ctx->pdo->prepare('UPDATE admin_users SET totp_secret = NULL, totp_last_step = NULL WHERE id = :id')->execute(['id' => $user['id']]);
        $ctx->audit->log('2fa.disabled', 'admin_user', $user['id']);
        Session::flash('success', 'Two-factor sign-in is off.');
        View::redirect('/settings');
    }
}
