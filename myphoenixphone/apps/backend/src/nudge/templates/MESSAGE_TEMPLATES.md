# Message Templates for Dormant Device Nudges

## Overview

This document defines message templates for SMS, RCS, and Push notifications used in the dormant device trade-in/donation campaign. All templates support A/B testing variants and personalization.

## Personalization Variables

Available placeholders:
- `{first_name}`: User's first name (if available)
- `{max_value}`: Estimated maximum trade-in value (e.g., "50")
- `{currency}`: Currency symbol (e.g., "€")
- `{link}`: Short landing page URL with lead tracking
- `{brand}`: Orange branding
- `{unsubscribe_link}`: Opt-out link

## SMS Templates (160 characters max)

### Variant A: Value-Focused (with price)
```
Orange: Vous avez changé de mobile récemment. Votre ancien téléphone peut valoir jusqu'à {max_value}{currency}. Estimez sa valeur en 2 min: {link}. Sinon, donnez-le ou recyclez-le facilement.
```

**Character count**: ~158 (with 50€ example)

### Variant B: Environmental + Value
```
Orange: Nouveau mobile? Ne laissez pas votre ancien téléphone au tiroir! Obtenez jusqu'à {max_value}{currency} ou donnez-le à une association. Estimation rapide: {link}
```

**Character count**: ~156

### Variant C: Donation-First (no price mention)
```
Orange: Faites un geste: donnez votre ancien mobile à nos partenaires solidaires ou recyclez-le. Vous pouvez aussi le revendre facilement. Commencer: {link}
```

**Character count**: ~151

### Variant D: Bonus Urgency (time-limited offer)
```
Orange: BONUS 20€ valable 7 jours! Votre ancien téléphone vaut jusqu'à {max_value}{currency}. Estimation gratuite et enlèvement à domicile: {link}. Stop: {unsubscribe_link}
```

**Character count**: ~160

## RCS Templates (Rich Card Format)

### Variant A: Value-Focused
**Title**: Votre ancien mobile a de la valeur!

**Description**: 
Vous venez de changer de téléphone? Ne le laissez pas dans un tiroir.

**Hero Image**: Phone with euro symbols (visual asset: `rcs-hero-value.jpg`)

**Card Content**:
- 💰 Estimation en 2 minutes
- 📦 Enlèvement gratuit à domicile
- 🌍 Ou faites un don solidaire

**Value Badge**: Jusqu'à {max_value}{currency}

**Actions**:
1. [Primary Button] "Estimer maintenant" → {link}
2. [Secondary Button] "En savoir plus"

---

### Variant B: Environmental Focus
**Title**: Donnez une seconde vie à votre ancien mobile

**Description**: 
Après votre changement de mobile, votre ancien téléphone peut encore servir.

**Hero Image**: Phone with green leaves/recycling symbol (visual asset: `rcs-hero-eco.jpg`)

**Card Content**:
- ♻️ Recyclage gratuit et responsable
- 💚 Don à une association partenaire
- 💰 Ou rachat jusqu'à {max_value}{currency}

**Actions**:
1. [Primary Button] "Voir mes options" → {link}
2. [Secondary Button] "Pourquoi donner?"

---

### Variant C: Bonus Time-Limited
**Title**: 🎁 BONUS +20€ pendant 7 jours

**Description**: 
Reprise exceptionnelle de votre ancien mobile!

**Hero Image**: Phone with gift ribbon (visual asset: `rcs-hero-bonus.jpg`)

**Card Content**:
- ⚡ Offre valable jusqu'au {expiry_date}
- 💰 Valeur estimée: {max_value}{currency} + BONUS
- 📦 Étiquette d'envoi offerte

**Urgency Badge**: Expire dans {days_left} jours

**Actions**:
1. [Primary Button] "Profiter du bonus" → {link}
2. [Secondary Button] "Conditions"

## Push Notification Templates (Mobile App)

### Variant A: Value-Focused
**Title**: Votre ancien mobile vaut jusqu'à {max_value}{currency}

**Body**: Nouveau téléphone détecté. Estimez la valeur de votre ancien mobile en 2 min ou faites-en don.

**Icon**: Orange logo
**Large Icon**: Phone with euro symbol
**Action**: Open landing page

**Tap Action**: {link}

---

### Variant B: Eco-Friendly
**Title**: Ne jetez pas votre ancien mobile 📱♻️

**Body**: Donnez-le à une association, recyclez-le ou revendez-le jusqu'à {max_value}{currency}. C'est simple et rapide.

**Icon**: Orange logo
**Large Icon**: Green recycling symbol
**Action**: Open landing page

**Tap Action**: {link}

---

### Variant C: Bonus Urgency
**Title**: 🎁 Bonus +20€ sur la reprise (7 jours)

**Body**: Offre spéciale: profitez d'un bonus exceptionnel pour la reprise de votre ancien téléphone.

**Icon**: Orange logo
**Large Icon**: Gift box icon
**Action**: Open offer page
**Priority**: High

**Tap Action**: {link}

## Email Templates (Optional Channel)

### Subject Lines (A/B variants)
1. "Votre ancien mobile vaut jusqu'à {max_value}{currency}"
2. "Ne laissez pas votre téléphone au tiroir 📱"
3. "🎁 BONUS reprise: +20€ pendant 7 jours"
4. "Donnez votre ancien mobile à une bonne cause"

