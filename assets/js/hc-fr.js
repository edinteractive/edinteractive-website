// CRM health check: Quebec French wording. Keyed by the same ids as hc-core.js, so the
// questions, scoring and CRM fields stay identical in both languages; only the words change.
export const FR = {
  roles: {
    owner: { title: 'Propriétaire ou directeur général', text: 'Je dirige l’entreprise et je n’arrive pas à avoir une vue fiable des revenus, du pipeline et des marges.' },
    sales: { title: 'Responsable des ventes ou du marketing', text: 'Mon équipe vit dans le CRM, mais les doublons, les affaires dormantes et les prévisions faites à l’aveugle nous ralentissent.' },
    ops: { title: 'Responsable des opérations ou des finances', text: 'Je synchronise le CRM et la comptabilité à la main et je veux automatiser les étapes manuelles.' },
    other: { title: 'Autre chose', text: 'Consultant TI, stratège numérique, consultant en gestion, ingénieur déployé chez le client (FDE), etc.' }
  },

  pains: {
    sync: 'CRM et Books désynchronisés',
    rekey: 'Ressaisie des commandes et des factures',
    approvals: 'Approbations coincées dans les courriels',
    creator: 'Application Creator sur mesure à corriger',
    margin: 'Aucune visibilité sur les marges ou le coût par projet',
    integrations: 'Intégrations qui brisent sans avertir'
  },

  areas: { data: 'Qualité des données', pipeline: 'Hygiène du pipeline', connected: 'Rapports connectés', automation: 'Automatisation' },

  likert: ['Tout à fait en désaccord', 'En désaccord', 'Neutre', 'D’accord', 'Tout à fait d’accord'],

  statements: {
    dupes: { text: 'Notre CRM contient très peu de contacts et de comptes en double.',
      fix: 'Fusionner les contacts et les comptes en double, puis activer la détection des doublons pour bloquer les nouveaux dès la saisie.' },
    fields: { text: 'Les champs clés comme le secteur, la taille de l’entreprise et le responsable sont remplis sur la plupart des fiches.',
      fix: 'Remplir les champs clés (secteur, taille, responsable) sur les fiches existantes et les rendre obligatoires pour la suite.' },
    rules: { text: 'Des règles de validation ou des listes de choix empêchent les mauvaises données d’entrer.',
      fix: 'Ajouter des règles de validation et des listes de choix pour que les mauvaises données n’entrent plus par les formulaires, les importations ou les représentants.' },
    nextstep: { text: 'Chaque affaire ouverte a une prochaine étape et une activité récente.',
      fix: 'Passer en revue les affaires sans activité depuis 60 jours : fermer celles qui sont mortes et donner aux autres une prochaine étape datée.' },
    stages: { text: 'Nos représentants utilisent les étapes de vente de la même façon.',
      fix: 'Définir chaque étape de vente avec des critères d’entrée clairs pour que tous les représentants fassent avancer les affaires de la même façon.' },
    books: { text: 'Le CRM et Books concordent sur les clients, les commandes et les factures.',
      fix: 'Lier les clients de Zoho Books aux comptes du CRM pour que les revenus, les factures et les affaires concordent dans une seule vue.' },
    trust: { text: 'Nous nous fions aux chiffres du CRM en réunion, sans chiffrier à côté.',
      fix: 'Bâtir un tableau de bord Zoho Analytics à partir du CRM, de Creator et de Books, que l’équipe consulte chaque semaine.' },
    handoffs: { text: 'Les suivis, l’attribution des prospects et les approbations roulent sans que personne ait à courir après.',
      fix: 'Automatiser les suivis, l’attribution des prospects et les approbations avec des flux de travail et l’IA, une personne approuvant ce qui est envoyé.' }
  },

  polls: {
    forecast: { q: 'À quel point êtes-vous confiant dans les prévisions de ce trimestre?',
      labels: ['Très confiant', 'Plus ou moins', 'Honnêtement, c’est une devinette'],
      fix: 'Noter les affaires ouvertes selon l’âge de l’étape et l’activité pour que les prévisions viennent des données, pas de l’instinct.' },
    hours: { q: 'Combien d’heures par semaine votre équipe passe-t-elle à ressaisir des données d’une application à l’autre?',
      labels: ['Moins de 2', '2 à 5', '5 à 10', 'Plus de 10'],
      fix: 'Connecter le CRM, Books et Creator avec Deluge et Zoho Flow pour que les données soient saisies une seule fois.' },
    priority: { q: 'Si vous pouviez régler une seule chose ce trimestre, ce serait quoi?',
      labels: ['Des données propres et fiables', 'Un pipeline sur lequel baser mes prévisions', 'Des rapports auxquels tout le monde croit', 'Moins de transferts manuels'] }
  },

  practitioners: {
    data: { title: 'Spécialiste des données Zoho CRM', text: 'Nettoie, dédoublonne et enrichit votre CRM, puis met en place les règles qui le gardent propre.',
      skills: ['Fusion et prévention des doublons', 'Complétude des champs', 'Règles de validation'] },
    analytics: { title: 'Consultant Zoho Analytics', text: 'Réunit le CRM, Creator et Books dans un seul tableau de bord fiable pour les revenus, le pipeline et les marges.',
      skills: ['Zoho Analytics', 'Rapports de marges et de coût par projet', 'Tableaux de bord de prévisions'] },
    automation: { title: 'Développeur en automatisation Zoho', text: 'Connecte le CRM, Books et Creator avec Deluge et Flow pour éliminer la double saisie et les transferts manuels.',
      skills: ['Deluge et Zoho Flow', 'Intégration CRM et Books', 'Applications Creator'] },
    workflow: { title: 'Stratège en processus de vente', text: 'Resserre vos étapes de vente, l’attribution des prospects et les suivis personnalisés pour que les affaires cessent de tomber dans l’oubli.',
      skills: ['Étapes de vente', 'Attribution des prospects', 'Suivis personnalisés'] }
  },

  // "Pas encore sur Zoho": same questions, worded for the CRM and accounting they use today.
  nz: {
    pains: {
      sync: 'CRM et comptabilité désynchronisés',
      creator: 'Chiffriers ou outils maison qui tiennent le tout ensemble'
    },
    statements: {
      books: { text: 'Notre CRM et notre système comptable concordent sur les clients, les commandes et les factures.',
        fix: 'Connecter votre CRM et votre comptabilité pour que les clients, les factures et les affaires concordent dans une seule vue. Dans Zoho, c’est le CRM lié à Books.' },
      trust: { fix: 'Bâtir un tableau de bord à partir des données de votre CRM et de votre comptabilité, que l’équipe consulte chaque semaine.' }
    },
    polls: {
      hours: { fix: 'Connecter votre CRM et votre comptabilité pour que les données soient saisies une seule fois, sans ressaisie d’une application à l’autre.' }
    },
    practitioners: {
      data: { title: 'Spécialiste des données et de la migration CRM', text: 'Nettoie et dédoublonne vos données avant leur passage à Zoho CRM, puis met en place les règles qui les gardent propres.',
        skills: ['Nettoyage avant la migration', 'Fusion et prévention des doublons', 'Correspondance des champs vers Zoho CRM'] },
      analytics: { title: 'Consultant en rapports et en analytique', text: 'Réunit les données de votre CRM et de votre comptabilité dans un seul tableau de bord fiable pour les revenus, le pipeline et les marges.',
        skills: ['Zoho Analytics', 'Rapports de marges et de coût par projet', 'Tableaux de bord de prévisions'] },
      automation: { title: 'Développeur en automatisation et en intégration', text: 'Connecte votre CRM et votre comptabilité pour éliminer la double saisie et les transferts manuels, aujourd’hui ou après un passage à Zoho.',
        skills: ['Intégration CRM et comptabilité', 'Automatisation des flux de travail', 'Migration vers Zoho One'] },
      workflow: { text: 'Resserre vos étapes de vente, l’attribution des prospects et les suivis personnalisés pour que les affaires cessent de tomber dans l’oubli, dans votre CRM actuel ou dans Zoho.' }
    }
  },

  // Display words for answer values that are stored in English.
  values: { 'Not on Zoho yet': 'Pas encore sur Zoho', 'Excel or Google Sheets': 'Excel ou Google Sheets', 'No CRM yet': 'Pas encore de CRM' },

  bands: ['En santé. Quelques ajustements.', 'Réparable. De l’argent sur la table.', 'À corriger dès maintenant.'],

  audit: {
    zoho: 'L’audit complet vérifie vos vraies données CRM et Books par l’API, en lecture seule.',
    nz: 'L’audit complet passe en revue une exportation des données de votre CRM et de votre comptabilité actuels et montre ce qu’un passage à Zoho réglerait.'
  },

  errors: {
    role: 'Choisissez l’option qui vous ressemble le plus.',
    rate: 'Évaluez chaque énoncé.',
    polls: 'Répondez à chaque question du sondage.',
    links: 'Veuillez retirer les liens de votre nom et de votre entreprise.'
  },

  summary: {
    role: 'Rôle', pains: 'Le travail manuel s’accumule dans', apps: 'Applications Zoho',
    instead: 'Utilise plutôt aujourd’hui', users: 'Personnes qui utilisent le CRM', none: 'Non précisé'
  }
};
