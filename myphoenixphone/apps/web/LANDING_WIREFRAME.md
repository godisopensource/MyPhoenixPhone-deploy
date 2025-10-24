# Landing Page Wireframe & UX Flow

## Product Goal
Convert dormant device leads into trade-in/donation completions through a frictionless 2-minute flow that captures model/IMEI with explicit consent and provides instant valuation.

---

## Page Structure (Mobile-First, Responsive)

### 1. Hero Section
```
┌─────────────────────────────────────┐
│  [Orange Logo]                      │
│                                     │
│  Donnez une seconde vie             │
│  à votre ancien mobile 📱           │
│                                     │
│  Estimation en 2 minutes            │
│  • Rachat jusqu'à 200€              │
│  • Don solidaire                    │
│  • Recyclage gratuit                │
│                                     │
│  [Commencer l'estimation ▼]         │
└─────────────────────────────────────┘
```

**Design notes**:
- Hero image: phone with gradient background (Orange brand colors)
- CTA button: Large, high contrast (#ff7900 Orange)
- Above-the-fold on mobile
- Trust badges: Secure, GDPR-compliant, Free shipping

---

### 2. Model Selection (Step 1/3)

#### Option A: Smart Detection (if User-Agent available)
```
┌─────────────────────────────────────┐
│  Étape 1 sur 3: Votre téléphone     │
│                                     │
│  [OK] Détection automatique:           │
│  ┌─────────────────────────────┐   │
│  │ [📱] iPhone 13 Pro          │   │
│  │      Apple                   │   │
│  │      [C'est bien ça]      │   │
│  └─────────────────────────────┘   │
│                                     │
│  ❌ Ce n'est pas mon téléphone      │
│                                     │
│  [Continuer →]                      │
└─────────────────────────────────────┘
```

#### Option B: Search with Autocomplete
```
┌─────────────────────────────────────┐
│  Étape 1 sur 3: Votre téléphone     │
│                                     │
│  Recherchez votre modèle:           │
│  ┌─────────────────────────────┐   │
│  │ iPhone 13...            [🔍] │   │
│  └─────────────────────────────┘   │
│                                     │
│  Résultats populaires:              │
│  ┌─────────────────────────────┐   │
│  │ iPhone 13 Pro Max 256GB     │   │
│  │ iPhone 13 Pro 128GB         │   │
│  │ iPhone 13 128GB             │   │
│  └─────────────────────────────┘   │
│                                     │
│  ❓ Je ne connais pas mon modèle    │
│                                     │
└─────────────────────────────────────┘
```

#### Option C: "I don't know" → Donation Path
```
┌─────────────────────────────────────┐
│  Pas de problème!                   │
│                                     │
│  Sans connaître le modèle exact,    │
│  nous ne pouvons pas estimer        │
│  la valeur de rachat.               │
│                                     │
│  Mais vous pouvez:                  │
│  • 💚 Faire un don à une asso       │
│  • ♻️ Recycler gratuitement         │
│                                     │
│  Ou trouvez votre modèle avec:      │
│  ┌─────────────────────────────┐   │
│  │ [📱 Afficher l'IMEI/modèle] │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Continuer vers le don →]          │
└─────────────────────────────────────┘
```

**Design notes**:
- Autocomplete uses `eligible-phone-models.json` for suggestions
- Top 10 popular models shown by default (iPhone 13-15, Galaxy S21-23, Pixel 6-8, Xiaomi Redmi)
- Search is fuzzy-matched and case-insensitive
- Progressive disclosure: "Advanced" button reveals IMEI helper

---

### 3. IMEI Helper (Modal/Accordion - Optional)

```
┌─────────────────────────────────────┐
│  📱 Comment trouver votre IMEI?     │
│                                     │
│  ┌─ iPhone ──────────────────────┐ │
│  │ Réglages → Général →          │ │
│  │ Informations → IMEI           │ │
│  │ [Voir capture d'écran]        │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌─ Android ─────────────────────┐ │
│  │ Paramètres → À propos du      │ │
│  │ téléphone → État → IMEI       │ │
│  │ ou composez *#06#             │ │
│  │ [Voir capture d'écran]        │ │
│  └───────────────────────────────┘ │
│                                     │
│  Saisir l'IMEI (15 chiffres):       │
│  ┌─────────────────────────────┐   │
│  │ 351234567890123         [OK] │   │
│  └─────────────────────────────┘   │
│                                     │
│  ℹ️ L'IMEI permet une estimation    │
│     précise. Il n'est pas stocké    │
│     après votre visite.             │
│                                     │
│  [Annuler]  [Valider l'IMEI]        │
└─────────────────────────────────────┘
```

**Design notes**:
- Modal overlay with close button
- Visual guides: annotated screenshots for iOS/Android
- IMEI validation: 15 digits, Luhn checksum
- Privacy notice: ephemeral storage

---

### 4. Device Condition (Step 2/3)

```
┌─────────────────────────────────────┐
│  Étape 2 sur 3: État du téléphone   │
│                                     │
│  [Image: iPhone 13 Pro]             │
│                                     │
│  1. L'écran fonctionne-t-il?        │
│     ( ) Oui, parfaitement           │
│     ( ) Oui, avec des rayures       │
│     ( ) Non, cassé/ne s'allume pas  │
│                                     │
│  2. La batterie tient-elle la       │
│     charge?                         │
│     ( ) Oui, >80% autonomie         │
│     ( ) Moyenne, 50-80%             │
│     ( ) Faible, <50%                │
│                                     │
│  3. Y a-t-il des dommages?          │
│     [ ] Rayures sur la coque        │
│     [ ] Impacts/chocs               │
│     [ ] Oxydation/eau               │
│     [ ] Aucun, comme neuf           │
│                                     │
│  4. Avez-vous les accessoires?      │
│     [ ] Chargeur                    │
│     [ ] Boîte d'origine             │
│                                     │
│  5. Le téléphone est-il débloqué?   │
│     ( ) Oui, tous opérateurs        │
│     ( ) Non, bloqué Orange          │
│     ( ) Je ne sais pas              │
│                                     │
│  [← Retour]  [Voir l'estimation →]  │
└─────────────────────────────────────┘
```

**Design notes**:
- Visual progress indicator (2/3)
- Radio buttons for single-choice, checkboxes for multi-choice
- Tooltips for "autonomie", "débloqué"
- All fields optional except Q1 (impacts pricing tiers)

---

### 5. Consent & Privacy (Step 2.5/3 - Inline)

```
┌─────────────────────────────────────┐
│  Avant de continuer...              │
│                                     │
│  [ ] J'accepte que Orange traite    │
│      les informations de mon        │
│      appareil (modèle/IMEI) pour    │
│      estimer sa valeur.             │
│                                     │
│  [ ] J'accepte d'être contacté      │
│      pour finaliser la reprise      │
│      (optionnel)                    │
│                                     │
│  🔒 Vos données sont protégées       │
│     et supprimées après 30 jours    │
│     si aucune reprise.              │
│                                     │
│  [En savoir plus sur vos données]   │
│                                     │
│  [Refuser]  [Accepter et continuer] │
└─────────────────────────────────────┘
```

**Design notes**:
- Required before showing estimate
- Link to full privacy policy
- GDPR-compliant: clear, granular, affirmative action

---

### 6. Instant Estimate (Step 3/3)

#### Scenario A: Device Has Value
```
┌─────────────────────────────────────┐
│  Étape 3 sur 3: Votre estimation    │
│                                     │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │    iPhone 13 Pro 128GB      │   │
│  │    État: Bon                │   │
│  │                             │   │
│  │         💰 120 €            │   │
│  │                             │   │
│  │  +20€ BONUS cette semaine │   │
│  │     Total: 140€             │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  Comment souhaitez-vous procéder?   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Envoi gratuit à domicile │   │
│  │    Étiquette fournie        │   │
│  │    Paiement sous 5 jours    │   │
│  │    [Choisir]                │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Dépôt en boutique Orange │   │
│  │    Trouver une boutique     │   │
│  │    Paiement immédiat        │   │
│  │    [Choisir]                │   │
│  └─────────────────────────────┘   │
│                                     │
│  Ou préférez-vous:                  │
│  [💚 Faire un don] [♻️ Recycler]    │
│                                     │
└─────────────────────────────────────┘
```

#### Scenario B: Low/No Value → Donation
```
┌─────────────────────────────────────┐
│  Étape 3 sur 3: Votre estimation    │
│                                     │
│  ┌─────────────────────────────┐   │
│  │    Samsung Galaxy A12       │   │
│  │    État: Usage normal       │   │
│  │                             │   │
│  │  Valeur de rachat: 0€       │   │
│  │                             │   │
│  │  Mais vous pouvez faire     │   │
│  │  un geste solidaire! 💚      │   │
│  └─────────────────────────────┘   │
│                                     │
│  Nos partenaires acceptent avec     │
│  plaisir votre appareil:            │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🤝 Don à Emmaüs Connect     │   │
│  │    Réinsertion numérique    │   │
│  │    [Choisir]                │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ♻️ Recyclage Orange         │   │
│  │    Traitement DEEE gratuit  │   │
│  │    [Choisir]                │   │
│  └─────────────────────────────┘   │
│                                     │
│  [← Vérifier mon modèle]            │
└─────────────────────────────────────┘
```

**Design notes**:
- Large price display with currency
- Bonus badge (if feature flag enabled)
- Clear action buttons with icons
- Fallback to donation always available
- Social proof: "XX personnes ont choisi le don ce mois-ci"

---

### 7. Handover Confirmation

#### Option A: Shipping Label
```
┌─────────────────────────────────────┐
│  Envoi gratuit                   │
│                                     │
│  Votre étiquette d'envoi:           │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  [PDF Preview]              │   │
│  │  Colissimo Prépayé          │   │
│  │  Orange Reprise             │   │
│  │  Lead #550e8400             │   │
│  └─────────────────────────────┘   │
│                                     │
│  [📄 Télécharger le PDF]            │
│  [📧 Recevoir par email]            │
│                                     │
│  Instructions:                      │
│  1. Effacez vos données             │
│  2. Emballez votre téléphone        │
│  3. Collez l'étiquette              │
│  4. Déposez en bureau de poste      │
│                                     │
│  Paiement sous 5 jours après     │
│     réception et contrôle           │
│                                     │
│  [Terminé]                        │
└─────────────────────────────────────┘
```

#### Option B: Store Drop-off
```
┌─────────────────────────────────────┐
│  Dépôt en boutique               │
│                                     │
│  Votre code de dépôt:               │
│                                     │
│  ┌─────────────────────────────┐   │
│  │         AB-1234-XY          │   │
│  └─────────────────────────────┘   │
│                                     │
│  Présentez ce code en boutique      │
│  Orange dans les 14 jours.          │
│                                     │
│  [📍 Trouver une boutique proche]   │
│                                     │
│  Boutiques à proximité:             │
│  • Orange République (2.3 km)       │
│  • Orange Beaugrenelle (4.1 km)     │
│                                     │
│  Instructions:                      │
│  1. Effacez vos données             │
│  2. Apportez votre téléphone        │
│  3. Montrez ce code au conseiller   │
│                                     │
│  Paiement immédiat après         │
│     contrôle en boutique            │
│                                     │
│  [J'ai noté le code]              │
└─────────────────────────────────────┘
```

#### Option C: Donation Confirmation
```
┌─────────────────────────────────────┐
│  💚 Merci pour votre générosité!    │
│                                     │
│  Votre appareil va permettre à      │
│  quelqu'un de se reconnecter.       │
│                                     │
│  Partenaire choisi:                 │
│  🤝 Emmaüs Connect                  │
│                                     │
│  Votre étiquette d'envoi:           │
│  [📄 Télécharger le PDF]            │
│                                     │
│  Vous recevrez un reçu fiscal       │
│  (si valeur ≥ 20€) par email.       │
│                                     │
│  🌍 Impact estimé:                  │
│  • 15 kg CO₂ économisés             │
│  • 1 personne aidée                 │
│                                     │
│  [Partager mon geste 📱]            │
│  [Terminé]                        │
└─────────────────────────────────────┘
```

**Design notes**:
- QR code for easy PDF download on mobile
- Email capture optional for label delivery
- Clear next steps with visual checklist
- Social sharing buttons (optional)

---

## Mobile Wireframe Flow Diagram

```
┌─────────┐
│  Hero   │
│ Section │
└────┬────┘
     │
     ▼
┌─────────────────┐
│ Model Selection │◄─────────┐
│   (Step 1/3)    │          │
└────┬────────────┘          │
     │                       │
     ├─ Auto-detect?         │
     ├─ Search?              │
     └─ Don't know? ─────────┤
                             │
     ┌───────────────────────┘
     │
     ▼
┌──────────────┐
│ IMEI Helper  │ (Optional Modal)
│  (Accordion) │
└──────┬───────┘
       │
       ▼
┌─────────────────┐
│ Device Condition│
│   (Step 2/3)    │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ Consent Form    │
│ (Required)      │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ Instant Estimate│◄──── API Call: POST /pricing/estimate
│   (Step 3/3)    │
└────┬────────────┘
     │
     ├─ Has value? → [Ship] or [Store]
     └─ No value?  → [Donate] or [Recycle]
          │
          ▼
     ┌──────────────────┐
     │ Handover Confirm │
     │ (Label/Code/Thanks)│
     └──────────────────┘
          │
          ▼
     ┌──────────────────┐
     │  Success Page    │
     │ (Share/Feedback) │
     └──────────────────┘
```

---

## Desktop Layout Adjustments

- **Two-column layout** for steps 2-3:
  - Left: Form/questions
  - Right: Device preview image + real-time estimate preview
- **Sticky progress bar** at top
- **Wider forms** with horizontal radio groups
- **Lightbox** for IMEI helper instead of modal

---

## Accessibility (WCAG 2.1 AA)

### Requirements
- [ ] All form inputs have associated `<label>` elements
- [ ] Color contrast ratio ≥ 4.5:1 for text
- [ ] Focus indicators visible on all interactive elements
- [ ] Keyboard navigation works throughout (Tab, Enter, Esc)
- [ ] Skip links for screen readers
- [ ] ARIA labels on icon-only buttons
- [ ] Form validation errors announced to screen readers
- [ ] Alt text on all images

### Screen Reader Flow
```
"Orange logo. Heading: Donnez une seconde vie à votre ancien mobile. 
Button: Commencer l'estimation. Navigates to model selection form."

"Step 1 of 3: Your phone. Search field: Search your model. 
Type at least 3 characters to see suggestions."

"Consent checkbox required: I accept that Orange processes my device 
information to estimate its value. Link: Learn more about your data."
```

---

## Performance Targets

- **Time to Interactive (TTI)**: < 3s on 4G
- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Bundle size**: < 200KB JS (gzipped)

### Optimization Strategies
- Lazy-load autocomplete library
- Inline critical CSS
- Defer non-critical JavaScript
- Optimize hero image (WebP, responsive sizes)
- Prefetch `/pricing/estimate` endpoint after Step 1

---

## Analytics Events

Track these user actions:
- `page_view`: Landing loaded (with `lead_id`, `variant`)
- `model_selected`: User chose a phone model
- `imei_helper_opened`: User clicked IMEI help
- `imei_submitted`: User entered IMEI
- `consent_accepted`: User accepted privacy consent
- `consent_rejected`: User rejected consent (track drop-off)
- `estimate_viewed`: Estimate shown (`model`, `price`, `condition`)
- `handover_selected`: User chose ship/store/donate (`choice`)
- `label_downloaded`: User downloaded PDF
- `completed`: Full flow completed

---

## Error States

### Network Error
```
┌─────────────────────────────────────┐
│  Erreur de connexion             │
│                                     │
│  Impossible de charger l'estimation.│
│  Vérifiez votre connexion et       │
│  réessayez.                         │
│                                     │
│  [Réessayer]                        │
└─────────────────────────────────────┘
```

### Invalid IMEI
```
┌─────────────────────────────────────┐
│  ❌ IMEI invalide                   │
│                                     │
│  L'IMEI doit contenir 15 chiffres.  │
│  Vérifiez et réessayez.             │
│                                     │
│  [Modifier l'IMEI]                  │
│  [Continuer sans IMEI]              │
└─────────────────────────────────────┘
```

### Model Not Found
```
┌─────────────────────────────────────┐
│  🔍 Modèle non trouvé               │
│                                     │
│  Nous ne reconnaissons pas ce       │
│  modèle dans notre catalogue.       │
│                                     │
│  Vous pouvez:                       │
│  • Vérifier l'orthographe           │
│  • Essayer avec l'IMEI              │
│  • Procéder au don/recyclage        │
│                                     │
│  [Nouvelle recherche]               │
│  [Don/Recyclage]                    │
└─────────────────────────────────────┘
```

---

## Multi-Language Support

### Supported Locales
- `fr-FR`: French (default)
- `en-GB`: English (UK)
- `es-ES`: Spanish (optional future)

### Language Switcher
```
┌─────────────────────────────────────┐
│  [Orange Logo]     🌐 FR ▼          │
│                    • Français       │
│                    • English        │
└─────────────────────────────────────┘
```

**Implementation**: 
- Next.js i18n routing
- Language detection from `Accept-Language` header
- Persist choice in cookie

---

## Content Checklist

- [ ] All copy approved by Marketing & Legal
- [ ] Translations validated
- [ ] Privacy policy link functional
- [ ] Terms & conditions accessible
- [ ] FAQ page available for common questions
- [ ] Contact support link visible
- [ ] Brand consistency (Orange voice & tone)

---

## Next Steps for Implementation

1. **Design handoff**: Create high-fidelity mockups in Figma/Sketch based on this wireframe
2. **Component library**: Use or extend `packages/ui` with reusable components
3. **API contracts**: Align with backend endpoints from DD-07 (pricing)
4. **Responsive testing**: iOS Safari, Chrome Android, desktop browsers
5. **User testing**: 5-10 internal users before pilot launch

---

## References

- Backend schemas: `/src/dormant/schemas/lead-output.schema.json`
- Phone models list: `eligible-phone-models.json` (to be created or referenced)
- Message templates: `/src/nudge/templates/MESSAGE_TEMPLATES.md`
- Design system: Orange Design System (if available)