### Email Body (Responsive HTML)
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Orange - Reprise Mobile</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #ff7900; padding: 30px; text-align: center;">
              <img src="{{orange_logo_url}}" alt="Orange" width="120" />
            </td>
          </tr>
          
          <!-- Hero -->
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <h1 style="color: #000; font-size: 28px; margin: 0 0 20px;">
                Votre ancien mobile a de la valeur!
              </h1>
              <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0;">
                Vous venez de changer de téléphone? Ne laissez pas votre ancien mobile prendre la poussière.
              </p>
            </td>
          </tr>
          
          <!-- Value Proposition -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding: 20px; text-align: center; border: 1px solid #eee; border-radius: 8px;">
                    <div style="font-size: 40px; margin-bottom: 10px;">💰</div>
                    <h3 style="color: #000; font-size: 18px; margin: 0 0 10px;">Rachat</h3>
                    <p style="color: #666; font-size: 14px; margin: 0;">Jusqu'à <strong>{max_value}{currency}</strong></p>
                  </td>
                  <td width="50%" style="padding: 20px; text-align: center; border: 1px solid #eee; border-radius: 8px;">
                    <div style="font-size: 40px; margin-bottom: 10px;">💚</div>
                    <h3 style="color: #000; font-size: 18px; margin: 0 0 10px;">Don</h3>
                    <p style="color: #666; font-size: 14px; margin: 0;">À nos partenaires solidaires</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA -->
          <tr>
            <td style="padding: 0 30px 40px; text-align: center;">
              <a href="{link}" style="display: inline-block; background-color: #ff7900; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 4px; font-size: 18px; font-weight: bold;">
                Estimer maintenant
              </a>
            </td>
          </tr>
          
          <!-- Benefits -->
          <tr>
            <td style="padding: 0 30px 40px; background-color: #f9f9f9;">
              <h3 style="color: #000; font-size: 18px; margin: 0 0 20px; text-align: center;">
                C'est simple et rapide
              </h3>
              <ul style="color: #666; font-size: 14px; line-height: 1.8; padding-left: 20px;">
                <li>Estimation en 2 minutes chrono</li>
                <li>Étiquette d'envoi gratuite ou dépôt en boutique</li>
                <li>Paiement rapide après réception</li>
                <li>Option don si votre mobile n'est pas valorisable</li>
              </ul>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; text-align: center; background-color: #333; color: #fff; font-size: 12px;">
              <p style="margin: 0 0 10px;">
                Vous recevez cet email car vous êtes client Orange et avez récemment changé de mobile.
              </p>
              <p style="margin: 0;">
                <a href="{unsubscribe_link}" style="color: #ff7900; text-decoration: underline;">Se désabonner</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

## Localization (French + English)

### English SMS Variant A
```
Orange: You recently changed phones. Your old device could be worth up to {currency}{max_value}. Get an estimate in 2 min: {link}. Or donate/recycle it easily.
```

### English RCS Variant A Title
```
Your old phone has value!
```

## A/B Testing Strategy

### Test Groups
- **Control (40%)**: Variant A (value-focused, standard)
- **Treatment 1 (30%)**: Variant B (eco-friendly angle)
- **Treatment 2 (30%)**: Variant D (bonus urgency, if enabled)

### Success Metrics
- **Primary**: Click-through rate (CTR)
- **Secondary**: Estimation completion rate, handover rate
- **Learning**: Message preference by demographic (if anonymized cohort data available)

### Test Duration
- Minimum 1,000 sends per variant
- 7-day observation window
- Statistical significance threshold: p < 0.05

## Compliance Notes

### Opt-Out Requirements
- All SMS must include clear unsubscribe mechanism or reference
- Push notifications respect OS-level opt-out
- Email footer with one-click unsubscribe

### GDPR
- Messages contain only hashed identifiers in tracking parameters
- No PII exposed in message content
- Consent for marketing captured during line signup or app install

### Frequency Capping
- Maximum 1 initial nudge + 1 follow-up per lead
- Minimum 14-day cooldown between different campaigns
- Global opt-out honored immediately

## Content Approval Checklist
- [ ] Messaging approved by Legal/Compliance
- [ ] Translations validated by native speakers
- [ ] Links tested and trackable
- [ ] Opt-out mechanism functional
- [ ] Brand guidelines respected (Orange color #ff7900, typography)
- [ ] Accessibility: text readable, contrast ratio ≥ 4.5:1
- [ ] Character limits verified (SMS 160, push 178 title+body)

## Asset Requirements

### Images for RCS
- `rcs-hero-value.jpg`: 1200×628px, phone with euro symbols
- `rcs-hero-eco.jpg`: 1200×628px, phone with green/recycling theme
- `rcs-hero-bonus.jpg`: 1200×628px, phone with gift ribbon
- All images: < 100KB, JPEG format, alt text provided

### Push Notification Icons
- `push-icon-value.png`: 192×192px, phone + euro
- `push-icon-eco.png`: 192×192px, recycling symbol
- `push-icon-bonus.png`: 192×192px, gift box

## Dynamic Content Rules

### Price Display Logic
```
IF max_value >= 100:
  display "{max_value}{currency}" prominently
ELSE IF max_value >= 20:
  display "jusqu'à {max_value}{currency}"
ELSE:
  omit price; use donation-first variant (Variant C)
```

### Bonus Display (Feature Flag: ENABLE_BONUS_CAMPAIGN)
```
IF bonus_enabled AND days_since_swap <= 7:
  use Variant D (bonus urgency)
  calculate expiry_date = swap_date + 10 days
ELSE:
  use standard variants A/B
```

## Testing Checklist
- [ ] Placeholder replacement works for all variables
- [ ] Links are properly parameterized (lead_id, variant)
- [ ] SMS character encoding (UTF-8) correct
- [ ] RCS cards render on Android 8+
- [ ] Push notifications appear on iOS 14+ and Android 9+
- [ ] Email responsive on mobile and desktop clients
- [ ] Unsubscribe links functional
- [ ] A/B variant assignment deterministic per lead_id
