<?php

declare(strict_types=1);

/*
 * NeuralForge accounts and progress sync (F30). Served on the NeuralForge
 * subdomain as /api/nf.php (scripts/neuralforge/build.mjs adds a wrapper),
 * so every call is same-origin there.
 *
 *   GET  ?action=token                 a form token for the sign-in form
 *   POST {action: "request", email}    emails a one-time sign-in link (30 min)
 *   POST {action: "verify", login}     exchanges the link's code for a session (180 days)
 *   GET  ?action=progress              (Bearer session) the saved progress
 *   POST {action: "save", progress}    (Bearer session) saves it (≤ 200 KB)
 *   POST {action: "logout"}            (Bearer session) ends this session
 *   POST {action: "delete"}            (Bearer session) deletes the account and progress
 *
 * No passwords. Tokens are random and stored only as SHA-256 hashes.
 */

use Site\Db;
use Site\FormToken;
use Site\Http;
use Site\Mailer;
use Site\RateLimit;
use Site\Validator;

$config = require __DIR__ . '/lib/bootstrap.php';
Http::requireMethod('GET', 'POST');
Http::requireAllowedOrigin($config);

$pdo = $config->hasDatabase() ? Db::tryConnect($config) : null;
if ($pdo === null) {
    Http::error(503, 'unavailable', 'Sync is offline right now. Your progress is still saved in this browser.');
}

$ipHash = Http::ipHash($config, Http::clientIp($config));
$now = gmdate('Y-m-d H:i:s');
$hash = static fn (string $token): string => hash('sha256', $token);

// The session travels in X-NF-Session (Authorization may already carry a
// Basic login, e.g. on the password-protected staging site); Bearer works too.
$session = static fn (): string => Http::header('X-NF-Session') ?: Http::bearerToken();

/** The signed-in user for this request's session, or a 401. */
$requireUser = static function () use ($pdo, $hash, $now, $session): array {
    $token = $session();
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
        Http::error(401, 'signed_out', 'Please sign in again.');
    }
    $statement = $pdo->prepare(
        "SELECT u.* FROM nf_tokens t JOIN nf_users u ON u.id = t.user_id
         WHERE t.token_hash = :h AND t.kind = 'session' AND t.expires_at > :now"
    );
    $statement->execute(['h' => $hash($token), 'now' => $now]);
    $user = $statement->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        Http::error(401, 'signed_out', 'Please sign in again.');
    }
    $pdo->prepare('UPDATE nf_users SET last_seen_at = :now WHERE id = :id')->execute(['now' => $now, 'id' => $user['id']]);
    return $user;
};

$progressOf = static fn (array $user): array => [
    'email' => $user['email'],
    'progress' => $user['progress'] !== null ? json_decode((string) $user['progress'], true) : null,
    'updated_at' => $user['progress_updated_at'] !== null ? gmdate('c', (int) strtotime($user['progress_updated_at'] . ' UTC')) : null,
];

if (Http::method() === 'GET') {
    $action = (string) ($_GET['action'] ?? '');
    if ($action === 'token') {
        Http::json(200, ['ok' => true, 'token' => (new FormToken($config))->issue('nf'), 'min_age' => FormToken::MIN_AGE]);
    }
    if ($action === 'progress') {
        Http::json(200, ['ok' => true] + $progressOf($requireUser()));
    }
    Http::error(400, 'unknown_action', 'Unknown action.');
}

$input = Http::readJson(262144);
$action = (string) ($input['action'] ?? '');

if ($action === 'request') {
    if (trim((string) ($input['website'] ?? '')) !== '') {
        Http::json(200, ['ok' => true]);
    }
    $token = (new FormToken($config))->verify((string) ($input['token'] ?? ''), 'nf');
    if (!$token['valid']) {
        if ($token['reason'] === 'too_new') {
            Http::error(429, 'too_fast', 'One moment…', ['retry_after' => $token['wait']]);
        }
        Http::error(403, 'invalid_token', 'This form expired. Please try again.');
    }
    $validator = new Validator($input);
    $email = $validator->email('email');
    if ($validator->fails()) {
        Http::error(422, 'invalid', 'That email address doesn\'t look right.', ['fields' => $validator->errors()]);
    }
    $limits = new RateLimit($config, $pdo);
    $byIp = $limits->hit('nf-link', $ipHash, [3600 => 6, 86400 => 20]);
    $byEmail = $limits->hit('nf-link-email', $email, [3600 => 3, 86400 => 8]);
    if (!$byIp['allowed'] || !$byEmail['allowed']) {
        Http::error(429, 'rate_limited', 'Too many sign-in emails. Please try again later.', ['retry_after' => max($byIp['retry_after'], $byEmail['retry_after'])]);
    }

    $pdo->prepare('INSERT INTO nf_users (email, created_at) VALUES (:email, :now) ON DUPLICATE KEY UPDATE email = email')->execute(['email' => $email, 'now' => $now]);
    $statement = $pdo->prepare('SELECT id FROM nf_users WHERE email = :email');
    $statement->execute(['email' => $email]);
    $userId = (int) $statement->fetchColumn();
    $code = bin2hex(random_bytes(32));
    $pdo->prepare("INSERT INTO nf_tokens (token_hash, kind, user_id, created_at, expires_at) VALUES (:h, 'login', :u, :now, :exp)")
        ->execute(['h' => $hash($code), 'u' => $userId, 'now' => $now, 'exp' => gmdate('Y-m-d H:i:s', time() + 1800)]);
    // Old, used or expired tokens go now and then.
    if (random_int(1, 20) === 1) {
        $pdo->prepare('DELETE FROM nf_tokens WHERE expires_at < :now')->execute(['now' => $now]);
    }

    $link = rtrim($config->string('neuralforge.url'), '/') . '/?nf_login=' . $code;
    $mailer = new Mailer($config);
    $sent = $mailer->configured() && $mailer->send($email, 'Your NeuralForge sign-in link', implode("\n", [
        'Hi,',
        '',
        'Open this link to sign in to NeuralForge and sync your progress across devices:',
        '',
        $link,
        '',
        'It works once, for 30 minutes. If you didn\'t ask for it, ignore this email: nothing happens without the link.',
        '',
        '— NeuralForge, the SDET → AI Engineer path by Aayush Mishra',
        rtrim($config->string('neuralforge.url'), '/'),
    ]));
    if (!$sent) {
        Http::error(503, 'mail_unavailable', 'The sign-in email couldn\'t be sent right now. Please try again later.');
    }
    Http::json(200, ['ok' => true]);
}

