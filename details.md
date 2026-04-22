# Quelques détails sur le simulateur
## Ordre des formats - Où le modifier manuellement
C'est dans lib/airtable.ts, dans la constante FORMAT_ORDER à l'intérieur de selectFormationsForReport(). 
Tu verras :
- typescriptconst FORMAT_ORDER = ["E-Learning", "Classe virtuelle", "Présentiel"];
Pour passer en Présentiel → Classe virtuelle → E-Learning, change simplement en :
- typescriptconst FORMAT_ORDER = ["Présentiel", "Classe virtuelle", "E-Learning"];
Pour infos, le premier de la liste est celui qui sera choisi en priorité. 

## Créneaux de prise de rendez-vous :
C'est dans components/RdvModal.tsx. Cherche le const HEURES = pour les créneaux horaires. Tu verras quelque chose comme :
    const HEURES = [
        "9h - 10h",
        "10h - 12h",
        "12h - 14h",
        "14h - 16h",
        "16h - 18h",
        "18h - 18h30",
    ];
...
Pour infos, tu peux ajouter, supprimer ou modifier les options directement. Par exemple, ajouter un créneau "7h - 8h" ou supprimer "18h - 20h".


## Tout est propre et fonctionnel. Le projet simulateur est complet.
Récap des fichiers à modifier manuellement quand tu veux :
- Créneaux de rendez-vous : components/RdvModal.tsx → les <option> dans le select
- Ordre des formats : lib/airtable.ts → const FORMAT_ORDER = [...]
- Formations prioritaires : lib/airtable.ts → const PRIORITY_FORMATIONS = {...}
- Label du champ email : components/LeadForm.tsx → le texte du label