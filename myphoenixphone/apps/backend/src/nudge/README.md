# Orange SMS Nudge Service

## Vue d'ensemble

Le service **Nudge SMS** permet d'envoyer des campagnes SMS aux leads dormants via l'API **Orange Contact Everyone**.

### Fonctionnalités

- ✅ **Lead ID Tracking**: Génération d'UUID uniques pour tracer chaque lead
- ✅ **SMS Sending**: Intégration avec Orange Contact Everyone API
- ✅ **Throttling**: Contrôle du débit d'envoi (max_per_hour, batch_size)
- ✅ **Templates**: Support des variantes A/B/C/D de messages
- ✅ **Contact Tracking**: Enregistrement des tentatives dans `ContactAttempt`
- ✅ **Mock Mode**: Simulation d'envoi en développement

---

## Architecture

### Services créés

1. **`LeadTrackingService`** (`apps/backend/src/nudge/lead-tracking.service.ts`)
   - `generateLeadId()`: Génère un UUID v4
   - `associateLeadWithCampaign(leadId, msisdnHash, campaignId)`: Associe un lead ID à un msisdn et une campagne
   - `getLeadByLeadId(leadId)`: Récupère le lead à partir de son UUID

2. **`OrangeSmsService`** (`apps/backend/src/nudge/sms.service.ts`)
   - `sendCampaign(campaignId)`: Lance l'envoi d'une campagne complète
   - `sendSmsToLead(lead, campaign)`: Envoie un SMS à un lead spécifique
   - `sendViaOrangeApi(msisdnHash, message)`: Appel réel à l'API Orange (PROD uniquement)

3. **`NudgeModule`** (`apps/backend/src/nudge/nudge.module.ts`)
   - Module NestJS qui exporte les services Nudge

---

## Configuration

### Variables d'environnement

Ajoutez ces variables dans `apps/backend/.env`:

```bash
# Orange Contact Everyone API (Production)
ORANGE_SMS_API_URL=https://api.orange.com/smsmessaging/v1
ORANGE_SMS_API_KEY=your_api_key_here
ORANGE_SMS_SENDER_NAME=Orange

# Frontend URL (pour génération des liens /lead/{id})
FRONTEND_BASE_URL=http://localhost:3000

# Mode (dev = mock, production = real API)
NODE_ENV=development
```

### Obtenir les credentials Orange

