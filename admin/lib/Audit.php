<?php

declare(strict_types=1);

namespace Site\Admin;

use PDO;
use Throwable;

/*
 * audit_log: one row per admin action (sign-ins, changes, exports,
 * deletions, rejected requests). Details never hold the personal data that
 * was changed or deleted, only what happened to which record.
 */
final class Audit
{
    public function __construct(private PDO $pdo, private string $ipHash)
    {
    }

    public function log(string $action, ?string $targetType = null, int|string|null $targetId = null, ?string $details = null): void
    {
        try {
            $this->pdo->prepare(
                'INSERT INTO audit_log (created_at, user_id, username, action, target_type, target_id, details, ip_hash)
                 VALUES (UTC_TIMESTAMP(), :user_id, :username, :action, :type, :id, :details, :ip)'
            )->execute([
                'user_id' => Session::userId(),
                'username' => Session::username(),
                'action' => mb_substr($action, 0, 60),
                'type' => $targetType,
                'id' => $targetId === null ? null : mb_substr((string) $targetId, 0, 64),
                'details' => $details === null ? null : mb_substr($details, 0, 500),
                'ip' => $this->ipHash,
            ]);
        } catch (Throwable $error) {
            error_log('[admin] audit log write failed: ' . $error->getMessage());
        }
    }
}
