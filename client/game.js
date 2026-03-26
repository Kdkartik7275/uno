/* ═══════════════════════════════════════════════
   UNO — game.js
   Surgical DOM updates — only changed sections
   re-rendered, no full-screen flicker.
═══════════════════════════════════════════════ */

/* ─── CONSTANTS ──────────────────────────────── */
const COLORS = ['red','blue','green','yellow'];
const VALUES = ['0','1','2','3','4','5','6','7','8','9','skip','reverse','draw2'];
const WILDS  = ['wild','wild4'];

/* ─── STATE ──────────────────────────────────── */
let deck        = [];
let playerHand  = [];
let cpuHand     = [];
let discardPile = [];
let currentColor = '';
let currentValue = '';
let isPlayerTurn = true;
let direction    = 1;     // 1=cw, -1=ccw
let pendingWild  = false;
let calledUno    = false;
let scorePlayer  = 0;
let scoreCpu     = 0;
let cpuTimer     = null;
let toastTimer   = null;

/* ═══════════════════════════════════════════════
   DECK
═══════════════════════════════════════════════ */
function buildDeck() {
  const d = [];
  COLORS.forEach(color => {
    VALUES.forEach(value => {
      d.push({ color, value });
      if (value !== '0') d.push({ color, value });
    });
  });
  WILDS.forEach(value => {
    for (let i = 0; i < 4; i++) d.push({ color: 'wild', value });
  });
  return d;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function deal() {
  if (!deck.length) reshuffleDiscard();
  return deck.pop();
}

function reshuffleDiscard() {
  const top = discardPile.pop();
  deck = shuffle([...discardPile]);
  discardPile = [top];
  showToast('Deck reshuffled 🔀');
}

/* ═══════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════ */
function initGame() {
  clearTimeout(cpuTimer);

  deck        = shuffle(buildDeck());
  playerHand  = [];
  cpuHand     = [];
  discardPile = [];
  isPlayerTurn = true;
  direction    = 1;
  pendingWild  = false;
  calledUno    = false;

  for (let i = 0; i < 7; i++) {
    playerHand.push(deal());
    cpuHand.push(deal());
  }

  // Non-wild starter
  let starter;
  do { starter = deal(); } while (starter.color === 'wild');
  discardPile.push(starter);
  currentColor = starter.color;
  currentValue = starter.value;

  document.getElementById('win-overlay').classList.remove('show');
  document.getElementById('conf-wrap').innerHTML = '';
  document.getElementById('thinking').classList.remove('active');

  renderCPUHand();
  renderPlayerHand();
  renderDiscard();
  updateHUD();
  updateColorDot();
  updateDir();
}

/* ═══════════════════════════════════════════════
   LABEL HELPERS
═══════════════════════════════════════════════ */
function cardLabel(value) {
  const map = { skip: '⊘', reverse: '↺', draw2: '+2', wild: '★', wild4: '+4' };
  return map[value] ?? value;
}

/* ═══════════════════════════════════════════════
   DOM CARD BUILDERS
═══════════════════════════════════════════════ */
function makeCard(card, forPlayer = false, idx = -1) {
  const el  = document.createElement('div');
  const lbl = cardLabel(card.value);
  const cls = card.color === 'wild' ? 'wild' : card.color;

  el.className = `card ${cls}`;
  el.innerHTML = `
    <div class="card-oval"></div>
    <span class="cc-tl">${lbl}</span>
    <span class="cc-mid">${lbl}</span>
    <span class="cc-br">${lbl}</span>
  `;

  if (forPlayer) {
    el.classList.add('p-card');
    el.style.animationDelay = `${idx * 0.04}s`;

    if (canPlay(card) && isPlayerTurn) {
      el.classList.add('can-play');
      el.addEventListener('click', () => onPlayCard(idx, el));
    } else {
      el.classList.add('no-play');
    }
  }
  return el;
}

function makeBackCard(index) {
  const el = document.createElement('div');
  el.className = 'card back cpu-c';
  const r = ((index * 7 + 3) % 10 - 5).toFixed(1);
  el.style.setProperty('--r', `${r}deg`);
  el.style.transform     = `rotate(${r}deg)`;
  el.style.animationDelay = `${index * 0.035}s`;
  el.innerHTML = `<div class="card-oval"></div><span class="back-txt">UNO</span>`;
  return el;
}

/* ═══════════════════════════════════════════════
   SURGICAL RENDERS
═══════════════════════════════════════════════ */
function renderPlayerHand() {
  const c = document.getElementById('player-hand');
  c.innerHTML = '';
  playerHand.forEach((card, i) => c.appendChild(makeCard(card, true, i)));
}

function renderCPUHand() {
  const c = document.getElementById('cpu-hand');
  c.innerHTML = '';
  cpuHand.forEach((_, i) => c.appendChild(makeBackCard(i)));
}

function renderDiscard() {
  const c = document.getElementById('discard-pile');
  c.innerHTML = '';

  if (discardPile.length >= 2) {
    const prev = discardPile[discardPile.length - 2];
    const el   = makeCard(prev);
    el.classList.add('prev-top');
    const rot = ((discardPile.length * 17 + 3) % 14 - 7).toFixed(1);
    el.style.transform = `rotate(${rot}deg)`;
    c.appendChild(el);
  }

  const top = discardPile[discardPile.length - 1];
  const el  = makeCard(top);
  el.classList.add('cur-top');
  const rot2 = ((discardPile.length * 13 + 7) % 12 - 6).toFixed(1);
  el.style.setProperty('--drot', `rotate(${rot2}deg)`);
  c.appendChild(el);

  // Update active-color border ring on discard
  const colorMap = { red:'#e8192c', blue:'#0057b7', green:'#00a550', yellow:'#ffda00', wild:'rgba(255,255,255,0.5)' };
  c.style.setProperty('--active-border', colorMap[currentColor] || 'transparent');
}

function updateHUD() {
  const pc = playerHand.length;
  const cc = cpuHand.length;

  // Turn indicator
  const ti = document.getElementById('turn-indicator');
  if (isPlayerTurn) {
    ti.textContent = 'YOUR TURN';
    ti.className   = 'turn-you';
  } else {
    ti.textContent = 'CPU TURN';
    ti.className   = 'turn-cpu';
  }

  // Card counts
  document.getElementById('player-count').textContent = pc;
  document.getElementById('cpu-count').textContent    = cc;

  const pcEl = document.getElementById('player-count');
  const ccEl = document.getElementById('cpu-count');
  pc === 1 ? pcEl.classList.add('uno-hot')    : pcEl.classList.remove('uno-hot');
  cc === 1 ? ccEl.classList.add('uno-hot')    : ccEl.classList.remove('uno-hot');

  // Scores
  document.getElementById('score-p').textContent = scorePlayer;
  document.getElementById('score-c').textContent = scoreCpu;

  // UNO button
  document.getElementById('uno-btn').disabled = !(playerHand.length === 2 && isPlayerTurn);
}

function updateColorDot() {
  document.getElementById('active-color-dot').className  = `color-dot ${currentColor}`;
  document.getElementById('active-color-name').textContent = currentColor.toUpperCase();
}

function updateDir() {
  document.getElementById('dir-indicator').textContent = direction === 1 ? '↺' : '↻';
}

/* ═══════════════════════════════════════════════
   RULES
═══════════════════════════════════════════════ */
function canPlay(card) {
  if (card.color === 'wild') return true;
  return card.color === currentColor || card.value === currentValue;
}

/* ═══════════════════════════════════════════════
   PLAYER ACTIONS
═══════════════════════════════════════════════ */
function onPlayCard(idx, el) {
  if (!isPlayerTurn) return;
  const card = playerHand[idx];
  if (!canPlay(card)) return;

  el.classList.add('playing');

  setTimeout(() => {
    playerHand.splice(idx, 1);
    discardPile.push(card);
    currentValue = card.value;
    calledUno    = false;

    renderDiscard();
    updateHUD();

    if (!playerHand.length) {
      renderPlayerHand();
      endRound('player');
      return;
    }

    if (card.color === 'wild') {
      pendingWild = card.value;
      renderPlayerHand();
      setTimeout(() => document.getElementById('color-modal').classList.add('open'), 90);
      return;
    }

    currentColor = card.color;
    updateColorDot();
    applyEffect(card.value, 'player');
  }, 280);
}

function onDraw() {
  if (!isPlayerTurn) return;
  const card = deal();
  playerHand.push(card);
  showToast(canPlay(card) ? 'Drew a playable card! 🃏' : 'Drew a card');
  renderPlayerHand();
  updateHUD();
  isPlayerTurn = false;
  updateHUD();
  document.getElementById('thinking').classList.add('active');
  setTimeout(scheduleCPU, 550);
}

function callUno() {
  if (playerHand.length !== 2 || !isPlayerTurn) return;
  calledUno = true;
  document.getElementById('uno-btn').disabled = true;
  showToast('UNO! 🔥', 2000);
}

function chooseColor(color) {
  document.getElementById('color-modal').classList.remove('open');
  currentColor = color;
  updateColorDot();
  renderDiscard();  // update border ring

  const was4 = (pendingWild === 'wild4');
  pendingWild = false;

  if (was4) {
    for (let i = 0; i < 4; i++) cpuHand.push(deal());
    showToast('CPU draws 4! 😈');
    renderCPUHand();
    updateHUD();
  }

  isPlayerTurn = false;
  updateHUD();
  document.getElementById('thinking').classList.add('active');
  scheduleCPU();
}

/* ═══════════════════════════════════════════════
   EFFECTS
═══════════════════════════════════════════════ */
function applyEffect(value, who) {
  const hideThinker = () => document.getElementById('thinking').classList.remove('active');
  const showThinker = () => document.getElementById('thinking').classList.add('active');

  switch (value) {
    case 'skip':
      showToast(who === 'player' ? 'CPU skipped! ⊘' : 'Skipped! ⊘');
      if (who === 'player') {
        isPlayerTurn = true; hideThinker(); renderPlayerHand(); updateHUD();
      } else {
        isPlayerTurn = false; showThinker(); updateHUD(); scheduleCPU();
      }
      break;

    case 'reverse':
      direction *= -1; updateDir();
      showToast('Reversed! ↺');
      if (who === 'player') {
        isPlayerTurn = true; hideThinker(); renderPlayerHand(); updateHUD();
      } else {
        isPlayerTurn = false; showThinker(); updateHUD(); scheduleCPU();
      }
      break;

    case 'draw2':
      if (who === 'player') {
        for (let i = 0; i < 2; i++) cpuHand.push(deal());
        showToast('CPU draws 2! 🃏');
        renderCPUHand(); updateHUD();
        isPlayerTurn = true; hideThinker(); renderPlayerHand(); updateHUD();
      } else {
        for (let i = 0; i < 2; i++) playerHand.push(deal());
        showToast('You draw 2! 😖');
        renderPlayerHand(); updateHUD();
        isPlayerTurn = true; hideThinker(); updateHUD();
      }
      break;

    default:
      if (who === 'player') {
        isPlayerTurn = false; showThinker(); updateHUD(); scheduleCPU();
      } else {
        isPlayerTurn = true; hideThinker(); renderPlayerHand(); updateHUD();
      }
  }
}

/* ═══════════════════════════════════════════════
   CPU AI
═══════════════════════════════════════════════ */
function scheduleCPU() {
  clearTimeout(cpuTimer);
  cpuTimer = setTimeout(cpuTurn, 900 + Math.random() * 600);
}

function cpuTurn() {
  if (isPlayerTurn) return;

  const playable = cpuHand.filter(canPlay);

  if (!playable.length) {
    const drawn = deal();
    cpuHand.push(drawn);
    showToast('CPU draws a card 🤖');
    renderCPUHand(); updateHUD();

    if (canPlay(drawn)) {
      cpuTimer = setTimeout(() => cpuPlayCard(drawn), 720);
    } else {
      isPlayerTurn = true;
      document.getElementById('thinking').classList.remove('active');
      renderPlayerHand(); updateHUD();
    }
    return;
  }

  // Priority: wild4 > draw2 > skip > reverse > wild > same-color > other
  const priority = card => {
    if (card.value === 'wild4')   return 6;
    if (card.value === 'draw2')   return 5;
    if (card.value === 'skip')    return 4;
    if (card.value === 'reverse') return 3;
    if (card.color === 'wild')    return 2;
    if (card.color === currentColor) return 1;
    return 0;
  };

  playable.sort((a, b) => priority(b) - priority(a));
  cpuPlayCard(playable[0]);
}

function cpuPlayCard(card) {
  const idx = cpuHand.indexOf(card);
  if (idx === -1) return;

  cpuHand.splice(idx, 1);
  discardPile.push(card);
  currentValue = card.value;

  document.getElementById('thinking').classList.remove('active');
  renderCPUHand(); renderDiscard(); updateHUD();

  if (!cpuHand.length) { endRound('cpu'); return; }
  if (cpuHand.length === 1) showToast('CPU says UNO! 🤖');

  if (card.color === 'wild') {
    // CPU picks most common color in its hand
    const cnt = { red:0, blue:0, green:0, yellow:0 };
    cpuHand.forEach(c => { if (cnt[c.color] !== undefined) cnt[c.color]++; });
    currentColor = Object.entries(cnt).sort((a,b) => b[1]-a[1])[0][0];
    updateColorDot();
    renderDiscard();

    if (card.value === 'wild4') {
      for (let i = 0; i < 4; i++) playerHand.push(deal());
      showToast('CPU plays +4! You draw 4! 😱');
      renderPlayerHand(); updateHUD();
      isPlayerTurn = true; updateHUD();
      return;
    }

    isPlayerTurn = true; renderPlayerHand(); updateHUD();
    return;
  }

  currentColor = card.color;
  updateColorDot();
  renderDiscard();
  applyEffect(card.value, 'cpu');
}

/* ═══════════════════════════════════════════════
   END ROUND
═══════════════════════════════════════════════ */
function endRound(winner) {
  clearTimeout(cpuTimer);

  if (winner === 'player') {
    scorePlayer++;
    document.getElementById('win-emoji').textContent  = '🎉';
    document.getElementById('win-title').textContent  = 'YOU WIN!';
    document.getElementById('win-title').style.color  = '#40d880';
    document.getElementById('win-sub').textContent    = 'Computer ran out of cards!';
    spawnConfetti();
  } else {
    scoreCpu++;
    document.getElementById('win-emoji').textContent  = '🤖';
    document.getElementById('win-title').textContent  = 'CPU WINS!';
    document.getElementById('win-title').style.color  = '#ff6060';
    document.getElementById('win-sub').textContent    = 'Better luck next time!';
  }

  document.getElementById('wp').textContent      = scorePlayer;
  document.getElementById('wc').textContent      = scoreCpu;
  document.getElementById('score-p').textContent = scorePlayer;
  document.getElementById('score-c').textContent = scoreCpu;

  setTimeout(() => document.getElementById('win-overlay').classList.add('show'), 500);
}

function spawnConfetti() {
  const wrap = document.getElementById('conf-wrap');
  wrap.innerHTML = '';
  const colors = ['#ff6060','#4da8ff','#40d880','#ffe84d','#ff9800','#e040fb'];

  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    el.className = 'conf-piece';
    el.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${colors[i % colors.length]};
      width:  ${5 + Math.random() * 9}px;
      height: ${5 + Math.random() * 9}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation-delay:    ${Math.random() * 1.0}s;
      animation-duration: ${1.4 + Math.random() * 0.9}s;
    `;
    wrap.appendChild(el);
  }
}

/* ═══════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════ */
function showToast(message, duration = 1600) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

/* ═══════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════ */
initGame();