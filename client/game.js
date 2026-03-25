/* ═══════════════════════════════════════════════════════════════════════════
   UNO — game.js
   Full game logic: deck, dealing, player & CPU turns, animations, UI
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Constants ──────────────────────────────────────────────────────────── */
const COLORS = ['red', 'blue', 'green', 'yellow'];
const VALUES = ['0','1','2','3','4','5','6','7','8','9','skip','reverse','draw2'];
const WILDS  = ['wild', 'wild4'];

/* ── Game State ─────────────────────────────────────────────────────────── */
let deck        = [];
let playerHand  = [];
let cpuHand     = [];
let discardPile = [];

let currentColor = '';
let currentValue = '';
let isPlayerTurn = true;
let direction    = 1;          // 1 = clockwise, -1 = counter-clockwise
let pendingWild  = false;
let calledUno    = false;

let scorePlayer = 0;
let scoreCpu    = 0;

let cpuTimer   = null;
let toastTimer = null;

/* ══════════════════════════════════════════════════════════════════════════
   DECK MANAGEMENT
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Build a full 108-card UNO deck.
 * Each color has: 0×1, 1–9×2, skip×2, reverse×2, draw2×2  = 25 cards × 4 colors = 100
 * Wild×4, Wild+4×4 = 8
 * Total = 108
 */
function buildDeck() {
  const d = [];
  COLORS.forEach(color => {
    VALUES.forEach(value => {
      d.push({ color, value });
      if (value !== '0') d.push({ color, value }); // duplicate all except 0
    });
  });
  WILDS.forEach(value => {
    for (let i = 0; i < 4; i++) d.push({ color: 'wild', value });
  });
  return d;
}

/** Fisher-Yates shuffle — mutates and returns the array */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Deal one card from top of deck; reshuffles discard if deck is empty */
function deal() {
  if (!deck.length) reshuffleDiscard();
  return deck.pop();
}

/** Reshuffle the discard pile back into the draw pile (keep top card) */
function reshuffleDiscard() {
  const topCard = discardPile.pop();
  deck = shuffle([...discardPile]);
  discardPile = [topCard];
  toast('Deck reshuffled! 🔀', 1400);
}

/* ══════════════════════════════════════════════════════════════════════════
   GAME INIT
   ══════════════════════════════════════════════════════════════════════════ */

function initGame() {
  clearTimeout(cpuTimer);

  // Reset state
  deck        = shuffle(buildDeck());
  playerHand  = [];
  cpuHand     = [];
  discardPile = [];
  isPlayerTurn = true;
  direction    = 1;
  pendingWild  = false;
  calledUno    = false;

  // Deal 7 cards to each player
  for (let i = 0; i < 7; i++) {
    playerHand.push(deal());
    cpuHand.push(deal());
  }

  // Pick a non-wild starter card for the discard pile
  let starter;
  do { starter = deal(); } while (starter.color === 'wild');
  discardPile.push(starter);
  currentColor = starter.color;
  currentValue = starter.value;

  // Reset UI
  document.getElementById('win-overlay').classList.remove('show');
  document.getElementById('sp').textContent = scorePlayer;
  document.getElementById('sc').textContent = scoreCpu;

  render();
}

/* ══════════════════════════════════════════════════════════════════════════
   CARD LABEL HELPERS
   ══════════════════════════════════════════════════════════════════════════ */

