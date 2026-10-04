-- 002 (F12): service enquiries and Cal.com bookings. Times are UTC.

-- Enquiries are leads with source = 'service:<slug>'; they also carry a budget range.
ALTER TABLE leads ADD COLUMN budget VARCHAR(40) NULL AFTER timeline;

CREATE TABLE IF NOT EXISTS bookings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  provider VARCHAR(20) NOT NULL DEFAULT 'cal.com',
  booking_uid VARCHAR(100) NOT NULL,
  event_type VARCHAR(100) NULL,
  title VARCHAR(255) NULL,
  status VARCHAR(20) NOT NULL,
  start_at DATETIME NULL,
  end_at DATETIME NULL,
  attendee_name VARCHAR(120) NULL,
  attendee_email VARCHAR(254) NULL,
  attendee_tz VARCHAR(64) NULL,
  -- As Cal.com sends it (the event type's price, in the currency's minor unit)
  price INT UNSIGNED NULL,
  currency CHAR(3) NULL,
  paid TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY bookings_uid (provider, booking_uid),
  KEY bookings_start (start_at),
  KEY bookings_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