1. **Créer un compte**: [Orange Developer Portal](https://developer.orange.com/)
2. **Souscrire à Contact Everyone**: [Contact Everyone API](https://developer.orange.com/apis/contact-everyone)
3. **Obtenir un API Key**: Dans votre console Orange Business
4. **Documentation complète**: [Contact Everyone Docs](https://contact-everyone.orange-business.com/api/docs/)

---

## Utilisation

### Envoyer une campagne

Via l'API backend:

```bash
POST /campaign/:id/send
```

Exemple avec curl:

```bash
# 1. Créer une campagne
curl -X POST http://localhost:3003/campaign \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Campagne Test SMS",
    "target_filters": {
      "status": "eligible",
      "tier": 4
    },
    "template_id": "default",
    "template_variant": "A",
    "channel": "sms",
    "max_per_hour": 100,
    "batch_size": 10
  }'

# 2. Lancer l'envoi (récupérer l'ID de la réponse précédente)
curl -X POST http://localhost:3003/campaign/{campaign_id}/send
```

Via l'interface admin frontend:

1. Ouvrir http://localhost:3000/admin/campaigns
2. Cliquer sur "Nouvelle campagne"
3. Remplir le formulaire (audience, template, planning)
4. Cliquer sur "Créer la campagne"
5. Dans la liste, cliquer sur le bouton "Lancer" (icône avion)

---

## Mode Mock (Développement)

En mode **développement** (`NODE_ENV !== 'production'`), le service **simule** l'envoi SMS:

- Les messages sont affichés dans la console (logger)
- 90% de taux de réussite simulé
- Aucun SMS réel envoyé
- Pas besoin de credentials Orange

Exemple de log en mode mock:

```
[OrangeSmsService] [MOCK SMS] To: 33699... | Message: Bonjour ! Orange vous propose... | URL: http://localhost:3000/lead/abc123-def456
```

---

## Mode Production (API réelle)

En mode **production** (`NODE_ENV=production`), le service appelle l'API Orange:

- Requête POST vers `https://api.orange.com/smsmessaging/v1/outbound/{sender}/requests`
- Authentification: Bearer token (API Key)
- Payload conforme au standard Orange Contact Everyone
- Gestion des erreurs et retry (TODO)

### Payload d'exemple

```json
{
  "outboundSMSMessageRequest": {
    "address": ["tel:+33699901032"],
    "senderAddress": "tel:Orange",
    "outboundSMSTextMessage": {
      "message": "Bonjour ! Orange vous propose une offre pour votre ancien téléphone. Estimation gratuite : http://localhost:3000/lead/abc123"
    }
  }
}
```

---

## Templates SMS

4 variantes prédéfinies (DD-01):

- **Template A** (direct): "Bonjour ! Orange vous propose une offre pour votre ancien téléphone. Estimation gratuite : {url}"
- **Template B** (valeur): "Votre téléphone vaut de l'argent ! Découvrez combien avec Orange : {url}"
- **Template C** (écologie): "Ne jetez pas votre ancien mobile ! Orange vous le reprend. Cliquez ici : {url}"
- **Template D** (offre spéciale): "Offre spéciale Orange : faites estimer votre téléphone gratuitement {url}"

---

## Throttling & Batch Processing

Le service respecte les limites de débit configurées par campagne:

- **max_per_hour** (default: 100): Nombre maximum de SMS par heure
- **batch_size** (default: 10): Taille des lots d'envoi

Calcul du délai entre batches:

```typescript
delayBetweenBatches = (3600 * 1000) / (max_per_hour / batch_size)
```

Exemple:
- max_per_hour = 100
- batch_size = 10
- Délai = (3600s * 1000ms) / (100 / 10) = 360 000ms = 6 minutes entre chaque batch de 10 SMS

---

## Tracking & Analytics

### Modèle ContactAttempt

Chaque SMS génère un enregistrement `ContactAttempt`:

```typescript
{
  lead_id: string,
  channel: 'sms',
  template_variant: 'A' | 'B' | 'C' | 'D',
  status: 'sent' | 'delivered' | 'clicked' | 'failed',
  clicked_at: DateTime?,
  created_at: DateTime
}
```

### Statistiques de campagne

Après envoi, les stats sont mises à jour dans le modèle Campaign:

- `total_sent`: Nombre total de SMS envoyés
- `total_delivered`: Nombre de SMS livrés
- `total_clicked`: Nombre de clics sur le lien
- `total_converted`: Nombre de conversions (estimation + handover complétés)

---

## Flow complet

1. **Admin crée une campagne** via `/admin/campaigns/new`
2. **Backend calcule estimated_reach** via `DormantDetectorService.queryLeads()`
3. **Admin lance la campagne** en cliquant sur "Lancer"
4. **CampaignService.startSending()** déclenche `OrangeSmsService.sendCampaign()`
5. **Pour chaque lead**:
   - Génération d'un `leadId` unique (UUID)
   - Association `leadId <-> msisdn_hash + campaign_id`
   - Construction du message avec template + URL personnalisée
   - Envoi SMS (mock en dev, API Orange en prod)
   - Création d'un `ContactAttempt` (status: sent/delivered/failed)
   - Incrémentation du `contact_count` du lead
6. **Throttling**: Attente entre batches selon `max_per_hour` et `batch_size`
7. **Fin de campagne**: Status → `completed`, stats finales mises à jour

---

## Sécurité & RGPD

### Hash des numéros de téléphone

⚠️ **Important**: Le service stocke `msisdn_hash` (hash SHA-256 du numéro).

Pour envoyer un SMS réel, il faut **déchiffrer** le numéro:

```typescript
// TODO: Implémenter le déchiffrement sécurisé
const phoneNumber = await decryptMsisdn(msisdnHash);
```

### Consentement

Avant d'envoyer un SMS:
- Vérifier que le lead a consenti (`Consent` model)
- Respecter les opt-outs (`OptOut` model)
- Limiter à 2 tentatives max (`contact_count < 2`)

---

## Prochaines étapes

- [ ] Ajouter le déchiffrement des msisdn_hash (service crypto)
- [ ] Implémenter la vérification des consentements avant envoi
- [ ] Ajouter retry logic pour les échecs d'envoi
- [ ] Support RCS (Rich Communication Services)
- [ ] Webhooks Orange pour delivery reports
- [ ] A/B testing automatique des templates

---

## Tests

Lancer les tests backend:

```bash
cd apps/backend
npm test -- nudge
```

Tests end-to-end:

```bash
npm run test:e2e
```

---

## Références

- [Orange Contact Everyone API](https://developer.orange.com/apis/contact-everyone)
- [Orange SMS API Documentation](https://contact-everyone.orange-business.com/api/docs/)
- [CAMARA Network APIs](https://developer.orange.com/products/network-apis/)
