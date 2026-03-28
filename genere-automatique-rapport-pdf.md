## 1er commande sur github bash
curl -s -X POST http://localhost:3000/api/report -H "Content-Type: application/json" -d "{\"profession\":\"MG\",\"diplomaYear\":\"avant_2000\",\"dpcFormations\":\"1_ou_2\",\"awareness\":\"non\",\"email\":\"test@medere.fr\",\"score\":2,\"urgency\":\"rouge\",\"bloc1Status\":\"valide\",\"bloc2Status\":\"a_faire\"}" -o rapport-test.json

## 2èm commande sur github bas
node -e "const d=require('./rapport-test.json'); require('fs').writeFileSync('rapport-v5.pdf', Buffer.from(d.pdf, 'base64')); console.log('PDF sauvegardé : rapport-v5.pdf (' + Math.round(d.pdf.length * 0.75 / 1024) + ' KB)');"