if ($action === 'verify') {
    $code = (string) ($input['login'] ?? '');
    if (!preg_match('/^[a-f0-9]{64}$/', $code)) {
        Http::error(400, 'invalid_link', 'This sign-in link isn\'t valid.');
    }
    $limit = (new RateLimit($config, $pdo))->hit('nf-verify', $ipHash, [3600 => 20]);
    if (!$limit['allowed']) {
        Http::error(429, 'rate_limited', 'Too many attempts. Please try again later.', ['retry_after' => $limit['retry_after']]);
    }
    $pdo->beginTransaction();
    $statement = $pdo->prepare("SELECT * FROM nf_tokens WHERE token_hash = :h AND kind = 'login' FOR UPDATE");
    $statement->execute(['h' => $hash($code)]);
    $login = $statement->fetch(PDO::FETCH_ASSOC);
    if (!$login || $login['used_at'] !== null || $login['expires_at'] <= $now) {
        $pdo->rollBack();
        Http::error(410, 'expired_link', 'This sign-in link has expired or was already used. Ask for a new one.');
    }
    $pdo->prepare('UPDATE nf_tokens SET used_at = :now WHERE token_hash = :h')->execute(['now' => $now, 'h' => $login['token_hash']]);
    $session = bin2hex(random_bytes(32));
    $pdo->prepare("INSERT INTO nf_tokens (token_hash, kind, user_id, created_at, expires_at) VALUES (:h, 'session', :u, :now, :exp)")
        ->execute(['h' => $hash($session), 'u' => $login['user_id'], 'now' => $now, 'exp' => gmdate('Y-m-d H:i:s', time() + 180 * 86400)]);
    $pdo->commit();
    $statement = $pdo->prepare('SELECT * FROM nf_users WHERE id = :id');
    $statement->execute(['id' => $login['user_id']]);
    $user = $statement->fetch(PDO::FETCH_ASSOC);
    $pdo->prepare('UPDATE nf_users SET last_seen_at = :now WHERE id = :id')->execute(['now' => $now, 'id' => $login['user_id']]);
    Http::json(200, ['ok' => true, 'session' => $session] + $progressOf($user));
}

if ($action === 'save') {
    $user = $requireUser();
    $progress = $input['progress'] ?? null;
    if (!is_array($progress) || array_is_list($progress)) {
        Http::error(422, 'invalid', 'Progress must be an object.');
    }
    $json = json_encode($progress, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || strlen($json) > 200000) {
        Http::error(413, 'payload_too_large', 'That progress is too large to sync.');
    }
    $limit = (new RateLimit($config, $pdo))->hit('nf-save', 'user:' . $user['id'], [60 => 12, 86400 => 2000]);
    if (!$limit['allowed']) {
        Http::error(429, 'rate_limited', 'Saving too often. It will sync in a moment.', ['retry_after' => $limit['retry_after']]);
    }
    $level = is_array($progress['completed'] ?? null) ? count($progress['completed']) : null;
    $pdo->prepare('UPDATE nf_users SET progress = :p, progress_updated_at = :now, level = :level WHERE id = :id')
        ->execute(['p' => $json, 'now' => $now, 'level' => $level, 'id' => $user['id']]);
    Http::json(200, ['ok' => true, 'updated_at' => gmdate('c', (int) strtotime($now . ' UTC'))]);
}

if ($action === 'logout') {
    $requireUser();
    $pdo->prepare("DELETE FROM nf_tokens WHERE token_hash = :h AND kind = 'session'")->execute(['h' => $hash($session())]);
    Http::json(200, ['ok' => true]);
}

if ($action === 'delete') {
    $user = $requireUser();
    $pdo->prepare('DELETE FROM nf_tokens WHERE user_id = :id')->execute(['id' => $user['id']]);
    $pdo->prepare('DELETE FROM nf_users WHERE id = :id')->execute(['id' => $user['id']]);
    Http::json(200, ['ok' => true]);
}

Http::error(400, 'unknown_action', 'Unknown action.');
