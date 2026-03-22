# Parcours Utilisateur — Simulateur de Recertification Médéré
# Version 2.0 — Corrigée avec analyse_cibles + brief_commercial v4

## Principes UX
- Mobile-first (90% du trafic constaté)
- Boutons 48px minimum hauteur
- Max 4 étapes avant résultat
- 1 choix par écran (boutons-cartes, pas de saisie texte)
- Barre de progression visible
- Chargement < 2s (Lighthouse 95+)
- **RÈGLE D'OR : résultat GRATUIT avant capture email**

## Principes de vocabulaire (brief commercial v4)
- ✅ "éligible à votre certification" — ❌ JAMAIS "valide votre certification"
- ✅ "pris en charge sans avance de frais via l'ANDPC" — ❌ JAMAIS "remboursé"
- ✅ "atteindre la conformité" — ❌ JAMAIS "être en règle"

## Couleur dynamique
Après l'écran 2, la couleur d'accent s'adapte à la profession choisie :
- MG → #006E90 (teal) | CD → #FECA45 (jaune, texte sombre) | GO-GM → #D87DA9 (rose)
- PED → #17BEBB (cyan) | PSY → #9F84BD (violet)

---

## ÉCRAN 1 — Accroche
**URL** : /
**Contenu** :
- Header discret : logo wordmark Médéré noir + badge "Organisme certifié DPC • Qualiopi"
- Titre : **"Certification périodique : où en êtes-vous ?"**
- Sous-titre : "Le référentiel fait 1 468 pages. Notre simulateur vous donne la réponse en 2 minutes."
- Accroche factuelle sous le sous-titre : "L'obligation est en vigueur depuis le 1er janvier 2023. 2026 est probablement la dernière année de financement ANDPC."
- CTA : bouton primary (#006E90) **"Faire mon diagnostic"**
- Sous le CTA (gris, petit) : "Gratuit • 2 minutes • Aucune donnée collectée avant le résultat"
- Pied discret : "Basé sur l'arrêté du 26 février 2026 — NOR : SFHH2605575A"
**Event GA4** : simulator_start { source }

---

## ÉCRAN 2 — Profession (étape 1/4)
**URL** : /simulateur?step=1
**Question** : "Quelle est votre profession ?"
**5 boutons-cartes** (avec icône ou emoji médical par profession) :
1. Médecin généraliste
2. Chirurgien-dentiste
3. Gynécologue-Obstétricien
4. Pédiatre
5. Psychiatre

**PAS d'option "IDE" ni "Autre"** — hors périmètre Médéré.
Mention sous les boutons : "Ce simulateur couvre les 5 professions dont le référentiel est publié."

**Barre de progression** : Étape 1/4
**Event GA4** : step_completed { step_number: 1, profession: [valeur] }

**Comportement technique** : le choix de profession détermine :
- La couleur d'accent pour le reste du parcours
- La terminologie (Blocs vs Axes) — MG/GO/PED = "Blocs", CD/PSY = "Axes"
- Les intitulés exacts des 4 dimensions
- Les contraintes spécifiques (durée min CD, agrégation PED, etc.)

---

## ÉCRAN 3 — Année de diplôme (étape 2/4)
**URL** : /simulateur?step=2
**Question** : "En quelle année avez-vous obtenu votre diplôme ?"
**4 boutons** :
1. Avant 2000
2. 2000 – 2010
3. 2011 – 2022
4. Après 2023

**Micro-copy** : "Cette information détermine votre échéance de certification."
**Barre de progression** : Étape 2/4
**Event GA4** : step_completed { step_number: 2, diploma_year: [tranche] }

**Logique** :
- Diplômé avant 01/01/2023 : cycle = 9 ans → échéance 2032 (MG et CD uniquement)
- Diplômé après 01/01/2023 : cycle = 6 ans → échéance = année diplôme + 6
- GO-GM, PED, PSY : cycle toujours 6 ans quelle que soit la date de diplôme

---

## ÉCRAN 4 — Formations DPC réalisées (étape 3/4)
**URL** : /simulateur?step=3
**Question** : "Avez-vous suivi des formations DPC ces 3 dernières années ?"
**4 boutons** :
1. Oui, 3 ou plus
2. Oui, 1 ou 2
3. Non, aucune
4. Je ne sais pas

**Barre de progression** : Étape 3/4
**Event GA4** : step_completed { step_number: 3, dpc_formations: [valeur] }

---

## ÉCRAN 5 — Connaissance des blocs (étape 4/4)
**URL** : /simulateur?step=4
**Question dynamique selon profession** :
- MG/GO/PED : "Connaissez-vous les 4 **blocs** de la certification périodique ?"
- CD/PSY : "Connaissez-vous les 4 **axes** de la certification périodique ?"

**3 boutons** :
1. Oui, je connais bien le sujet
2. J'en ai entendu parler
3. Non, pas du tout

**Barre de progression** : Étape 4/4
**Event GA4** : step_completed { step_number: 4, awareness: [valeur] }

---

## ÉCRAN 6 — RÉSULTAT GRATUIT (écran clé)
**URL** : /resultat

### En-tête
- Logo Médéré + "Votre diagnostic certification périodique"
- Couleur d'accent = couleur de la profession

### Jauge de score
- Visuel : jauge circulaire ou barre colorée
- ROUGE (0-2/8) : "Situation critique — actions urgentes nécessaires"
- ORANGE (3-4/8) : "En cours — des actions restent à réaliser"
- VERT (5-8/8) : "Bien avancé — quelques ajustements"
- Score affiché : **"Vous avez validé environ X actions sur 8"**
- Échéance : **"Il vous reste Y actions à réaliser d'ici [année]"**

### Les 4 dimensions (terminologie dynamique)
Affichage adapté à la profession. Exemple pour un MG :
- **Bloc 1** — Connaissances et compétences : ✅ Validé (X/2) ou ⚠️ En cours (X/2) ou ❌ À faire (0/2)
- **Bloc 2** — Qualité des pratiques : idem
- **Bloc 3** — Relation avec les patients : ❌ **À faire (0/2)** — mention "Nouveau bloc créé par la certification périodique"
- **Bloc 4** — Santé personnelle du médecin : ❌ **À faire (0/2)** — mention "Nouveau bloc créé par la certification périodique"

Exemple pour un CD :
- **Axe 1** — Connaissances et compétences : ✅ ou ⚠️ + mention "Formations ≥ 6h obligatoire"
- **Axe 2** — Qualité des pratiques : idem
- **Axe 3** — Relation avec les patients : ❌ À faire
- **Axe 4** — Santé personnelle : ❌ À faire

### Message d'urgence (encadré rouge)
"**2026 est probablement la dernière année où vos formations sont prises en charge sans avance de frais via l'ANDPC.** En 2025, les budgets ont été épuisés dès septembre."

### Contraintes spécifiques (affichées si pertinent)
- **CD** : "Rappel : toute formation doit avoir une durée minimale de 6 heures pour être validante."
- **PED** : "En pédiatrie, 2 actions DPC comptent pour 1 action de certification."
- **PSY** : "Le e-learning Qualiopi est explicitement validant pour l'Axe 1 en psychiatrie."
- **MG** : "Attention : 18 pratiques sont exclues du référentiel MG (homéopathie, ostéopathie…)."

### CTA
Bouton primary : **"Recevoir mon plan d'action personnalisé →"**

**Event GA4** : result_viewed { score, profession, urgency_level, diploma_range }

---

## ÉCRAN 7 — Capture email (gating intelligent)
**URL** : /plan-action

### Titre
"Recevez votre plan d'action personnalisé"

### Ce que contient le plan (liste visible pour justifier la demande d'email)
- ✓ Votre diagnostic détaillé par [bloc/axe] avec les actions précises à réaliser
- ✓ Les formations Médéré éligibles à votre certification ([Blocs/Axes] 1 & 2)
- ✓ Un calendrier recommandé avant la fermeture du financement ANDPC
- ✓ Les prochaines dates de sessions disponibles

### Formulaire
1. **Email professionnel** (obligatoire)
2. **Téléphone** (optionnel) — micro-copy : "Pour un accompagnement personnalisé par un conseiller Médéré — optionnel"
3. **Case RGPD** : "J'accepte de recevoir mon plan d'action et des informations sur les formations Médéré éligibles à ma certification périodique."

### CTA
Bouton primary : **"Recevoir mon plan d'action"**

### Confiance sous le formulaire
- "Vos données sont utilisées uniquement pour vous envoyer votre plan d'action."
- Logo Médéré + "Organisme certifié DPC n°9262 • Qualiopi"

**Events GA4** : email_captured { profession, score, source }, phone_captured (si renseigné)

**Comportement technique** :
1. Soumission → appel POST /api/report
2. Génération PDF personnalisé côté serveur (< 3s)
3. Envoi email avec PDF en pièce jointe
4. Création/maj contact HubSpot avec toutes les propriétés
5. Redirect vers écran 8

---

## ÉCRAN 8 — Confirmation + CTA RDV
**URL** : /plan-action?confirmed=true

### Contenu
- Icône ✅ + "Votre plan d'action est en route !"
- "Consultez votre boîte mail dans les prochaines minutes. Si vous ne le trouvez pas, vérifiez vos spams."
- Aperçu miniature du PDF (image statique du template)

### CTA secondaire
"Vous souhaitez être accompagné(e) ? **Prenez rendez-vous gratuitement avec un conseiller Médéré.**"
Bouton outline : "Prendre rendez-vous" → lien HubSpot meetings (attribué à Jordan)

### Message de confiance
"*Médéré est le seul organisme de formation fondé et dirigé par un médecin, le Dr Harry Sitbon, qui ne vend que des formations conformes aux référentiels officiels de certification périodique.*"

**Event GA4** : rdv_clicked { profession, score }

---

## PDF PERSONNALISÉ — Contenu détaillé

### Page 1 : Couverture
- Logo Médéré wordmark
- Bande de couleur = couleur profession
- "Votre diagnostic certification périodique"
- Profession en toutes lettres
- Date de génération
- "Document personnalisé — confidentiel"

### Page 2 : Votre situation
- Jauge de score (même visuel que l'écran 6)
- Échéance
- Tableau des 4 blocs/axes avec statut et explication
- Mention Blocs 3 & 4 = "Nouveaux blocs. Tous les professionnels partent de zéro."

### Page 3 : Ce que dit le référentiel pour VOTRE profession
- Résumé des actions validantes par bloc/axe (extrait du doc Harry analyse_cibles)
- Contraintes spécifiques (6h CD, agrégation PED, e-learning PSY, exclusions MG)
- Source : "Arrêté du 26 février 2026 — NOR : SFHH2605575A"

### Page 4 : Formations Médéré recommandées (BLOCS 1 & 2 UNIQUEMENT)
- Liste des formations du catalogue filtrées par profession
- Pour chaque formation : titre, durée, format (classe virtuelle/présentiel), prochaine date
- Lien vers la page medere.fr
- Mention : "Ces formations sont éligibles à votre certification périodique (Blocs/Axes 1 & 2)"
- ⚠️ NE PAS lister de formations Blocs 3 & 4 (Médéré n'en propose pas encore)

### Page 5 : Pourquoi agir maintenant
- "2026 est la dernière année de financement ANDPC"
- "En 2025, les budgets étaient épuisés dès septembre"
- "L'e-learning n'est plus indemnisé depuis janvier 2026"
- "Pris en charge sans avance de frais — pas un centime à avancer"
- "21h de formation par an : c'est votre droit, financé par les cotisations"

### Page 6 : À propos de Médéré + CTA
- Pitch : "Médéré est le seul organisme de formation fondé et dirigé par un médecin..."
- Photo/signature Dr Harry Sitbon
- Critères réglementaires respectés (comité scientifique, DPI, indépendance industrie, Qualiopi)
- CTA : "Prenez rendez-vous avec un conseiller" + tel + email + lien HubSpot meetings
- Mentions légales + RGPD

---

## Logique de scoring

### Échéance
- MG, CD : diplômé avant 01/01/2023 → 2032 (9 ans) | après → année + 6
- GO-GM, PED, PSY : toujours 6 ans à partir de la date de diplôme

### Score Blocs/Axes 1 & 2 (basé sur formations DPC déclarées)
| Formations DPC déclarées | Actions brutes | Bloc/Axe 1 | Bloc/Axe 2 |
|--------------------------|---------------|-----------|-----------|
| 3 ou plus | 4 | 2/2 ✅ | 2/2 ✅ |
| 1 ou 2 | 2 | 2/2 ✅ | 0/2 ❌ |
| Aucune | 0 | 0/2 ❌ | 0/2 ❌ |
| Je ne sais pas | 1 | 1/2 ⚠️ | 0/2 ❌ |

### Score Blocs/Axes 3 & 4 = TOUJOURS 0/2
Les Blocs 3 & 4 n'existaient pas avant la certification périodique.
Aucune formation DPC antérieure ne les couvre. 100% des PS partent de zéro.

### Ajustement pédiatrie
En pédiatrie, diviser les actions brutes par 2 (car 2 DPC = 1 action CP).
"3 ou plus" DPC → 2 actions brutes → Bloc 1 = 2/2, Bloc 2 = 0/2.

### Niveau d'urgence
- ROUGE : 0-2 actions (score total /8)
- ORANGE : 3-4 actions
- VERT : 5+ actions (théoriquement impossible sans Blocs 3-4, mais prévu)
