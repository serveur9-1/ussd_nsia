CREATE TABLE `external_subscription_sync` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product` VARCHAR(25) NOT NULL,
  `local_reference` VARCHAR(150) NOT NULL,
  `local_subscription_id` BIGINT UNSIGNED NOT NULL,
  `msisdn` VARCHAR(50) NOT NULL,
  `payload` LONGTEXT NOT NULL,
  `status` VARCHAR(15) NOT NULL DEFAULT 'PENDING',
  `retry_count` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `last_error` TEXT NULL,
  `next_retry_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_external_sync_status_next_retry` (`status`, `next_retry_at`),
  INDEX `idx_external_sync_local_reference` (`local_reference`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
