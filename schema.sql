-- nsia_assurances.anomalie definition

CREATE TABLE `anomalie` (
  `id_anomalie` int(11) NOT NULL AUTO_INCREMENT,
  `msisdn` varchar(50) COLLATE latin1_general_ci NOT NULL,
  `reference_init` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `new_reference` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `date_modification` date NOT NULL,
  PRIMARY KEY (`id_anomalie`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;


-- nsia_assurances.auto_debit_schedule definition

CREATE TABLE `auto_debit_schedule` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `product` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nom du produit: BLEBLE, IFOH, etc.',
  `subscription_id` bigint(20) unsigned NOT NULL COMMENT 'ID de la souscription',
  `plan` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Objet complet du plan choisi par le client',
  `next_debit_date` datetime NOT NULL COMMENT 'Date et heure du prochain paiement automatique',
  `retry_count` tinyint(3) unsigned NOT NULL DEFAULT '0' COMMENT 'Nombre de tentatives échouées pour le cycle actuel',
  `processing` tinyint(1) DEFAULT NULL COMMENT 'Verroullage pour le cronjob',
  `status` enum('PENDING','PROCESSING','SUCCESS','FAILED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `notified` tinyint(1) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Date de mise à jour du schedule',
  PRIMARY KEY (`id`),
  KEY `idx_next_debit_date` (`next_debit_date`),
  KEY `idx_product` (`product`)
) ENGINE=InnoDB AUTO_INCREMENT=111 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Table de gestion des paiements automatiques pour tous les produits';


-- nsia_assurances.bonus definition

CREATE TABLE `bonus` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `montant` varchar(10) COLLATE latin1_general_ci NOT NULL,
  `produit` varchar(10) COLLATE latin1_general_ci NOT NULL,
  `niveau` int(10) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;


-- nsia_assurances.commission definition

CREATE TABLE `commission` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `montant` varchar(225) CHARACTER SET latin1 COLLATE latin1_general_ci NOT NULL,
  `produit` varchar(50) CHARACTER SET latin1 COLLATE latin1_general_ci NOT NULL,
  `type_merchant` varchar(2) CHARACTER SET latin1 COLLATE latin1_general_ci NOT NULL,
  `type_transaction` varchar(25) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=latin1;


-- nsia_assurances.factures definition

CREATE TABLE `factures` (
  `ID_FACTURE` int(11) NOT NULL AUTO_INCREMENT,
  `REFERENCE` varchar(255) NOT NULL,
  `AMOUNT` varchar(50) NOT NULL,
  `MSISDN` varchar(50) NOT NULL,
  `BILLMAP_TRANSACTION_ID` varchar(50) NOT NULL,
  `EWP_TRANSACTION_ID` varchar(50) NOT NULL,
  `RESPONSE_CODE` varchar(50) NOT NULL,
  `RESPONSE_MESSAGE` varchar(500) NOT NULL,
  `Date_transaction` varchar(15) NOT NULL,
  `prime` varchar(50) CHARACTER SET latin1 COLLATE latin1_general_ci NOT NULL,
  PRIMARY KEY (`ID_FACTURE`)
) ENGINE=MyISAM AUTO_INCREMENT=64888 DEFAULT CHARSET=utf8;


-- nsia_assurances.failed_jobs definition

CREATE TABLE `failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- nsia_assurances.jobs definition

CREATE TABLE `jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint(3) unsigned NOT NULL,
  `reserved_at` int(10) unsigned DEFAULT NULL,
  `available_at` int(10) unsigned NOT NULL,
  `created_at` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- nsia_assurances.merchant definition

CREATE TABLE `merchant` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `noms_prenoms` varchar(100) CHARACTER SET latin1 COLLATE latin1_general_ci NOT NULL,
  `phoneNo` varchar(25) CHARACTER SET latin1 COLLATE latin1_general_ci NOT NULL,
  `commission` varchar(255) CHARACTER SET latin1 COLLATE latin1_general_ci NOT NULL,
  `id_equipe` int(11) NOT NULL,
  `type_merchant` int(11) NOT NULL,
  `status` int(11) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT '2019-08-29 00:00:00',
  `updated_at` timestamp NOT NULL DEFAULT '2019-08-29 00:00:00',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1386 DEFAULT CHARSET=latin1;


-- nsia_assurances.merchant_transactions definition

CREATE TABLE `merchant_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_client` int(11) NOT NULL,
  `id_merchant` int(11) NOT NULL,
  `reference_transaction` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `etat_transaction` varchar(10) COLLATE latin1_general_ci NOT NULL,
  `montant_transaction` varchar(255) COLLATE latin1_general_ci NOT NULL,
  `date_transaction` varchar(10) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5403 DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;


-- nsia_assurances.migrations definition

CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- nsia_assurances.naf_beneficiaires definition

CREATE TABLE `naf_beneficiaires` (
  `ID_BENEFICIAIRE` int(11) NOT NULL AUTO_INCREMENT,
  `NOM_BENEFICIAIRE` varchar(50) NOT NULL,
  `TELEPHONE_BENEFICIAIRE` varchar(50) NOT NULL,
  `TYPE_BENEFICIAIRE` varchar(50) NOT NULL,
  PRIMARY KEY (`ID_BENEFICIAIRE`)
) ENGINE=MyISAM AUTO_INCREMENT=11593 DEFAULT CHARSET=utf8;


-- nsia_assurances.naf_bonus definition

CREATE TABLE `naf_bonus` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `id_merchant_transaction` int(10) NOT NULL,
  `id_merchant` int(10) NOT NULL,
  `montant` int(10) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1164 DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;


-- nsia_assurances.naf_clients definition

CREATE TABLE `naf_clients` (
  `ID_CLIENT` int(11) NOT NULL AUTO_INCREMENT,
  `MSISDN` varchar(50) NOT NULL,
  `GENDER` varchar(50) NOT NULL,
  `BIRTH_DATE` varchar(15) NOT NULL,
  `TITLE` varchar(50) NOT NULL,
  `FIRST_NAME` varchar(50) NOT NULL,
  `LAST_NAME` varchar(50) NOT NULL,
  PRIMARY KEY (`ID_CLIENT`)
) ENGINE=MyISAM AUTO_INCREMENT=11601 DEFAULT CHARSET=utf8;


-- nsia_assurances.naf_paiements definition

CREATE TABLE `naf_paiements` (
  `ID_PAIEMENT` int(11) NOT NULL AUTO_INCREMENT,
  `ID_SOUSCRIPTION` int(11) NOT NULL,
  `MONTANT_PAIEMENT` bigint(20) NOT NULL,
  `DATE_PAIEMENT` date NOT NULL,
  `REFERENCE_PAIEMENT` varchar(100) NOT NULL,
  `ETAT_PAIEMENT` varchar(50) NOT NULL,
  `MSISDN` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`ID_PAIEMENT`)
) ENGINE=MyISAM AUTO_INCREMENT=12546 DEFAULT CHARSET=utf8;


-- nsia_assurances.naf_resiliation definition

CREATE TABLE `naf_resiliation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_souscription` varchar(11) CHARACTER SET latin1 COLLATE latin1_general_ci NOT NULL,
  `msisdn` varchar(20) CHARACTER SET latin1 COLLATE latin1_general_ci NOT NULL,
  `date_resiliation` varchar(10) CHARACTER SET latin1 COLLATE latin1_danish_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=284 DEFAULT CHARSET=latin1;


-- nsia_assurances.naf_retraits definition

CREATE TABLE `naf_retraits` (
  `ID_RETRAIT` int(11) NOT NULL AUTO_INCREMENT,
  `ID_SOUSCRIPTION` int(11) NOT NULL,
  `MONTANT_RETRAIT` bigint(20) NOT NULL,
  `DATE_RETRAIT` date NOT NULL,
  `REFERENCE_RETRAIT` varchar(50) NOT NULL,
  PRIMARY KEY (`ID_RETRAIT`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;


-- nsia_assurances.naf_souscriptions definition

CREATE TABLE `naf_souscriptions` (
  `ID_SOUSCRIPTION` int(11) NOT NULL AUTO_INCREMENT,
  `ID_CLIENT` int(11) NOT NULL,
  `ID_BENEFICIAIRE` int(11) NOT NULL,
  `MONTANT_SOUSCRIPTION` bigint(20) NOT NULL,
  `DATE_SOUSCRIPTION` date NOT NULL,
  `ETAT_SOUSCRIPTION` varchar(50) NOT NULL,
  `REFERENCE_SOUSCRIPTION` varchar(100) NOT NULL,
  `PROCHAIN_PAIEMENT` date NOT NULL,
  `NUMERO_POLICE` varchar(50) DEFAULT NULL,
  `MSISDN` varchar(100) DEFAULT NULL COMMENT 'Colonne pour stocké le numéro au cas où le client fait une opération avec un autre numéro MTN.',
  PRIMARY KEY (`ID_SOUSCRIPTION`)
) ENGINE=MyISAM AUTO_INCREMENT=11598 DEFAULT CHARSET=utf8;


-- nsia_assurances.nep_beneficiaires definition

CREATE TABLE `nep_beneficiaires` (
  `ID_BENEFICIAIRE` int(11) NOT NULL AUTO_INCREMENT,
  `NOM_BENEFICIAIRE` varchar(50) NOT NULL,
  `TELEPHONE_BENEFICIAIRE` varchar(50) NOT NULL,
  `TYPE_BENEFICIAIRE` varchar(50) NOT NULL,
  PRIMARY KEY (`ID_BENEFICIAIRE`)
) ENGINE=MyISAM AUTO_INCREMENT=11166 DEFAULT CHARSET=utf8;


-- nsia_assurances.nep_bonus definition

CREATE TABLE `nep_bonus` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `id_merchant_transaction` int(10) NOT NULL,
  `id_merchant` int(10) NOT NULL,
  `montant` int(10) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=999 DEFAULT CHARSET=latin1 COLLATE=latin1_general_ci;


-- nsia_assurances.nep_clients definition

CREATE TABLE `nep_clients` (
  `ID_CLIENT` int(11) NOT NULL AUTO_INCREMENT,
  `MSISDN` varchar(50) NOT NULL,
  `GENDER` varchar(50) NOT NULL,
  `BIRTH_DATE` varchar(15) NOT NULL,
  `TITLE` varchar(50) NOT NULL,
  `FIRST_NAME` varchar(50) NOT NULL,
  `LAST_NAME` varchar(50) NOT NULL,
  PRIMARY KEY (`ID_CLIENT`)
) ENGINE=MyISAM AUTO_INCREMENT=11162 DEFAULT CHARSET=utf8;


-- nsia_assurances.nep_paiements definition

CREATE TABLE `nep_paiements` (
  `ID_PAIEMENT` int(11) NOT NULL AUTO_INCREMENT,
  `ID_SOUSCRIPTION` int(11) NOT NULL,
  `MONTANT_PAIEMENT` bigint(20) NOT NULL,
  `DATE_PAIEMENT` date NOT NULL,
  `REFERENCE_PAIEMENT` varchar(255) NOT NULL,
  `ETAT_PAIEMENT` varchar(50) NOT NULL,
  `prime` varchar(50) CHARACTER SET latin1 COLLATE latin1_general_ci NOT NULL,
  `MSISDN` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`ID_PAIEMENT`)
) ENGINE=MyISAM AUTO_INCREMENT=28525 DEFAULT CHARSET=utf8;


-- nsia_assurances.nep_retraits definition

CREATE TABLE `nep_retraits` (
  `ID_RETRAIT` int(11) NOT NULL AUTO_INCREMENT,
  `ID_SOUSCRIPTION` int(11) NOT NULL,
  `MONTANT_RETRAIT` bigint(20) NOT NULL,
  `DATE_RETRAIT` date NOT NULL,
  `REFERENCE_RETRAIT` varchar(50) NOT NULL,
  `TYPE_RETRAIT` varchar(255) NOT NULL,
  `MSISDN` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`ID_RETRAIT`)
) ENGINE=MyISAM AUTO_INCREMENT=367 DEFAULT CHARSET=utf8;


-- nsia_assurances.nep_souscriptions definition

CREATE TABLE `nep_souscriptions` (
  `ID_SOUSCRIPTION` int(11) NOT NULL AUTO_INCREMENT,
  `ID_CLIENT` int(11) NOT NULL,
  `ID_BENEFICIAIRE` int(11) NOT NULL,
  `MONTANT_SOUSCRIPTION` bigint(20) NOT NULL,
  `DATE_SOUSCRIPTION` date NOT NULL,
  `ETAT_SOUSCRIPTION` varchar(50) NOT NULL,
  `REFERENCE_SOUSCRIPTION` varchar(100) NOT NULL,
  `PROCHAIN_PAIEMENT` date NOT NULL,
  `NUMERO_POLICE` varchar(50) DEFAULT NULL,
  `MSISDN` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`ID_SOUSCRIPTION`)
) ENGINE=MyISAM AUTO_INCREMENT=11171 DEFAULT CHARSET=utf8;


