CREATE TABLE `external_evo_operation_sync` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `operation_type` VARCHAR(15) NOT NULL,
  `product` VARCHAR(25) NOT NULL,
  `msisdn` VARCHAR(50) NOT NULL,
  `idempotency_key` VARCHAR(200) NOT NULL,
  `payload` LONGTEXT NOT NULL,
  `status` VARCHAR(15) NOT NULL DEFAULT 'PENDING',
  `retry_count` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `last_error` TEXT NULL,
  `next_retry_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_external_evo_idempotency` (`idempotency_key`),
  INDEX `idx_external_evo_status_next` (`status`, `next_retry_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
