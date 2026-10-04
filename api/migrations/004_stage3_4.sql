-- 004 (Stage 3 + 4): the scanner, lead magnets, NeuralForge accounts and the
-- site assistant. Times are UTC. IPs are stored only as a keyed hash.

-- F24: one row per "Test my site" request. public_id is the unguessable id in
-- the report URL; results holds the job's report.json.
CREATE TABLE IF NOT EXISTS scans (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  public_id CHAR(24) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  url VARCHAR(500) NOT NULL,
  host VARCHAR(253) NOT NULL,
  email VARCHAR(254) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  passed SMALLINT UNSIGNED NULL,
  failed SMALLINT UNSIGNED NULL,
  signed_off TINYINT(1) NULL,
  results MEDIUMTEXT NULL,
  spec MEDIUMTEXT NULL,
  error VARCHAR(500) NULL,
  run_url VARCHAR(300) NULL,
  lead_id INT UNSIGNED NULL,
  mail_sent TINYINT(1) NOT NULL DEFAULT 0,
  ip_hash CHAR(64) NULL,
  UNIQUE KEY scans_public (public_id),
  KEY scans_created (created_at),
  KEY scans_email (email),
  KEY scans_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- F20/F23/F27: what each lead magnet handed out (the lead itself is in leads).
CREATE TABLE IF NOT EXISTS magnet_requests (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  created_at DATETIME NOT NULL,
  magnet VARCHAR(40) NOT NULL,
  email VARCHAR(254) NOT NULL,
  lead_id INT UNSIGNED NULL,
  newsletter TINYINT(1) NOT NULL DEFAULT 0,
  detail VARCHAR(200) NULL,
  downloads INT UNSIGNED NOT NULL DEFAULT 0,
  ip_hash CHAR(64) NULL,
  KEY magnet_requests_magnet (magnet, created_at),
  KEY magnet_requests_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- F30: NeuralForge accounts (magic-link sign-in, no passwords).
CREATE TABLE IF NOT EXISTS nf_users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  created_at DATETIME NOT NULL,
  last_seen_at DATETIME NULL,
  progress MEDIUMTEXT NULL,
  progress_updated_at DATETIME NULL,
  level SMALLINT UNSIGNED NULL,
  UNIQUE KEY nf_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One-time sign-in links (hash only) and the sessions they open (hash only).
CREATE TABLE IF NOT EXISTS nf_tokens (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  kind VARCHAR(10) NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  KEY nf_tokens_user (user_id),
  KEY nf_tokens_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- F31: every question the site assistant answered, with its eval scores.
CREATE TABLE IF NOT EXISTS ask_log (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  created_at DATETIME NOT NULL,
  question VARCHAR(500) NOT NULL,
  answer TEXT NULL,
  mode VARCHAR(20) NOT NULL,
  grounded DECIMAL(4,3) NULL,
  cited DECIMAL(4,3) NULL,
  retrieval DECIMAL(5,3) NULL,
  refused TINYINT(1) NOT NULL DEFAULT 0,
  input_tokens INT UNSIGNED NULL,
  output_tokens INT UNSIGNED NULL,
  ip_hash CHAR(64) NULL,
  KEY ask_log_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
