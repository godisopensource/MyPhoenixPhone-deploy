export type CopyVariant = 'control' | 'variant_a' | 'variant_b';
export type MessageChannel = 'sms' | 'rcs' | 'push' | 'email';
export type Language = 'fr' | 'en';

export interface MessageCopy {
  subject?: string;
  body: string;
  cta?: string;
}

export interface CopyConfig {
  variant: CopyVariant;
  channel: MessageChannel;
  language: Language;
}

const COPIES: Record<
  CopyVariant,
  Record<MessageChannel, Record<Language, MessageCopy>>
> = {
  control: {
    sms: {
      fr: {
        body: 'Bonjour, votre téléphone dort dans un tiroir ? Orange le reprend ! Obtenez une estimation en 2 min : {url}',
      },
      en: {
        body: 'Hello, is your phone sleeping in a drawer? Orange takes it back! Get an estimate in 2 min: {url}',
      },
    },
    rcs: {
      fr: {
        subject: 'Recyclez votre ancien téléphone',
        body: 'Votre téléphone mérite une seconde vie. Obtenez une estimation rapide et choisissez votre mode de reprise.',
        cta: 'Estimer mon téléphone',
      },
      en: {
        subject: 'Recycle your old phone',
        body: 'Your phone deserves a second life. Get a quick estimate and choose your trade-in method.',
        cta: 'Estimate my phone',
      },
    },
    push: {
      fr: {
        subject: 'Un ancien téléphone à recycler ?',
        body: 'Orange vous propose de le reprendre. Estimation en 2 minutes.',
        cta: 'Découvrir',
      },
      en: {
        subject: 'Got an old phone to recycle?',
        body: 'Orange offers to take it back. Estimate in 2 minutes.',
        cta: 'Find out',
      },
    },
    email: {
      fr: {
        subject: 'Donnez une seconde vie à votre téléphone',
        body: 'Bonjour,\n\nVous possédez un ancien smartphone qui dort dans un tiroir ?\n\nOrange vous propose de le reprendre dans le cadre de son programme de reconditionnement.\n\nCliquez ici pour obtenir une estimation en quelques clics : {url}\n\nCordialement,\nL\'équipe Orange',
        cta: 'Estimer mon appareil',
      },
      en: {
        subject: 'Give your phone a second life',
        body: 'Hello,\n\nDo you have an old smartphone sleeping in a drawer?\n\nOrange offers to take it back as part of its refurbishment program.\n\nClick here to get an estimate in a few clicks: {url}\n\nBest regards,\nThe Orange Team',
        cta: 'Estimate my device',
      },
    },
  },
  variant_a: {
    // Ton plus direct / urgent
    sms: {
      fr: {
        body: 'Téléphone inutilisé ? Transformez-le en valeur MAINTENANT avec Orange. 2 min pour estimer : {url}',
      },
      en: {
        body: 'Unused phone? Turn it into value NOW with Orange. 2 min to estimate: {url}',
      },
    },
    rcs: {
      fr: {
        subject: 'Votre téléphone vaut de l\'argent',
        body: 'Ne laissez pas dormir de la valeur dans un tiroir. Obtenez immédiatement une offre de reprise.',
        cta: 'Voir ma reprise',
      },
      en: {
        subject: 'Your phone is worth money',
        body: 'Don\'t let value sleep in a drawer. Get an instant trade-in offer.',
        cta: 'See my trade-in',
      },
    },
    push: {
      fr: {
        subject: 'Transformez votre ancien mobile en €',
        body: 'Estimation immédiate. Reprise garantie.',
        cta: 'J\'estime',
      },
      en: {
        subject: 'Turn your old mobile into €',
        body: 'Instant estimate. Guaranteed trade-in.',
        cta: 'Estimate now',
      },
    },
    email: {
      fr: {
        subject: 'Reprise immédiate : votre téléphone vaut de l\'argent',
        body: 'Bonjour,\n\nVotre ancien smartphone a de la valeur. Ne le laissez pas dormir !\n\nOrange vous garantit une reprise rapide et transparente.\n\n✓ Estimation en 2 minutes\n✓ Plusieurs options de remise\n✓ Processus simple et sécurisé\n\nDémarrez maintenant : {url}\n\nL\'équipe Orange',
        cta: 'Estimer maintenant',
      },
      en: {
        subject: 'Instant trade-in: your phone is worth money',
        body: 'Hello,\n\nYour old smartphone has value. Don\'t let it sleep!\n\nOrange guarantees a fast and transparent trade-in.\n\n✓ 2-minute estimate\n✓ Multiple drop-off options\n✓ Simple and secure process\n\nStart now: {url}\n\nThe Orange Team',
        cta: 'Estimate now',
      },
    },
  },
  variant_b: {
    // Ton plus empathique / environnemental
    sms: {
      fr: {
        body: 'Participez à l\'économie circulaire : donnez une 2e vie à votre téléphone avec Orange. Estimation gratuite : {url}',
      },
      en: {
        body: 'Join the circular economy: give your phone a 2nd life with Orange. Free estimate: {url}',
      },
    },
    rcs: {
      fr: {
        subject: 'Un geste pour la planète et pour vous',
        body: 'En reconditionnant votre téléphone, vous contribuez à réduire les déchets électroniques. Orange vous accompagne.',
        cta: 'Agir maintenant',
      },
      en: {
        subject: 'A gesture for the planet and you',
        body: 'By refurbishing your phone, you help reduce electronic waste. Orange supports you.',
        cta: 'Act now',
      },
    },
    push: {
      fr: {
        subject: 'Ensemble pour une tech responsable',
        body: 'Votre ancien mobile peut avoir une seconde vie. Estimation éco-responsable.',
        cta: 'Contribuer',
      },
      en: {
        subject: 'Together for responsible tech',
        body: 'Your old mobile can have a second life. Eco-responsible estimate.',
        cta: 'Contribute',
      },
    },
    email: {
      fr: {
        subject: 'Donnez une seconde vie à votre téléphone, pour la planète',
        body: 'Bonjour,\n\nChaque année, des millions de smartphones finissent dans des tiroirs.\n\nEnsemble, changeons les choses. Orange s\'engage dans l\'économie circulaire et vous propose de reprendre votre ancien appareil.\n\n🌍 Réduisez votre empreinte environnementale\n♻️ Soutenez le reconditionnement\n🤝 Bénéficiez d\'un geste commercial\n\nCommencez votre estimation : {url}\n\nMerci pour votre engagement,\nL\'équipe Orange',
        cta: 'Je participe',
      },
      en: {
        subject: 'Give your phone a second life, for the planet',
        body: 'Hello,\n\nEvery year, millions of smartphones end up in drawers.\n\nTogether, let\'s change things. Orange is committed to the circular economy and offers to take back your old device.\n\n🌍 Reduce your environmental footprint\n♻️ Support refurbishment\n🤝 Benefit from a commercial gesture\n\nStart your estimate: {url}\n\nThank you for your commitment,\nThe Orange Team',
        cta: 'I participate',
      },
    },
  },
};

export class CopyService {
  getCopy(config: CopyConfig): MessageCopy {
    const copy = COPIES[config.variant]?.[config.channel]?.[config.language];
    if (!copy) {
      // Fallback to control/french
      return COPIES.control[config.channel]?.fr || { body: '' };
    }
    return copy;
  }

  interpolate(text: string, vars: Record<string, string>): string {
    return text.replace(/\{(\w+)\}/g, (_, key) => vars[key] || '');
  }

  formatMessage(
    config: CopyConfig,
    variables: Record<string, string> = {},
  ): MessageCopy {
    const copy = this.getCopy(config);
    return {
      subject: copy.subject
        ? this.interpolate(copy.subject, variables)
        : undefined,
      body: this.interpolate(copy.body, variables),
      cta: copy.cta ? this.interpolate(copy.cta, variables) : undefined,
    };
  }
}
