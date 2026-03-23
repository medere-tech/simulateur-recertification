# SPÉCIFICATIONS DESIGN — PDF Rapport Certification Médéré

## RÉFÉRENCE : Direction artistique Médéré (templates formation)

Les templates Médéré (dans design-references/) suivent ces principes stricts.
Le PDF du simulateur DOIT les respecter à la lettre.

---

## 1. FORMES ORGANIQUES (BLOBS)

### Ce que c'est
Des formes arrondies, douces, asymétriques (type "blob" ou "pétale") 
qui servent de décoration graphique. Elles sont TOUJOURS présentes 
sur les slides Médéré.

### Disposition obligatoire
- **3 blobs minimum** qui se chevauchent partiellement
- **Position haut-droite** : un grand blob principal (couleur profession)
- **Position haut-gauche** : un blob secondaire (rose #D87DA9), 
  partiellement masqué/caché derrière le premier ou débordant du cadre
- **Position bas-droite OU bas-gauche** : un blob d'accent (couleur complémentaire)
- Les blobs DÉBORDENT du cadre de la page (ils sont coupés par les bords)
- Ils couvrent environ 25-35% de la surface de la page

### Couleurs des blobs par profession
| Profession | Blob principal | Blob secondaire | Blob accent |
|-----------|---------------|-----------------|-------------|
| MG | #006E90 (teal foncé) | #D87DA9 (rose) | #17BEBB (teal clair) |
| CD | #FECA45 (jaune) | #D87DA9 (rose) | #006E90 (teal) |
| GO | #D87DA9 (rose) | #006E90 (teal) | #9F84BD (violet) |
| PED | #17BEBB (teal clair) | #D87DA9 (rose) | #006E90 (teal foncé) |
| PSY | #9F84BD (violet) | #D87DA9 (rose) | #006E90 (teal) |
| AUTRE | #2DA131 (vert) | #D87DA9 (rose) | #17BEBB (teal) |

### Formes SVG (3 blobs différents)
Les blobs doivent être des Path SVG avec des courbes de Bézier cubiques (C).
Chaque blob a une forme DIFFÉRENTE — ne pas dupliquer la même forme.

Blob 1 (principal, haut-droite) — viewBox "0 0 500 500" :
```
M 400,0 C 500,50 520,200 480,300 C 440,400 350,450 250,420 
C 150,390 100,300 120,200 C 140,100 200,20 300,0 Z
```

Blob 2 (secondaire, haut-gauche) — viewBox "0 0 400 400" :
```
M 0,100 C 30,30 150,0 250,30 C 350,60 380,180 350,280 
C 320,380 200,400 100,360 C 0,320 -30,200 0,100 Z
```

Blob 3 (accent, bas-droite ou bas-gauche) — viewBox "0 0 350 350" :
```
M 175,0 C 280,20 350,100 340,200 C 330,300 260,350 175,345 
C 90,340 20,280 10,175 C 0,70 70,-20 175,0 Z
```

### Positionnement (en absolute sur la page A4 = 595 x 842 pts)
- Blob 1 : position: absolute, top: -80, right: -100, width: 380, height: 380
- Blob 2 : position: absolute, top: -60, left: -120, width: 300, height: 300
- Blob 3 : position: absolute, bottom: -80, right: -60, width: 280, height: 280

### IMPORTANT
- Les blobs sont sur la PAGE 1 (couverture) uniquement en version complète
- Sur les pages intérieures, PAS de blobs (juste le fond beige + header)
- Les blobs doivent avoir une légère opacité de 0.9 (pas 1.0) pour l'effet de superposition

---

## 2. ENCADRÉS / INFO BOXES

### Style Médéré (OBLIGATOIRE)
Les encadrés dans les templates Médéré sont TOUJOURS :
- **Fond** : blanc #FFFFFF ou beige très léger #F9F5F2
- **Barre gauche** : 4pt d'épaisseur, couleur contextuelle
- **PAS de bordure** sur les 3 autres côtés (top, right, bottom)
- **PAS de borderRadius** sur le conteneur
- **Padding** : 16pt vertical, 20pt horizontal (après la barre gauche)

### Couleurs de la barre gauche selon le contexte
- Information neutre : couleur profession
- Positif / validé : #2DA131 (vert)
- Attention / warning : #EA6C00 (orange)  
- Urgent / danger : #CC0000 (rouge)
- Blocs 3&4 nouveaux : #CC0000 (rouge)

### CE QU'IL NE FAUT JAMAIS FAIRE
- ❌ Bordure complète autour de l'encadré (border: 1px solid)
- ❌ BorderRadius sur l'encadré
- ❌ Fond gris ou coloré opaque
- ❌ Box shadow

---

## 3. TABLEAUX

### Style Médéré pour les tableaux
Les tableaux DOIVENT avoir :
- **Bordure extérieure complète** : 1pt solid #DBD6CD sur les 4 côtés
- **BorderRadius** : 8pt sur le conteneur global
- **Séparateurs horizontaux** : 1pt solid #F0EAE5 entre chaque ligne
- **PAS de séparateurs verticaux** entre les colonnes
- **Header du tableau** : fond #F0EAE5, texte en Aileron SemiBold, couleur #494343
- **Lignes de données** : fond blanc #FFFFFF (pas d'alternance)
- **Padding cellules** : 12pt vertical, 16pt horizontal

### Couleurs dans les cellules
- "Validé" : texte vert #2DA131, score en gras vert
- "À faire" : texte rouge #CC0000, score en gras rouge
- "En cours" : texte orange #EA6C00, score en gras orange
- "Nouveau — À faire" : texte rouge #CC0000
- "Couvert par Médéré" : texte vert #2DA131
- "Hors catalogue" : texte gris #9C9494

---

## 4. FOND DE PAGE

- **Toutes les pages** : fond #F9F5F2 (beige chaud Médéré)
- **JAMAIS** de fond blanc pur #FFFFFF pour la page entière
- Les éléments sur la page (encadrés, tableaux) peuvent être en blanc #FFFFFF 
  pour créer du contraste avec le fond beige

---

## 5. TYPOGRAPHIE

- **Titres principaux** : Aileron Bold, 24pt, couleur #302D2D
- **Sous-titres** : Aileron SemiBold, 14pt, couleur #494343
- **Corps de texte** : Aileron Regular, 10pt, couleur #554F4F
- **Labels/petits textes** : Aileron Light, 8pt, couleur #9C9494
- **Score (2/8)** : Aileron Bold, 48pt, couleur urgency
- **Profession** : Aileron SemiBold, 16pt, couleur profession

---

## 6. BULLETS

- Forme : cercle plein (●)
- Taille : 6pt de diamètre
- Couleur : couleur de la profession (pas noir, pas gris)
- Espacement : 10pt entre le bullet et le texte
- Espacement vertical : 16pt entre chaque item de liste

---

## 7. LOGO MÉDÉRÉ

- **Couverture (page 1)** : 100px de large max, centré horizontalement
- **Pages intérieures (header)** : 55px de large, en haut à gauche
- **Page 6 (à propos)** : 80px de large, aligné à gauche
- TOUJOURS préserver le ratio (width auto ou height auto)

---

## 8. BADGE URGENCY (page 2)

- Forme : pill (borderRadius élevé)
- Fond : couleur urgency (rouge #CC0000, orange #EA6C00, vert #2DA131)
- Texte : blanc, Aileron SemiBold, 12pt
- Padding : 8pt vertical, 24pt horizontal

---

## 9. CTA (page 6)

- Fond : couleur profession (plein, opacité 1.0)
- BorderRadius : 12pt
- Texte titre : blanc, Aileron SemiBold, 16pt
- Labels (Tél., Email, Web) : blanc opacity 0.7, Aileron Regular, 9pt
- Valeurs (01 88..., contact@...) : blanc, Aileron SemiBold, 11pt
- Padding : 24pt

---

## 10. FOOTER (toutes les pages)

- Ligne séparatrice : 0.5pt solid #DBD6CD
- Texte : "Médéré — Document confidentiel — Mars 2026"
- Police : Aileron Light, 7pt, couleur #9C9494
- Position : 30pt du bas de la page

---

## RÉSUMÉ DES PRINCIPES

1. Fond beige #F9F5F2 partout
2. 3 blobs organiques multicolores sur la couverture UNIQUEMENT
3. Encadrés = barre gauche colorée + fond blanc, JAMAIS de bordure complète
4. Tableaux = bordure extérieure complète + séparateurs horizontaux + borderRadius
5. Typographie Aileron (Bold/SemiBold/Regular/Light)
6. Couleurs chaudes et professionnelles, pas cliniques
7. Espacement généreux
8. Logo proportionné et discret
