# Quelques détails sur le simulateur
## Ordre des formats - Où le modifier manuellement
C'est dans lib/airtable.ts, dans la constante FORMAT_ORDER à l'intérieur de selectFormationsForReport(). 

Tu verras :
- typescriptconst FORMAT_ORDER = ["E-Learning", "Classe virtuelle", "Présentiel"];
Pour passer en Présentiel → Classe virtuelle → E-Learning, change simplement en :
- typescriptconst FORMAT_ORDER = ["Présentiel", "Classe virtuelle", "E-Learning"];
Pour infos, le premier de la liste est celui qui sera choisi en priorité. 