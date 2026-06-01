# 📱 Système USSD NSIA Vie Assurances

![Node.js](https://img.shields.io/badge/Runtime-Node.js%2020-339933?style=flat-square&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)
![MySQL](https://img.shields.io/badge/Database-MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white)
![Docker](https://img.shields.io/badge/Deployment-Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

Plateforme complète de gestion, souscription et traitement des produits d'assurance et d'épargne via l'interface USSD pour le réseau MTN Côte d'Ivoire.

---

## 📌 Table des matières

*   [🎯 Vue d'ensemble](#-vue-densemble)
*   [🏗️ Architecture Technique](#%EF%B8%8F-architecture-technique)
*   [🚀 Installation et Configuration](#-installation-et-configuration)
*   [💼 Catalogue Produits](#-catalogue-produits)
*   [📱 Flux USSD Utilisateurs](#-flux-ussd-utilisateurs)
*   [💳 Intégration Paiements](#-intégration-paiements)
*   [⚡ Prélèvements Automatiques (Engine)](#-prélèvements-automatiques-engine)
*   [🔗 API et Webhooks](#-api-et-webhooks)
*   [🔒 Sécurité et Sessions](#-sécurité-et-sessions)
*   [🚢 Déploiement & DevOps](#-déploiement--devops)
*   [🔧 Maintenance et Diagnostics](#-maintenance-et-diagnostics)

---

## 🎯 Vue d'ensemble

La plateforme segmente ses accès et parcours selon deux profils d'utilisateurs distincts :

*   **Espace Clients (`*133*128#`) :** Parcours autonome (Self-care). Souscription directe, versement de primes, consultation du solde/contrat et demandes de rachats.
*   **Espace Marchands / Distributeurs (`*133*148#`) :** Parcours intermédiaires (Commerciaux & Agences). Souscription assistée de clients, gestion et suivi du portefeuille, consultation des commissions cumulées.

---

## 🏗️ Architecture Technique

### Stack Applicatif
*   **Runtime & Logic :** Node.js 20 (LTS) + TypeScript
*   **API Framework :** Express.js
*   **Data Access :** Prisma ORM connecté à une base MySQL
*   **Automation :** `node-cron` pour le moteur de prélèvement
*   **Observabilité :** Winston Logger avec stratégie de rotation journalière

### Structure du Code Source
```text
src/
├── app.ts                  # Bootstrapping de l'application Express
├── server.ts               # Point d'entrée du serveur HTTP
├── constants/              # Menus USSD textuels, arborescences et dictionnaires
├── controllers/            # Gestionnaires des routes et payloads HTTP
├── cron/                   # Daemons et routines de prélèvements programmés
├── lib/                    # Instance et clients tiers (Prisma)
├── middlewares/            # Filtrage CORS, logs d'accès, sécurité
├── repositories/           # Queries et persistance de données (Data Layer)
├── routes/                 # Définition des terminaux API / Webhooks
├── services/               # Cœur des règles métiers (Assurance, Commissions)
├── types/                  # Contrats d'interfaces et types TypeScript
└── utils/                  # Outils d'aide (Validateurs, Formatters)