-- nsia_assurances.nsia_autres_produits definition

CREATE TABLE `nsia_autres_produits` (
  `ID_SOUSCRIPTION` int(11) NOT NULL,
  `NUMERO_POLICE` varchar(50) CHARACTER SET latin1 COLLATE latin1_general_ci NOT NULL,
  `MONTANT` varchar(50) CHARACTER SET latin1 COLLATE latin1_general_ci NOT NULL,
  `NOM_PRODUIT` varchar(50) CHARACTER SET latin1 COLLATE latin1_general_ci NOT NULL,
  `PERIODE_FACTURE` varchar(50) CHARACTER SET latin1 COLLATE latin1_general_ci NOT NULL,
  `ETAT_PAIEMENT` varchar(50) CHARACTER SET latin1 COLLATE latin1_general_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


-- nsia_assurances.password_reset_tokens definition

CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- nsia_assurances.password_resets definition

CREATE TABLE `password_resets` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- nsia_assurances.personal_access_tokens definition

CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=94 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- nsia_assurances.type_merchant definition

CREATE TABLE `type_merchant` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `libelle` varchar(25) CHARACTER SET latin1 COLLATE latin1_general_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;


-- nsia_assurances.upload definition

CREATE TABLE `upload` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `filename` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;


-- nsia_assurances.users definition

CREATE TABLE `users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_group` int(11) NOT NULL,
  `role_level` int(11) NOT NULL,
  `last_login_date` date NOT NULL,
  `activity_flag` int(11) NOT NULL,
  `postname` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;