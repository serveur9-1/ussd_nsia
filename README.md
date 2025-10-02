# Documentation Système USSD NSIA Vie Assurances

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture technique](#architecture-technique)
3. [Installation et configuration](#installation-et-configuration)
4. [Produits d'assurance](#produits-dassurance)
5. [Flux USSD Customer](#flux-ussd-customer)
6. [Flux USSD Merchant](#flux-ussd-merchant)
7. [Services de paiement](#services-de-paiement)
8. [Système de prélèvement automatique](#système-de-prélèvement-automatique)
9. [API et Webhooks](#api-et-webhooks)
10. [Base de données](#base-de-données)
11. [Logs et monitoring](#logs-et-monitoring)
12. [Sécurité](#sécurité)
13. [Gestion des erreurs](#gestion-des-erreurs)
14. [Déploiement](#déploiement)
15. [Maintenance et administration](#maintenance-et-administration)
16. [Annexes](#annexes)

---

## 🎯 Vue d'ensemble

Le système USSD NSIA Vie Assurances est une plateforme complète permettant aux clients et marchands de gérer les produits d'assurance et d'épargne via l'interface USSD.

### Types d'utilisateurs
- **Clients** (`*133*128#`) : Souscription directe, paiement de primes, consultation de contrats, retraits
- **Marchands/Distributeurs** (`*133*148#`) : Souscription de clients, gestion des commissions, suivi des ventes

### Produits disponibles
- **BlèBlè** : Épargne capitalisée (5 ans, 3,5% d'intérêt, frais d'adhésion 2 500 FCFA)
- **IFOH** : Assurance décès (250 000 FCFA de couverture, cotisation 1 000 FCFA/mois)
- **Autres produits NSIA** : Gestion des factures impayées

---

## 🏗️ Architecture technique

### Stack technologique
```
├── Runtime: Node.js 20 + TypeScript
├── Framework: Express.js
├── ORM: Prisma (MySQL)
├── Logs: Winston + rotation quotidienne
├── Cron: node-cron (prélèvements automatiques)
├── Paiements: MTN Mobile Money API
└── SMS: Service NSIA Vie
```

### Structure du projet
```
src/
├── app.ts                      # Configuration Express
├── server.ts                   # Point d'entrée
├── constants/                  # Menus USSD et plans
├── controllers/                # Contrôleurs HTTP
├── cron/                       # Tâches automatisées
├── lib/                        # Configuration Prisma
├── middlewares/                # Middlewares Express
├── repositories/               # Couche d'accès aux données
├── routes/                     # Routes API
├── services/                   # Services métier
├── types/                      # Types TypeScript
└── utils/                      # Utilitaires
```

---

## 🚀 Installation et configuration

### Prérequis
- Node.js 20+
- MySQL
- Accès API MTN Mobile Money

### Installation
```bash
# Clonage et installation
git clone <repository>
cd <name>
npm install

# Configuration base de données
npx prisma db pull
npx prisma generate

# Développement
npm run dev

# Production
npm run build
npm start
```

### Variables d'environnement
```env
# Base de données
DATABASE_URL="mysql://user:password@localhost:port/name"

# Serveur
PORT=8080

# MTN Mobile Money
BILLING_URL="https://api.mtn.ci/billing"
SERVICE_CODE="NSIA_CODE"
PASSWORD="billing_password"

# SMS NSIA Vie
SMS_NASIAVIE_BASE_URL="https://sms.nsiavie.ci"
SMS_NASIAVIE_ENDPOINT="/api/send"
SMS_NASIAVIE_APIKEY="api_key"
SMS_NASIAVIE_PROVENANCE="NSIAVIE"
SMS_NASIAVIE_MODETRANSMISSION=1
SMS_NASIAVIE_SENDERSOURCE="NSIA"
```

---

## 💼 Produits d'assurance

### BlèBlè (Épargne capitalisée)

**Caractéristiques :**
- Épargne capitalisée sur 5 ans
- Taux d'intérêt : 3,5%
- Frais d'adhésion : 2 500 FCFA
- Âge minimum : 18 ans

**Plans de paiement :**

| Plan | Période | Montant | Frais | Prélèvement auto |
|------|---------|---------|-------|------------------|
| 1 | Hebdomadaire | 1 500 FCFA | 150 FCFA | Non |
| 2 | Mensuel (opt.1) | 5 000 FCFA | 500 FCFA | Oui |
| 3 | Mensuel (opt.2) | 10 000 FCFA | 1 000 FCFA | Oui |
| 4 | Libre | Variable | 10% | Non |

**Fonctionnalités :**
- Rachat partiel (après 12 mois, min 60 000 FCFA épargné)
- Rachat total (conditions identiques)
- Maximum 85% du solde pour rachat partiel

### IFOH (Assurance décès)

**Caractéristiques :**
- Couverture : 250 000 FCFA en cas de décès
- Frais d'adhésion : 1 000 FCFA
- Cotisation mensuelle : 1 000 FCFA
- Bénéficiaires : Conjoint, Parents, Enfants (conditions d'âge)

**Plans de paiement :**

| Plan | Période | Montant | Frais | Prélèvement auto |
|------|---------|---------|-------|------------------|
| 1 | Mensuel | 1 000 FCFA | 0 FCFA | Oui |
| 2 | Trimestriel | 3 000 FCFA | 0 FCFA | Non |
| 3 | Annuel | 12 000 FCFA | 0 FCFA | Non |

---

## 📱 Flux USSD Customer

### Code d'accès : `*133*128#`

### Menu principal
```
NSIA Vie ASSURANCES
1. BlèBlè
2. IFOH
3. AUTRES PRODUITS NSIA ASSURANCES VIE
```

### Navigation générale
- `00` : Retour au menu principal
- `0` : Retour étape précédente
- Timeout de session : 60 secondes

### Flux BlèBlè

#### Souscription BlèBlè
1. **Données personnelles** → Nom, prénom, date de naissance
2. **Vérification âge** → Minimum 18 ans requis
3. **Bénéficiaire** → Nom, prénom, téléphone
4. **Choix du plan** → Sélection formule de paiement
5. **Confirmation** → Validation et paiement MTN MoMo
6. **Création** → Compte et contrat avec prélèvement automatique

#### Paiement de prime
1. **Identification** → Numéro de téléphone
2. **Sélection plan** → Choix formule de paiement
3. **Vérification échéance** → Contrôle date prochain paiement
4. **Configuration prélèvement** → Options automatiques (plans éligibles)
5. **Confirmation** → Validation et traitement paiement

#### Consultation contrat
1. **Identification** → Numéro de téléphone
2. **Vérification** → Date de naissance
3. **Affichage statut** → Actif, inactif, résilié, solde disponible

#### Retraits (partiel/total)
1. **Conditions** → Vérification 12 mois cotisation + 60 000 FCFA minimum
2. **Éligibilité** → Contrôle solde et historique retraits
3. **Montant** → Saisie montant (max 85% pour partiel)
4. **Traitement** → Génération demande retrait (traitement en 15 jours)

### Flux IFOH

#### Souscription
1. **Données personnelles** → Nom, prénom, date de naissance
2. **Assuré associé** → Choix relation (conjoint/parent/enfant)
3. **Vérification conditions d'âge** → Selon type de relation
4. **Informations associé** → Nom, prénom, téléphone
5. **Paiement** → Initiation souscription (1 000 FCFA)

#### Paiement de prime
1. **Identification** → Numéro de téléphone
2. **Plan** → Sélection formule (mensuel/trimestriel/annuel)
3. **Vérification échéance** → Contrôle date prochain paiement
4. **Confirmation** → Traitement paiement

#### Autres fonctionnalités
- **Consultation couverture** → Statut actif/inactif et échéances
- **Résiliation** → Annulation contrat avec perte des cotisations
- **Informations** → Documents requis en cas de décès, points agréés

---

## 📱 Flux USSD Merchant

### Code d'accès : `*133*148#`

### Authentification
Le système vérifie automatiquement si le numéro appelant est enregistré comme distributeur/commercial dans la base de données.

### Menu principal
```
NSIA Vie ASSURANCES
1. BlèBlè
2. IFOH
3. Consultation de ma commission
```

### Souscription client (BlèBlè/IFOH)
1. **Identification client** → Numéro de téléphone
2. **Données client** → Nom, prénom, date naissance
3. **Bénéficiaire** → Informations selon produit
4. **Choix du plan** → Sélection formule de paiement
5. **Confirmation** → Validation et paiement
6. **Paiement** → Initiation avec référence merchant
7. **Commission** → Calcul et attribution automatique

### Paiement prime client
1. **Identification client** → Numéro téléphone du client
2. **Vérification souscription** → Contrôle contrat actif
3. **Sélection plan** → Formules disponibles
4. **Configuration** → Options prélèvement automatique
5. **Commission** → Attribution selon grille tarifaire

### Consultation commission
Affichage du total des commissions accumulées à date pour le distributeur.

### Système de commissions

#### Types de merchant
- **Type 1** : Distributeur
- **Type 2** : Commercial

#### Attribution automatique
- Commission calculée selon le type de merchant et le type de transaction
- Bonus progressif selon le nombre de souscriptions (étapes 3 et 5)
- Mise à jour automatique du total des commissions

---

## 💳 Services de paiement

### MTN Mobile Money

#### Configuration
```typescript
const BILLING_URL = process.env.BILLING_URL!;
const serviceCode = process.env.SERVICE_CODE!;
const password = process.env.PASSWORD!;
```

#### Processus de paiement
1. **Initiation** → Appel API MTN avec référence unique
2. **Traitement** → Vérification et validation côté MTN
3. **Notification** → Webhook de confirmation
4. **Mise à jour** → Statut transaction et prochaines échéances

#### Codes de retour
| Code | Signification |
|------|---------------|
| `1000` | Transaction initiée avec succès |
| `01` | Transaction réussie |
| `100` | Conditions non remplies |
| `529` | Solde insuffisant |
| `515` | Compte MoMo inactif |
| `00` | Contrat résilié |

#### Génération des références
```typescript
// Format : MQASH_{MSISDN}_{PRODUIT}_{ACTION}_{TIMESTAMP}
// Exemple : MQASH_0500000000_NEP_PAY-1-MONTH_20241201120000
```

### Gestion des plans
- **Customer** : Plans standard
- **Merchant** : Plans avec suffixe `-DIS` pour distinction

### Service SMS
Configuration pour notifications automatiques :
- Confirmations de souscription
- Notifications de prélèvement (J-1)
- Alertes diverses aux clients

---

## ⚡ Système de prélèvement automatique

### Architecture
```typescript
// Table auto_debit_schedule
{
  id: BigInt,
  product: 'BLEBLE' | 'IFOH',
  subscription_id: number,
  plan: JSON, // Plan complet sérialisé
  next_debit_date: DateTime,
  retry_count: number, // Maximum 5 tentatives
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED',
  notified: boolean, // SMS envoyé
  processing: boolean // Verrou traitement
}
```

### Cron Jobs

#### 1. Notifications (quotidien)
```typescript
schedule('* * * * *', async () => {
    await notifyAutoDebits()
});
```

**Fonctionnement :**
- Recherche des prélèvements prévus J-1
- Envoi SMS de notification
- Marquage comme notifié

#### 2. Traitement (quotidien)
```typescript
schedule('* * * * *', async () => {
    await processAutoDebits()
});
```

**Fonctionnalités :**
- Traitement des prélèvements programmés
- Maximum 5 tentatives par cycle
- Report automatique de 24h en cas d'échec
- Création nouveau cycle après échec maximum
- Mise à jour statuts (`SUCCESS`, `FAILED`, `PENDING`)

### Fréquences supportées
- **weekly** : Hebdomadaire
- **monthly** : Mensuel
- **yearly** : Annuel

---

## 🔗 API et Webhooks

### Endpoints Customer
```
GET /mtnnsiamqash/mqash
?sessionid={id}&input={input}&msisdn={phone}&extension=128

POST /mtnnsiamqash/getBill
{
  "Reference": "MQASH_0500000000_NEP_SOUS_20241201120000"
}

POST /mtnnsiamqash/InstantPaymentNotificationService
{
  "Reference": "MQASH_...",
  "Amount": "2500.00",
  "MSISDN": "0500000000",
  "ResponseCode": "01",
  "BillMapTransactionId": "...",
  "EWPTransactionId": "...",
  "ResponseMessage": "Success"
}
```

### Endpoints Merchant
```
GET /mqashmtnnsiadis/mqash
?sessionid={id}&input={input}&msisdn={phone}&extension=148

POST /mqashmtnnsiadis/getBill
POST /mqashmtnnsiadis/InstantPaymentNotificationService
```

### Logique des Webhooks
1. **Réception notification** → Parsing des paramètres
2. **Validation référence** → Vérification format et existence
3. **Traitement selon code** :
   - `01` : Succès → Mise à jour statuts et échéances
   - Autres : Échec → Programmation retry ou abandon
4. **Gestion commissions** → Attribution automatique pour merchants
5. **Prélèvement automatique** → Configuration cycle suivant

---

## 🗄️ Base de données

### Tables principales

#### Clients et souscriptions
- `nep_clients` / `naf_clients` : Informations clients (BlèBlè/IFOH)
- `nep_souscriptions` / `naf_souscriptions` : Contrats d'assurance
- `nep_beneficiaires` / `naf_beneficiaires` : Bénéficiaires désignés

#### Paiements et transactions  
- `nep_paiements` / `naf_paiements` : Historique des paiements
- `nep_retraits` : Retraits BlèBlè (partiel/total)
- `factures` : Journal de toutes les transactions
- `merchant_transactions` : Transactions effectuées par les merchants

#### Système merchant
- `merchant` : Informations distributeurs et commerciaux
- `commission` : Grille tarifaire des commissions
- `bonus` : Configuration système de bonus
- `nep_bonus` / `naf_bonus` : Attribution des bonus

#### Prélèvement automatique
- `auto_debit_schedule` : Planification des prélèvements
- `naf_resiliation` : Historique résiliations IFOH

#### Autres produits
- `nsia_autres_produits` : Autres produits NSIA avec factures impayées

### Relations clés
```sql
-- Flux principal client -> souscription -> paiements
nep_clients.ID_CLIENT → nep_souscriptions.ID_CLIENT
nep_souscriptions.ID_SOUSCRIPTION → nep_paiements.ID_SOUSCRIPTION

-- Prélèvement automatique
auto_debit_schedule.subscription_id → {nep|naf}_souscriptions.ID_SOUSCRIPTION

-- Système merchant
merchant.id → merchant_transactions.id_merchant
merchant_transactions.reference_transaction → {nep|naf}_paiements.REFERENCE_PAIEMENT
```

---

## 📊 Logs et monitoring

### Configuration Winston
```typescript
// Logs avec rotation quotidienne
// Rétention : 182 jours (6 mois)
// Séparation : application et requêtes HTTP
```

### Structure des fichiers
- `logs/app/app-{DATE}.log` : Logs applicatifs
- `logs/requests/access-{DATE}.log` : Logs requêtes HTTP

### Niveaux de logs
- **ERROR** : Erreurs système critiques
- **WARN** : Avertissements et situations dégradées
- **INFO** : Informations générales et flux métier
- **DEBUG** : Détails techniques pour débogage

### Logs clés à surveiller
```typescript
// Activité USSD
[CUSTOMER][PROGRESS] MSISDN: xxx | Step: xxx | Response: xxx
[MERCHANT][PROGRESS] MSISDN: xxx | Step: xxx | Response: xxx

// Paiements
[IPN_RECEIVED] {reference, msisdn, responseCode}
[TRANSACTION_SUCCESS] {reference}
[TRANSACTION_FAILED] {reference, responseCode, responseMessage}

// Prélèvements automatiques
[AUTODEBIT_SUCCESS] {id: debit.id}
[AUTODEBIT_ERROR] {id: debit.id, error}
[AUTODEBIT_NOTIFY_SUCCESS] {id: debit.id}
```

---

## 🔒 Sécurité

### Authentification
- **Customer** : Validation par numéro téléphone + date de naissance
- **Merchant** : Vérification statut distributeur en base de données

### Validation des données
```typescript
// Numéro de téléphone : format 10 chiffres exactement
validationPhoneNumber(input)

// Montant : entier positif avec minimums selon produit
validationAmount(input) 

// Date : format strict JJ/MM/AAAA avec vérification calendaire
validationDate(input)

// Nom : minimum 2 parties, caractères alphabétiques uniquement
validationName(input)
```

### Sécurité paiements
- Références uniques horodatées pour éviter les doublons
- Double vérification statut transaction (initiation + confirmation)
- Codes de vérification MTN Mobile Money

### Protection des données
- Masquage automatique des entrées sensibles dans les logs
- Chiffrement des communications API
- Validation CORS stricte sur endpoints sensibles
- Pas de stockage des données sensibles côté client

### Gestion des sessions
- Timeout automatique : 60 secondes d'inactivité
- Nettoyage automatique des sessions expirées
- Validation cohérence MSISDN/SessionID pour éviter les hijacks
- Historique de navigation pour fonction "retour"

### Configuration CORS
```typescript
const allowedOrigins = [
    "https://billmap.mtn.ci:8443", // API MTN Mobile Money uniquement
];
```

---

## ⚠️ Gestion des erreurs

### Codes d'erreur USSD

| Code | Contexte | Message affiché |
|------|----------|-----------------|
| `globalError` | Erreur système | "Une erreur est survenue. Veuillez reprendre la session." |
| `chooseInvalide` | Choix invalide | "Choix invalide. [Menu précédent]" |
| `thankContact` | Information contact | "Nous vous remercions de prendre contact avec nous au 22419800/20319898." |

### Validation des données

#### Numéro de téléphone
```typescript
// Règles de validation strictes
- Format: 10 chiffres exactement
- Préfixes acceptés: tous opérateurs ivoiriens
- Nettoyage automatique: suppression espaces et indicatifs internationaux
- Exemple valide: "0500000000"
```

#### Date de naissance
```typescript
// Format: JJ/MM/AAAA
// Validations complètes:
- Format strict DD/MM/YYYY
- Vérification calendaire (29/02 années bissextiles)
- Calcul d'âge automatique et précis
- Contrôle âge minimum/maximum selon produit
```

#### Montants
```typescript
// Règles métier:
- Entiers positifs uniquement (pas de décimales)
- Minimum selon produit (100 FCFA pour montants libres)
- Maximum selon solde disponible (pour les retraits)
- Calcul automatique des frais selon le plan choisi
```

### Gestion des sessions

#### Timeout et nettoyage
```typescript
const SESSION_TIMEOUT = 60 * 1000; // 60 secondes

// Vérifications automatiques à chaque requête:
- Expiration de session
- Cohérence MSISDN/SessionID  
- Nettoyage automatique des sessions expirées
- Réinitialisation en cas d'incohérence
```

#### Navigation
```typescript
// Commandes spéciales universelles:
"00" // Retour immédiat au menu principal
"0"  // Retour à l'étape précédente
"__REPEAT__" // Répéter l'étape courante (usage interne uniquement)
```

---

## 🚢 Déploiement

### Localisation sur le serveur

Le projet est déployé sur le serveur dans l'arborescence suivante :
```
/home/devops/akili/
├── nsia/
│   └── ussd-js-server/          # Code source du projet
└── docker-compose.yml           # Configuration Docker Compose
```

**Chemin principal :** `/home/devops/akili/nsia/ussd-js-server`

### Processus de mise à jour et déploiement

#### Étapes complètes de mise à jour
```bash
# 1. Accéder au dossier du projet
cd /home/devops/akili/nsia/ussd-js-server

# 2. Récupérer les dernières modifications
git pull origin master

# 3. Arrêter le conteneur en cours
docker stop mqashgroup_ussdjs

# 4. Supprimer le conteneur
docker rm mqashgroup_ussdjs

# 5. Supprimer l'ancienne image
docker rmi akili-ussdjs

# 6. Revenir au dossier racine Docker Compose
cd /home/devops/akili

# 7. Rebuilder et redémarrer le service
DOCKER_BUILDKIT=1 docker compose build --no-cache ussdjs && docker compose up -d ussdjs
```

### Environnements

#### Développement
```bash
NODE_ENV=development
PORT=8080
DATABASE_URL="mysql://dev_user:password@localhost:3306/nsia_ussd_dev"
```

#### Production
```bash
NODE_ENV=production
PORT=8080
DATABASE_URL="mysql://prod_user:password@prod-db:3306/nsia_ussd_prod"
```

## 🔧 Maintenance et administration

### Commandes de diagnostic

#### Logs en temps réel
```bash
# Surveillance globale
tail -f logs/app/app-$(date +%Y-%m-%d).log

# Paiements uniquement
tail -f logs/app/app-$(date +%Y-%m-%d).log | grep "IPN"

# Erreurs système
tail -f logs/app/app-$(date +%Y-%m-%d).log | grep "ERROR"

# Prélèvements automatiques
grep "AUTODEBIT" logs/app/*.log

# Sessions USSD
grep -E "\[(CUSTOMER|MERCHANT)\]\[(NEW SESSION|PROGRESS)\]" logs/app/*.log
```

#### Statistiques base de données
```sql
-- Souscriptions BlèBlè aujourd'hui
SELECT COUNT(*) FROM nep_souscriptions 
WHERE DATE(DATE_SOUSCRIPTION) = CURDATE();

-- Paiements BlèBlè réussis aujourd'hui
SELECT COUNT(*) FROM nep_paiements 
WHERE ETAT_PAIEMENT = '01' AND DATE(DATE_PAIEMENT) = CURDATE();

-- Souscriptions IFOH aujourd'hui
SELECT COUNT(*) FROM naf_souscriptions 
WHERE DATE(DATE_SOUSCRIPTION) = CURDATE();

-- Paiements IFOH réussis aujourd'hui
SELECT COUNT(*) FROM naf_paiements 
WHERE ETAT_PAIEMENT = '01' AND DATE(DATE_PAIEMENT) = CURDATE();

-- Prélèvements en échec (à surveiller)
SELECT COUNT(*) FROM auto_debit_schedule 
WHERE status = 'FAILED' AND retry_count >= 5;

-- Top 10 des erreurs paiement
SELECT RESPONSE_CODE, COUNT(*) as total 
FROM factures 
WHERE DATE(Date_transaction) = CURDATE() AND RESPONSE_CODE != '01'
GROUP BY RESPONSE_CODE 
ORDER BY total DESC 
LIMIT 10;
```

### Tâches de maintenance régulières

#### Quotidiennes
- Vérification des logs d'erreur
- Contrôle des prélèvements automatiques en échec
- Surveillance de l'espace disque (logs)

#### Hebdomadaires
- Nettoyage des sessions expirées anciennes
- Analyse des statistiques de paiement
- Vérification de la cohérence des données

#### Mensuelles
- Archive/nettoyage des logs anciens (> 6 mois)
- Analyse des performances et optimisation BDD
- Mise à jour des dépendances de sécurité

### Alertes recommandées
- Taux d'échec paiements > 10% sur 1 heure
- Prélèvements automatiques en échec > 50 par jour
- Erreurs système > 5% du trafic total
- Espace disque < 10% disponible
- API MTN indisponible > 5 minutes consécutives
- Sessions USSD avec timeout > 30% sur 1 heure

---

## 📖 Annexes

### Codes USSD opérateurs

#### MTN Côte d'Ivoire
- **Interface Customer** : `*133*128#`
- **Interface Merchant** : `*133*148#`

### Contacts support
- **Support technique** : 22419800
- **Support commercial** : 20319898

### Ressources techniques

#### Documentation externe
- [Prisma ORM](https://prisma.io/docs) - ORM et migrations
- [Winston Logging](https://github.com/winstonjs/winston) - Système de logs
- [Node-cron](https://github.com/node-cron/node-cron) - Tâches automatisées
- [Express.js](https://expressjs.com/) - Framework web

#### Standards et formats
- **Format téléphone** : 10 chiffres (ex: 0500000000)
- **Format date** : JJ/MM/AAAA (ex: 15/03/1990)
- **Format référence** : MQASH_{MSISDN}_{PRODUIT}_{ACTION}_{TIMESTAMP}
- **Codes pays** : +225 (Côte d'Ivoire)

### Glossaire

| Terme | Définition |
|-------|------------|
| **BlèBlè** | Produit d'épargne capitalisée de NSIA Vie |
| **IFOH** | Produit d'assurance décès de NSIA Vie |
| **MoMo** | MTN Mobile Money (service de paiement mobile) |
| **IPN** | Instant Payment Notification (webhook de paiement) |
| **Merchant** | Distributeur ou commercial partenaire |
| **Retry** | Nouvelle tentative de prélèvement automatique |
| **Session timeout** | Expiration automatique d'une session USSD |

---

*Documentation générée le {{ date }} - Version 1.0*