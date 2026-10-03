-- 001: the tables Stage 1 needs. Times are UTC. IPs are stored only as a keyed hash.

CREATE TABLE IF NOT EXISTS leads (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  created_at DATETIME NOT NULL,
  source VARCHAR(40) NOT NULL,
  intent VARCHAR(40) NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL,
  company VARCHAR(160) NULL,
  timeline VARCHAR(40) NULL,
  topics VARCHAR(400) NULL,
  message TEXT NOT NULL,
  page VARCHAR(200) NULL,
  ip_hash CHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  notes TEXT NULL,
  mail_sent TINYINT(1) NOT NULL DEFAULT 0,
  KEY leads_created (created_at),
  KEY leads_email (email),
  KEY leads_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscribers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  source VARCHAR(40) NULL,
  buttondown_id VARCHAR(64) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  confirmed_at DATETIME NULL,
  unsubscribed_at DATETIME NULL,
  ip_hash CHAR(64) NULL,
  UNIQUE KEY subscribers_email (email),
  KEY subscribers_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket VARCHAR(64) NOT NULL,
  key_hash CHAR(64) NOT NULL,
  window_start INT UNSIGNED NOT NULL,
  hits INT UNSIGNED NOT NULL DEFAULT 0,
  expires_at INT UNSIGNED NOT NULL,
  PRIMARY KEY (bucket, key_hash, window_start),
  KEY rate_limits_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS webhook_events (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  provider VARCHAR(30) NOT NULL,
  event_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(60) NOT NULL,
  received_at DATETIME NOT NULL,
  UNIQUE KEY webhook_events_unique (provider, event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
