-- =============================================================================
-- JBS: drop all tables EXCEPT `users`, then recreate schema (MySQL / MariaDB)
-- =============================================================================
-- WARNING: Destroys all JBS data, staff API tokens, cache, jobs, etc.
--          Keeps rows in `users` (admin/teacher accounts).
--
-- Run in phpMyAdmin or mysql CLI against your SiteGround database.
-- Backup first.
--
-- After running:
--   - Staff must log in again (Sanctum tokens cleared).
--   - `php artisan migrate` should report "Nothing to migrate" if migrations
--     rows below match your codebase.
--
-- Registration contact fields (public + admin wizards):
--   - UK phone: 11 digits including leading 0 (e.g. 07123456789); +44 accepted
--     in the app and normalized before save.
--   - Email: valid format, max 255 chars; unique per session (jbs_session_id + email).
--   - Full student/guardian profile columns on jbs_student_registrations (see below).
--   - jbs_levels.placement_group: basic_10_12 | basic_teens | advanced |
--     teens_masterclass (NULL = no placement rule).
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Child tables first (order does not matter with FK checks off)
DROP TABLE IF EXISTS `jbs_audit_logs`;
DROP TABLE IF EXISTS `jbs_module_score_outcomes`;
DROP TABLE IF EXISTS `jbs_attempts`;
DROP TABLE IF EXISTS `jbs_questions`;
DROP TABLE IF EXISTS `jbs_tests`;
DROP TABLE IF EXISTS `jbs_attendance_logs`;
DROP TABLE IF EXISTS `jbs_student_registrations`;
DROP TABLE IF EXISTS `jbs_module_assignments`;
DROP TABLE IF EXISTS `jbs_modules`;
DROP TABLE IF EXISTS `jbs_levels`;
DROP TABLE IF EXISTS `jbs_sessions`;
DROP TABLE IF EXISTS `personal_access_tokens`;
DROP TABLE IF EXISTS `password_reset_tokens`;
DROP TABLE IF EXISTS `sessions`;          -- Laravel HTTP sessions (not jbs_sessions)
DROP TABLE IF EXISTS `cache_locks`;
DROP TABLE IF EXISTS `cache`;
DROP TABLE IF EXISTS `failed_jobs`;
DROP TABLE IF EXISTS `job_batches`;
DROP TABLE IF EXISTS `jobs`;
DROP TABLE IF EXISTS `migrations`;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- Laravel infrastructure
-- -----------------------------------------------------------------------------

CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `payload` longtext NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` bigint NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` bigint NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` smallint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint unsigned NOT NULL,
  `name` text NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Ensure users has role column (safe if column already exists — ignore error)
-- Uncomment the next line only if `users` has no `role` column yet:
-- ALTER TABLE `users` ADD COLUMN `role` varchar(32) NOT NULL DEFAULT 'teacher' AFTER `email`;

-- -----------------------------------------------------------------------------
-- Junior Bible School schema
-- -----------------------------------------------------------------------------

CREATE TABLE `jbs_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `registration_opens_at` timestamp NULL DEFAULT NULL,
  `registration_closes_at` timestamp NULL DEFAULT NULL,
  `session_starts_at` timestamp NULL DEFAULT NULL,
  `session_ends_at` timestamp NULL DEFAULT NULL,
  `min_attendance_days` smallint unsigned DEFAULT NULL,
  `is_past` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `jbs_sessions_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `jbs_levels` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `jbs_session_id` bigint unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `placement_group` varchar(40) DEFAULT NULL COMMENT 'basic_10_12|basic_teens|advanced|teens_masterclass',
  `registration_prefix` varchar(255) NOT NULL,
  `next_sequence` int unsigned NOT NULL DEFAULT 0,
  `sort_order` smallint unsigned NOT NULL DEFAULT 0,
  `min_attendance_days` smallint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `jbs_levels_jbs_session_id_sort_order_index` (`jbs_session_id`,`sort_order`),
  CONSTRAINT `jbs_levels_jbs_session_id_foreign` FOREIGN KEY (`jbs_session_id`) REFERENCES `jbs_sessions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `jbs_modules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `jbs_level_id` bigint unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `sort_order` smallint unsigned NOT NULL DEFAULT 0,
  `scheduled_date` date DEFAULT NULL,
  `scheduled_start_time` time DEFAULT NULL,
  `scheduled_end_time` time DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `jbs_modules_jbs_level_id_sort_order_index` (`jbs_level_id`,`sort_order`),
  CONSTRAINT `jbs_modules_jbs_level_id_foreign` FOREIGN KEY (`jbs_level_id`) REFERENCES `jbs_levels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `jbs_module_assignments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `jbs_module_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `jbs_module_assignments_jbs_module_id_unique` (`jbs_module_id`),
  CONSTRAINT `jbs_module_assignments_jbs_module_id_foreign` FOREIGN KEY (`jbs_module_id`) REFERENCES `jbs_modules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `jbs_module_assignments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `jbs_student_registrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `jbs_session_id` bigint unsigned NOT NULL,
  `jbs_level_id` bigint unsigned NOT NULL,
  `registration_number` varchar(255) NOT NULL,
  `first_name` varchar(120) NOT NULL,
  `last_name` varchar(120) NOT NULL,
  `email` varchar(255) NOT NULL COMMENT 'Unique per session; stored lowercase',
  `phone` varchar(11) DEFAULT NULL COMMENT 'UK: 0 + 10 digits',
  `guardian_name` varchar(255) DEFAULT NULL,
  `guardian_relationship` varchar(120) DEFAULT NULL,
  `guardian_phone` varchar(11) DEFAULT NULL COMMENT 'UK: 0 + 10 digits',
  `gender` varchar(20) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `nationality` varchar(120) DEFAULT NULL,
  `address` text,
  `born_again` tinyint(1) NOT NULL DEFAULT 0,
  `date_of_new_birth` date DEFAULT NULL,
  `new_birth_location` varchar(255) DEFAULT NULL,
  `place_of_worship` varchar(255) DEFAULT NULL,
  `place_of_worship_address` varchar(255) DEFAULT NULL,
  `pastor_name` varchar(255) DEFAULT NULL,
  `activity_group` varchar(120) DEFAULT NULL,
  `current_school` varchar(255) DEFAULT NULL,
  `current_school_year` varchar(80) DEFAULT NULL,
  `allergies` text,
  `next_of_kin_name` varchar(255) DEFAULT NULL,
  `registered_after_close` tinyint(1) NOT NULL DEFAULT 0,
  `level_completed` tinyint(1) NOT NULL DEFAULT 0,
  `level_completed_at` timestamp NULL DEFAULT NULL,
  `level_completed_by_user_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `jbs_student_registrations_registration_number_unique` (`registration_number`),
  KEY `jbs_student_registrations_jbs_session_id_jbs_level_id_index` (`jbs_session_id`,`jbs_level_id`),
  UNIQUE KEY `jbs_registrations_session_email_unique` (`jbs_session_id`,`email`),
  CONSTRAINT `jbs_student_registrations_jbs_session_id_foreign` FOREIGN KEY (`jbs_session_id`) REFERENCES `jbs_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `jbs_student_registrations_jbs_level_id_foreign` FOREIGN KEY (`jbs_level_id`) REFERENCES `jbs_levels` (`id`) ON DELETE CASCADE,
  CONSTRAINT `jbs_student_registrations_level_completed_by_user_id_foreign` FOREIGN KEY (`level_completed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `jbs_student_registrations_phone_uk_chk` CHECK (`phone` IS NULL OR `phone` REGEXP '^0[0-9]{10}$'),
  CONSTRAINT `jbs_student_registrations_guardian_phone_uk_chk` CHECK (`guardian_phone` IS NULL OR `guardian_phone` REGEXP '^0[0-9]{10}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `jbs_attendance_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `jbs_student_registration_id` bigint unsigned NOT NULL,
  `attended_on` date NOT NULL,
  `recorded_at` timestamp NULL DEFAULT NULL,
  `recorded_by_user_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `jbs_attendance_registration_day_unique` (`jbs_student_registration_id`,`attended_on`),
  CONSTRAINT `jbs_attendance_logs_jbs_student_registration_id_foreign` FOREIGN KEY (`jbs_student_registration_id`) REFERENCES `jbs_student_registrations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `jbs_attendance_logs_recorded_by_user_id_foreign` FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `jbs_tests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `jbs_module_id` bigint unsigned NOT NULL,
  `status` varchar(32) NOT NULL DEFAULT 'draft',
  `opened_at` timestamp NULL DEFAULT NULL,
  `closed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `jbs_tests_jbs_module_id_unique` (`jbs_module_id`),
  CONSTRAINT `jbs_tests_jbs_module_id_foreign` FOREIGN KEY (`jbs_module_id`) REFERENCES `jbs_modules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `jbs_questions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `jbs_test_id` bigint unsigned NOT NULL,
  `prompt` text NOT NULL,
  `choices` json NOT NULL,
  `correct_indices` json NOT NULL,
  `position` smallint unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `jbs_questions_jbs_test_id_position_index` (`jbs_test_id`,`position`),
  CONSTRAINT `jbs_questions_jbs_test_id_foreign` FOREIGN KEY (`jbs_test_id`) REFERENCES `jbs_tests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `jbs_attempts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `jbs_test_id` bigint unsigned NOT NULL,
  `jbs_student_registration_id` bigint unsigned NOT NULL,
  `answers` json DEFAULT NULL,
  `score` decimal(8,2) DEFAULT NULL,
  `max_score` decimal(8,2) DEFAULT NULL,
  `submitted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `jbs_attempts_test_registration_unique` (`jbs_test_id`,`jbs_student_registration_id`),
  CONSTRAINT `jbs_attempts_jbs_test_id_foreign` FOREIGN KEY (`jbs_test_id`) REFERENCES `jbs_tests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `jbs_attempts_jbs_student_registration_id_foreign` FOREIGN KEY (`jbs_student_registration_id`) REFERENCES `jbs_student_registrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `jbs_module_score_outcomes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `jbs_student_registration_id` bigint unsigned NOT NULL,
  `jbs_module_id` bigint unsigned NOT NULL,
  `score` decimal(8,2) NOT NULL,
  `max_score` decimal(8,2) NOT NULL,
  `source` varchar(16) NOT NULL,
  `jbs_attempt_id` bigint unsigned DEFAULT NULL,
  `admin_confirmed_at` timestamp NULL DEFAULT NULL,
  `admin_confirmed_by_user_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `jbs_score_registration_module_unique` (`jbs_student_registration_id`,`jbs_module_id`),
  CONSTRAINT `jbs_module_score_outcomes_jbs_student_registration_id_foreign` FOREIGN KEY (`jbs_student_registration_id`) REFERENCES `jbs_student_registrations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `jbs_module_score_outcomes_jbs_module_id_foreign` FOREIGN KEY (`jbs_module_id`) REFERENCES `jbs_modules` (`id`) ON DELETE CASCADE,
  CONSTRAINT `jbs_module_score_outcomes_jbs_attempt_id_foreign` FOREIGN KEY (`jbs_attempt_id`) REFERENCES `jbs_attempts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `jbs_module_score_outcomes_admin_confirmed_by_user_id_foreign` FOREIGN KEY (`admin_confirmed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `jbs_audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `actor_name` varchar(255) DEFAULT NULL,
  `user_role` varchar(32) DEFAULT NULL,
  `action` varchar(120) NOT NULL,
  `http_method` varchar(10) DEFAULT NULL,
  `route` varchar(255) DEFAULT NULL,
  `subject_type` varchar(120) DEFAULT NULL,
  `subject_id` bigint unsigned DEFAULT NULL,
  `subject_label` varchar(255) DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'success',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `jbs_audit_logs_created_at_index` (`created_at`),
  KEY `jbs_audit_logs_action_created_at_index` (`action`,`created_at`),
  KEY `jbs_audit_logs_user_id_created_at_index` (`user_id`,`created_at`),
  KEY `jbs_audit_logs_subject_type_subject_id_index` (`subject_type`,`subject_id`),
  CONSTRAINT `jbs_audit_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mark all Laravel migrations as applied (batch 1)
INSERT INTO `migrations` (`migration`, `batch`) VALUES
('0001_01_01_000000_create_users_table', 1),
('0001_01_01_000001_create_cache_table', 1),
('0001_01_01_000002_create_jobs_table', 1),
('2026_05_13_040909_create_personal_access_tokens_table', 1),
('2026_05_13_100000_add_role_to_users_table', 1),
('2026_05_13_100100_create_jbs_sessions_table', 1),
('2026_05_13_100200_create_jbs_levels_table', 1),
('2026_05_13_100300_create_jbs_modules_table', 1),
('2026_05_13_100400_create_jbs_module_assignments_table', 1),
('2026_05_13_100500_create_jbs_student_registrations_table', 1),
('2026_05_13_100600_create_jbs_attendance_logs_table', 1),
('2026_05_13_100700_create_jbs_tests_table', 1),
('2026_05_13_100800_create_jbs_questions_table', 1),
('2026_05_13_100900_create_jbs_attempts_table', 1),
('2026_05_13_101000_create_jbs_module_score_outcomes_table', 1),
('2026_05_16_120000_add_level_completion_to_jbs_student_registrations', 1),
('2026_05_16_130000_add_session_dates_and_attendance_recorded_at', 1),
('2026_05_16_140000_add_schedule_to_jbs_modules', 1),
('2026_05_16_150000_add_unique_session_email_to_jbs_student_registrations', 1),
('2026_05_16_160000_replace_correct_index_with_correct_indices_on_jbs_questions', 1),
('2026_05_16_160000_expand_jbs_registrations_and_level_placement', 1),
('2026_05_17_100000_create_jbs_audit_logs_table', 1);
