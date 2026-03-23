const fs = require('fs');

fetch('http://localhost:3000/api/report', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    profession: 'MG',
    diplomaYear: 'avant_2000',
    dpcFormations: '1_ou_2',
    awareness: 'non',
    email: 'test@medere.fr',
    score: 2,
    urgency: 'rouge',
    bloc1Status: 'valide',
    bloc2Status: 'a_faire'
  })
}).then(r => r.json()).then(d => {
  fs.writeFileSync('rapport-medere.pdf', Buffer.from(d.pdf, 'base64'));
  console.log('PDF sauvegardé ! Ouvre rapport-medere.pdf');
}).catch(e => console.error('Erreur:', e));