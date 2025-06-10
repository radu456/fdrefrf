// app.js
const matchesSection = document.getElementById('matches');
const ticketSection = document.getElementById('ticket');
const statsSection = document.getElementById('stats');

let matches = [];
let ticket = [];

// Adaugă meci nou
addMatch.onclick = () => {
  const team1 = prompt("Echipa 1:");
  const team2 = prompt("Echipa 2:");
  if (team1 && team2) {
    const match = {
      id: Date.now(),
      team1,
      team2,
      prediction: generatePrediction(team1, team2)
    };
    matches.push(match);
    renderMatches();
  }
};

function generatePrediction(t1, t2) {
  const predictions = ["1", "X", "2", "GG", "NG", "Over 2.5", "Under 2.5"];
  const confidence = Math.floor(Math.random() * 51) + 50; // 50–100%
  const type = predictions[Math.floor(Math.random() * predictions.length)];
  return `${type} (${confidence}%)`;
}

function renderMatches() {
  matchesSection.innerHTML = '';
  matches.forEach(m => {
    const div = document.createElement('div');
    div.innerHTML = `<strong>${m.team1} - ${m.team2}</strong>: ${m.prediction}`;
    matchesSection.appendChild(div);
  });
}

// Generează bilet AI
generateTicket.onclick = () => {
  if (matches.length === 0) return alert("Adaugă măcar un meci!");
  ticket = matches.map(m => `${m.team1} - ${m.team2}: ${m.prediction}`);
  renderTicket();
};

function renderTicket() {
  ticketSection.innerHTML = '<h2>Biletul AI 🧠</h2>';
  ticket.forEach(p => {
    const pElem = document.createElement('p');
    pElem.textContent = p;
    ticketSection.appendChild(pElem);
  });
}