function cardLabel(value) {
  switch (value) {
    case 'skip':    return '⊘';
    case 'reverse': return '↺';
    case 'draw2':   return '+2';
    case 'wild':    return '★';
    case 'wild4':   return '+4';
    default:        return value;
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   DOM CARD BUILDERS
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Create a card <div> element.
 * @param {Object}  card       - { color, value }
 * @param {boolean} forPlayer  - add player interaction classes
 * @param {number}  idx        - index in playerHand (for click handler)
 */
function makeCard(card, forPlayer = false, idx = -1) {
  const el  = document.createElement('div');
  const lbl = cardLabel(card.value);

  el.className = `card ${card.color === 'wild' ? 'wild' : card.color}`;
  el.innerHTML = `<span class="tl">${lbl}</span>${lbl}<span class="br">${lbl}</span>`;

  if (forPlayer) {
    el.classList.add('p-card');
    el.style.animationDelay = `${idx * 0.04}s`;

    if (canPlay(card) && isPlayerTurn) {
      el.classList.add('playable');
      el.addEventListener('click', () => onPlayCard(idx, el));
    } else {
      el.classList.add('blocked');
    }
  }

  return el;
}

/** Create a face-down card for the CPU hand */
function makeBackCard(index) {
  const el = document.createElement('div');
  el.className = 'card back cpu-card';

  // Deterministic but visually varied rotation per slot
  const rotation = ((index * 7 + 3) % 10 - 5).toFixed(1);
  el.style.setProperty('--r', `${rotation}deg`);
  el.style.transform    = `rotate(${rotation}deg)`;
  el.style.animationDelay = `${index * 0.04}s`;
  el.innerHTML = '<div class="back-lbl">UNO</div>';

  return el;
}

/* ══════════════════════════════════════════════════════════════════════════
   RENDER FUNCTIONS
   ══════════════════════════════════════════════════════════════════════════ */

/** Full re-render of the UI */
function render() {
  renderCPUHand();
  renderPlayerHand();
  renderDiscardPile();
  renderCounts();
  renderTurnBadge();
  renderColorIndicator();
  renderDirectionRing();
  renderUnoButton();
}

function renderPlayerHand() {
  const container = document.getElementById('player-hand');
  container.innerHTML = '';
  playerHand.forEach((card, i) => container.appendChild(makeCard(card, true, i)));
}

function renderCPUHand() {
  const container = document.getElementById('cpu-hand');
  container.innerHTML = '';
  cpuHand.forEach((_, i) => container.appendChild(makeBackCard(i)));
}

function renderDiscardPile() {
  const container = document.getElementById('discard-pile');
  container.innerHTML = '';

  // Show second-to-top card slightly behind for depth
  if (discardPile.length >= 2) {
    const prevCard = discardPile[discardPile.length - 2];
    const el = makeCard(prevCard);
    el.classList.add('prev-card');
    const rot = ((discardPile.length * 17 + 3) % 14 - 7).toFixed(1);
    el.style.transform = `rotate(${rot}deg)`;
    container.appendChild(el);
  }

  // Top card with land animation
  const topCard = discardPile[discardPile.length - 1];
  const el = makeCard(topCard);
  el.classList.add('top-card');
  const rot2 = ((discardPile.length * 13 + 7) % 12 - 6).toFixed(1);
  el.style.setProperty('--rot', `rotate(${rot2}deg)`);
  container.appendChild(el);
}

function renderCounts() {
  const pc = playerHand.length;
  const cc = cpuHand.length;

  const playerBadge = document.getElementById('player-count');
  const cpuBadge    = document.getElementById('cpu-count');

  playerBadge.textContent = `${pc} card${pc !== 1 ? 's' : ''}`;
  cpuBadge.textContent    = `${cc} card${cc !== 1 ? 's' : ''}`;

  pc === 1 ? playerBadge.classList.add('uno-alert')    : playerBadge.classList.remove('uno-alert');
  cc === 1 ? cpuBadge.classList.add('uno-alert')       : cpuBadge.classList.remove('uno-alert');
}

function renderTurnBadge() {
  const badge = document.getElementById('turn-badge');
  badge.textContent = isPlayerTurn ? 'YOUR TURN' : 'CPU TURN';
  badge.className   = `turn-badge ${isPlayerTurn ? 'you' : 'cpu'}`;
}

function renderColorIndicator() {
  document.getElementById('color-dot').className   = `color-dot ${currentColor}`;
  document.getElementById('color-label').textContent = currentColor.toUpperCase();
}

function renderDirectionRing() {
  document.getElementById('dir-ring').textContent = direction === 1 ? '↺' : '↻';
}

function renderUnoButton() {
  document.getElementById('uno-btn').disabled = !(playerHand.length === 2 && isPlayerTurn);
}

/* ══════════════════════════════════════════════════════════════════════════
   GAME RULES
   ══════════════════════════════════════════════════════════════════════════ */

/** Check if a card can legally be played on the current discard */
function canPlay(card) {
  if (card.color === 'wild') return true;
  return card.color === currentColor || card.value === currentValue;
}

/* ══════════════════════════════════════════════════════════════════════════
   PLAYER ACTIONS
   ══════════════════════════════════════════════════════════════════════════ */

/** Called when the player clicks a card in their hand */
function onPlayCard(idx, el) {
  if (!isPlayerTurn) return;
  const card = playerHand[idx];
  if (!canPlay(card)) return;

  // Trigger fly-off animation, then process card
  el.classList.add('playing');

  setTimeout(() => {
    playerHand.splice(idx, 1);
    discardPile.push(card);
    currentValue = card.value;
    calledUno    = false;

    // Check instant win
    if (!playerHand.length) {
      render();
      endRound('player');
      return;
    }

    // Wild card — show color chooser
    if (card.color === 'wild') {
      pendingWild = card.value;
      render();
      setTimeout(() => document.getElementById('color-chooser').classList.add('show'), 80);
      return;
    }

    // Normal colored card
    currentColor = card.color;
    applyEffect(card.value, 'player');
  }, 260);
}

/** Called when the player clicks the draw pile */
function onDraw() {
  if (!isPlayerTurn) return;

  // Ripple animation on draw pile
  const drawPile = document.getElementById('draw-pile');
  drawPile.classList.remove('ripple');
  void drawPile.offsetWidth; // force reflow to restart animation
  drawPile.classList.add('ripple');
  setTimeout(() => drawPile.classList.remove('ripple'), 460);

  const card = deal();
  playerHand.push(card);
  toast(canPlay(card) ? 'Drew a playable card! 🃏' : 'Drew a card', 1000);

  isPlayerTurn = false;
  render();
  setTimeout(scheduleCPU, 500);
}

/** Called when the player clicks the UNO button */
function callUno() {
  if (playerHand.length !== 2 || !isPlayerTurn) return;
  calledUno = true;
  document.getElementById('uno-btn').disabled = true;
  toast('UNO! 🔥', 1200);
}

/** Called when the player picks a color after playing a Wild */
function chooseColor(color) {
  document.getElementById('color-chooser').classList.remove('show');
  currentColor = color;
  renderColorIndicator();

  const wasWild4 = (pendingWild === 'wild4');
  pendingWild    = false;

  if (wasWild4) {
    // CPU draws 4 and loses their next turn
    for (let i = 0; i < 4; i++) cpuHand.push(deal());
    toast('CPU draws 4! 😈', 1800);
    isPlayerTurn = false;
    render();
    scheduleCPU();
  } else {
    isPlayerTurn = false;
    render();
    scheduleCPU();
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   CARD EFFECTS
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Apply the effect of an action card.
 * @param {string} value - 'skip' | 'reverse' | 'draw2' | anything else (ignored)
 * @param {string} who   - 'player' | 'cpu'  (who played the card)
 */
function applyEffect(value, who) {
  switch (value) {

    case 'skip':
      // In 2-player UNO, Skip means the player who played it goes again
      toast(who === 'player' ? 'CPU skipped! ⊘' : 'You were skipped! ⊘', 1400);
      if (who === 'player') {
        isPlayerTurn = true;
        render();
        toast('Go again! 🔄', 900);
      } else {
        isPlayerTurn = false;
        render();
        scheduleCPU();
      }
      break;

    case 'reverse':
      // In 2-player UNO, Reverse acts like Skip
      direction *= -1;
      toast('Direction reversed!', 1100);
      if (who === 'player') {
        isPlayerTurn = true;
        render();
      } else {
        isPlayerTurn = false;
        render();
        scheduleCPU();
      }
      break;

    case 'draw2':
      if (who === 'player') {
        for (let i = 0; i < 2; i++) cpuHand.push(deal());
        toast('CPU draws 2! 🃏', 1400);
        isPlayerTurn = true;
        render();
      } else {
        for (let i = 0; i < 2; i++) playerHand.push(deal());
        toast('You draw 2! 😖', 1400);
        isPlayerTurn = true;
        render();
      }
      break;

    default:
      // Plain number card — hand off to the other player
      if (who === 'player') {
        isPlayerTurn = false;
        render();
        scheduleCPU();
      } else {
        isPlayerTurn = true;
        render();
      }
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   CPU LOGIC
   ══════════════════════════════════════════════════════════════════════════ */

/** Schedule the CPU's turn after a short human-like delay */
function scheduleCPU() {
  clearTimeout(cpuTimer);
  cpuTimer = setTimeout(cpuTurn, 900 + Math.random() * 550);
}

/** CPU decides what to do on their turn */
function cpuTurn() {
  if (isPlayerTurn) return;

  const playable = cpuHand.filter(canPlay);

  // CPU must draw if no playable cards
  if (!playable.length) {
    const drawn = deal();
    cpuHand.push(drawn);
    toast('CPU draws a card 🤖', 900);
    render();

    if (canPlay(drawn)) {
      // Play the drawn card after a brief pause
      cpuTimer = setTimeout(() => cpuPlayCard(drawn), 750);
    } else {
      isPlayerTurn = true;
      render();
    }
    return;
  }

  // Priority scoring: wild4 > draw2 > skip > reverse > wild > same-color > other
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

/** CPU plays a specific card */
function cpuPlayCard(card) {
  const idx = cpuHand.indexOf(card);
  if (idx === -1) return;

  cpuHand.splice(idx, 1);
  discardPile.push(card);
  currentValue = card.value;

  // Check if CPU won
  if (!cpuHand.length) {
    render();
    endRound('cpu');
    return;
  }

  // CPU calls UNO at 1 card
  if (cpuHand.length === 1) toast('CPU says UNO! 🤖', 1200);

  // Handle wild cards
  if (card.color === 'wild') {
    // CPU picks whichever color it has the most of
    const colorCount = { red: 0, blue: 0, green: 0, yellow: 0 };
    cpuHand.forEach(c => {
      if (colorCount[c.color] !== undefined) colorCount[c.color]++;
    });
    currentColor = Object.entries(colorCount)
      .sort((a, b) => b[1] - a[1])[0][0];
    renderColorIndicator();

    if (card.value === 'wild4') {
      for (let i = 0; i < 4; i++) playerHand.push(deal());
      toast('CPU plays +4! You draw 4! 😱', 2000);
      isPlayerTurn = true;
      render();
      return;
    }

    isPlayerTurn = true;
    render();
    return;
  }

  // Colored card — set color and apply effect
  currentColor = card.color;
  applyEffect(card.value, 'cpu');
}

/* ══════════════════════════════════════════════════════════════════════════
   END OF ROUND
   ══════════════════════════════════════════════════════════════════════════ */

function endRound(winner) {
  clearTimeout(cpuTimer);

  if (winner === 'player') {
    scorePlayer++;
    document.getElementById('win-emoji').textContent  = '🎉';
    document.getElementById('win-title').textContent  = 'YOU WIN!';
    document.getElementById('win-title').style.color  = '#34d399';
    document.getElementById('win-sub').textContent    = 'Computer ran out of cards!';
  } else {
    scoreCpu++;
    document.getElementById('win-emoji').textContent  = '🤖';
    document.getElementById('win-title').textContent  = 'CPU WINS!';
    document.getElementById('win-title').style.color  = '#f87171';
    document.getElementById('win-sub').textContent    = 'Better luck next time!';
  }

  document.getElementById('sp').textContent = scorePlayer;
  document.getElementById('sc').textContent = scoreCpu;

  setTimeout(() => document.getElementById('win-overlay').classList.add('show'), 500);
}

/* ══════════════════════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
   ══════════════════════════════════════════════════════════════════════════ */

function toast(message, duration = 1400) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), duration);
}

/* ══════════════════════════════════════════════════════════════════════════
   ENTRY POINT
   ══════════════════════════════════════════════════════════════════════════ */
initGame();