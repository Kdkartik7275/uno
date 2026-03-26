/* ═══════════════════════════════════════════════════════
   UNO — game.js
   BUG FIX: After drawing penalty cards (+2 / +4), the
   affected player's turn is SKIPPED — they cannot play
   even if a drawn card matches the current colour/value.
   ═══════════════════════════════════════════════════════ */

/* ── CONSTANTS ──────────────────────────────────────── */
const COLORS = ['red', 'blue', 'green', 'yellow'];
const VALUES = ['0','1','2','3','4','5','6','7','8','9','skip','reverse','draw2'];
const WILDS  = ['wild', 'wild4'];

/* ── STATE ──────────────────────────────────────────── */
let deck        = [];
let playerHand  = [];
let cpuHand     = [];
let discardPile = [];
let currentColor = '';
let currentValue = '';
let isPlayerTurn = true;
let direction    = 1;       // 1 = clockwise, -1 = counter
let pendingWild  = false;   // 'wild' | 'wild4' | false
let calledUno    = false;
let scorePlayer  = 0;
let scoreCpu     = 0;
let cpuTimer     = null;
let toastTimer   = null;

/* ══════════════════════════════════════════════════════
   DECK
   ══════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════ */
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

  // Pick a non-wild starter card
  let starter;
  do { starter = deal(); } while (starter.color === 'wild');
  discardPile.push(starter);
  currentColor = starter.color;
  currentValue = starter.value;

  // Reset overlays
  document.getElementById('win-overlay').classList.remove('show');
  document.getElementById('confetti-wrap').innerHTML = '';
  thinkOff();

  // Full render
  renderCPUHand();
  renderPlayerHand();
  renderDiscard();
  updateHUD();
  updateGem();
  updateDir();
  updateAvatarGlow();
}

/* ══════════════════════════════════════════════════════
   LABEL HELPER
   ══════════════════════════════════════════════════════ */
function cardLabel(v) {
  return { skip:'⊘', reverse:'↺', draw2:'+2', wild:'★', wild4:'+4' }[v] ?? v;
}

/* ══════════════════════════════════════════════════════
   BUILD CARD ELEMENT
   ══════════════════════════════════════════════════════ */
function makeCard(card, forPlayer = false, idx = -1) {
  const el  = document.createElement('div');
  const lbl = cardLabel(card.value);
  const cls = card.color === 'wild' ? 'wild' : card.color;

  el.className = `card ${cls}`;
  el.innerHTML = `
    <div class="oval"></div>
    <span class="ctL">${lbl}</span>
    <span class="cMid">${lbl}</span>
    <span class="ctR">${lbl}</span>
  `;

  if (forPlayer) {
    el.classList.add('p-card');
    el.style.animationDelay = `${idx * 0.038}s`;

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
  el.innerHTML = `<div class="oval"></div><span class="btxt">UNO</span>`;
  return el;
}

/* ══════════════════════════════════════════════════════
   RENDER HELPERS  (surgical — only changed sections)
   ══════════════════════════════════════════════════════ */
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

  // Second-to-top card for depth
  if (discardPile.length >= 2) {
    const prev = discardPile[discardPile.length - 2];
    const el   = makeCard(prev);
    el.classList.add('d-prev');
    const rot = ((discardPile.length * 17 + 3) % 14 - 7).toFixed(1);
    el.style.transform = `rotate(${rot}deg)`;
    c.appendChild(el);
  }

  // Top card
  const top = discardPile[discardPile.length - 1];
  const el  = makeCard(top);
  el.classList.add('d-top');
  const rot2 = ((discardPile.length * 13 + 7) % 12 - 6).toFixed(1);
  el.style.setProperty('--drot', `rotate(${rot2}deg)`);
  c.appendChild(el);

  // Update discard border glow colour
  const glow = { red:'#e8192c', blue:'#0057b7', green:'#00a550', yellow:'#ffda00' };
  const g    = glow[currentColor] || 'rgba(255,255,255,0.4)';
  c.style.setProperty('--disc-border', g);
  c.style.setProperty('--disc-glow',   g + '66');
}

function updateHUD() {
  const pc = playerHand.length;
  const cc = cpuHand.length;

  // Turn pill
  const tp = document.getElementById('turn-pill');
  if (isPlayerTurn) {
    tp.textContent = 'YOUR TURN';
    tp.className   = 'turn-you';
  } else {
    tp.textContent = 'CPU TURN';
    tp.className   = 'turn-cpu';
  }

  // Card counts + UNO highlight
  const pcEl = document.getElementById('player-count');
  const ccEl = document.getElementById('cpu-count');
  pcEl.textContent = pc;
  ccEl.textContent = cc;
  pc === 1 ? pcEl.classList.add('uno-pop')    : pcEl.classList.remove('uno-pop');
  cc === 1 ? ccEl.classList.add('uno-pop')    : ccEl.classList.remove('uno-pop');

  // Scores
  document.getElementById('score-p').textContent = scorePlayer;
  document.getElementById('score-c').textContent = scoreCpu;

  // UNO button — only active when player has exactly 2 cards and it's their turn
  document.getElementById('uno-btn').disabled = !(pc === 2 && isPlayerTurn);

  updateAvatarGlow();
}

function updateGem() {
  const gemEl  = document.getElementById('color-gem');
  const namEl  = document.getElementById('color-name');
  const gemMap = { red:'gem-red', blue:'gem-blue', green:'gem-green', yellow:'gem-yellow', wild:'gem-wild' };
  gemEl.className = gemMap[currentColor] || 'gem-wild';
  namEl.textContent = currentColor.toUpperCase();
}

function updateDir() {
  document.getElementById('dir-wheel').textContent = direction === 1 ? '↺' : '↻';
}

function updateAvatarGlow() {
  // CPU avatar glows when it is CPU's turn
  const cpuBubble = document.querySelector('.cpu-bubble');
  const youBubble = document.querySelector('.you-bubble');
  if (isPlayerTurn) {
    cpuBubble.classList.remove('active-glow');
    youBubble.classList.add('active-glow');
  } else {
    youBubble.classList.remove('active-glow');
    cpuBubble.classList.add('active-glow');
  }
}

function thinkOn()  { document.getElementById('think-dots').classList.add('on'); }
function thinkOff() { document.getElementById('think-dots').classList.remove('on'); }

/* ══════════════════════════════════════════════════════
   RULES
   ══════════════════════════════════════════════════════ */
function canPlay(card) {
  if (card.color === 'wild') return true;
  return card.color === currentColor || card.value === currentValue;
}

/* ══════════════════════════════════════════════════════
   PLAYER ACTIONS
   ══════════════════════════════════════════════════════ */
function onPlayCard(idx, el) {
  if (!isPlayerTurn) return;
  const card = playerHand[idx];
  if (!canPlay(card)) return;

  // Fly-off animation
  el.classList.add('playing');

  setTimeout(() => {
    playerHand.splice(idx, 1);
    discardPile.push(card);
    currentValue = card.value;
    calledUno    = false;

    renderDiscard();
    updateHUD();

    // Win check
    if (!playerHand.length) {
      renderPlayerHand();
      endRound('player');
      return;
    }

    // Wild — show colour chooser
    if (card.color === 'wild') {
      pendingWild = card.value;
      renderPlayerHand();
      setTimeout(() => document.getElementById('color-modal').classList.add('open'), 90);
      return;
    }

    // Coloured card
    currentColor = card.color;
    updateGem();
    applyEffect(card.value, 'player');
  }, 275);
}

function onDraw() {
  if (!isPlayerTurn) return;

  const card = deal();
  playerHand.push(card);
  showToast(canPlay(card) ? 'Drew a playable card! 🃏' : 'Drew a card');

  renderPlayerHand();
  updateHUD();

  // ── Drawing voluntarily ends the player's turn ──
  isPlayerTurn = false;
  updateHUD();
  thinkOn();
  setTimeout(scheduleCPU, 550);
}

function callUno() {
  if (playerHand.length !== 2 || !isPlayerTurn) return;
  calledUno = true;
  document.getElementById('uno-btn').disabled = true;
  showToast('UNO! 🔥', 2200);
}

function chooseColor(color) {
  document.getElementById('color-modal').classList.remove('open');
  currentColor = color;
  updateGem();
  renderDiscard();

  const was4 = (pendingWild === 'wild4');
  pendingWild = false;

  if (was4) {
    // ── BUG FIX: +4 means CPU draws 4 AND loses their next turn ──
    // In 2-player this means the player who played +4 goes again,
    // BUT the standard rule is: the target draws and their turn is SKIPPED.
    // Here the player played +4 on CPU, so CPU draws 4 and their turn is skipped,
    // meaning the player gets another turn? No — standard UNO:
    // After Wild Draw 4: next player draws 4 AND is skipped. Player turn ends.
    for (let i = 0; i < 4; i++) cpuHand.push(deal());
    showToast('CPU draws 4 & is skipped! 😈');
    renderCPUHand();
    updateHUD();
    // The player's turn is still over after playing +4
    isPlayerTurn = false;
    updateHUD();
    thinkOn();
    scheduleCPU();  // CPU will do its turn but is "skipped" effectively
    // Actually in 2p: player plays +4 → CPU draws 4, CPU skipped → player goes again
    // So player gets another turn:
    // Let's apply proper 2-player +4 rule: player goes again after +4
    isPlayerTurn = true;
    thinkOff();
    updateHUD();
    renderPlayerHand();
  } else {
    // Normal wild — turn passes to CPU
    isPlayerTurn = false;
    updateHUD();
    thinkOn();
    scheduleCPU();
  }
}

/* ══════════════════════════════════════════════════════
   APPLY EFFECT
   ═══════════════════════════════════════════════════════
   BUG FIX NOTES:
   • draw2 / wild4: the TARGET draws the cards and their
     turn is immediately SKIPPED.  They do NOT get to play
     any of the cards they just drew.
   • In 2-player UNO, skip & reverse both mean the player
     who just played goes again (the other player is skipped).
   ══════════════════════════════════════════════════════ */
function applyEffect(value, who) {
  switch (value) {

    case 'skip':
      // 2-player: the other player is skipped → current player goes again
      showToast(who === 'player' ? 'CPU skipped! ⊘' : 'Skipped! ⊘');
      if (who === 'player') {
        // Player goes again
        isPlayerTurn = true;
        thinkOff();
        renderPlayerHand();
        updateHUD();
      } else {
        // CPU goes again (player is skipped)
        isPlayerTurn = false;
        thinkOn();
        updateHUD();
        scheduleCPU();
      }
      break;

    case 'reverse':
      // 2-player: same as skip — current player goes again
      direction *= -1;
      updateDir();
      showToast('Direction reversed!');
      if (who === 'player') {
        isPlayerTurn = true;
        thinkOff();
        renderPlayerHand();
        updateHUD();
      } else {
        isPlayerTurn = false;
        thinkOn();
        updateHUD();
        scheduleCPU();
      }
      break;

    case 'draw2':
      if (who === 'player') {
        // CPU draws 2 — CPU's turn is SKIPPED (player goes again)
        for (let i = 0; i < 2; i++) cpuHand.push(deal());
        showToast('CPU draws 2 & is skipped! 🃏');
        renderCPUHand();
        updateHUD();
        // Player goes again
        isPlayerTurn = true;
        thinkOff();
        renderPlayerHand();
        updateHUD();
      } else {
        // ── BUG FIX: Player draws 2, player's turn is SKIPPED ──
        // The player draws 2 cards but CANNOT play any of them.
        // Their turn ends immediately after drawing.
        for (let i = 0; i < 2; i++) playerHand.push(deal());
        showToast('You draw 2 & are skipped! 😖');
        renderPlayerHand();
        updateHUD();
        // Player's turn is SKIPPED — CPU goes again
        isPlayerTurn = false;
        thinkOn();
        updateHUD();
        scheduleCPU();
      }
      break;

    default:
      // Plain number card — hand off
      if (who === 'player') {
        isPlayerTurn = false;
        thinkOn();
        updateHUD();
        scheduleCPU();
      } else {
        isPlayerTurn = true;
        thinkOff();
        renderPlayerHand();
        updateHUD();
      }
  }
}

/* ══════════════════════════════════════════════════════
   CPU AI
   ══════════════════════════════════════════════════════ */
function scheduleCPU() {
  clearTimeout(cpuTimer);
  cpuTimer = setTimeout(cpuTurn, 880 + Math.random() * 620);
}

function cpuTurn() {
  if (isPlayerTurn) return;

  const playable = cpuHand.filter(canPlay);

  if (!playable.length) {
    const drawn = deal();
    cpuHand.push(drawn);
    showToast('CPU draws a card 🤖');
    renderCPUHand();
    updateHUD();

    // CPU drew a card — can play it if it matches, otherwise pass
    if (canPlay(drawn)) {
      cpuTimer = setTimeout(() => cpuPlayCard(drawn), 720);
    } else {
      // CPU passes — player's turn
      isPlayerTurn = true;
      thinkOff();
      renderPlayerHand();
      updateHUD();
    }
    return;
  }

  // Priority: wild4 > draw2 > skip > reverse > wild > same-colour > other
  const pri = c => {
    if (c.value === 'wild4')   return 6;
    if (c.value === 'draw2')   return 5;
    if (c.value === 'skip')    return 4;
    if (c.value === 'reverse') return 3;
    if (c.color === 'wild')    return 2;
    if (c.color === currentColor) return 1;
    return 0;
  };
  playable.sort((a, b) => pri(b) - pri(a));
  cpuPlayCard(playable[0]);
}

function cpuPlayCard(card) {
  const idx = cpuHand.indexOf(card);
  if (idx === -1) return;

  cpuHand.splice(idx, 1);
  discardPile.push(card);
  currentValue = card.value;

  thinkOff();
  renderCPUHand();
  renderDiscard();
  updateHUD();

  if (!cpuHand.length) { endRound('cpu'); return; }
  if (cpuHand.length === 1) showToast('CPU says UNO! 🤖');

  // Wild / Wild+4
  if (card.color === 'wild') {
    // CPU picks most common colour in its hand
    const cnt = { red:0, blue:0, green:0, yellow:0 };
    cpuHand.forEach(c => { if (cnt[c.color] !== undefined) cnt[c.color]++; });
    currentColor = Object.entries(cnt).sort((a,b) => b[1]-a[1])[0][0];
    updateGem();
    renderDiscard();

    if (card.value === 'wild4') {
      // ── BUG FIX: Player draws 4 AND player's turn is SKIPPED ──
      // Player does NOT get to play any drawn card. Turn goes back to CPU.
      for (let i = 0; i < 4; i++) playerHand.push(deal());
      showToast(`CPU plays +4 → ${currentColor.toUpperCase()}! You draw 4 & are skipped! 😱`, 2800);
      renderPlayerHand();
      updateHUD();
      // Player's turn is SKIPPED — CPU goes again
      isPlayerTurn = false;
      thinkOn();
      updateHUD();
      scheduleCPU();
      return;
    }

    // Normal wild — player's turn
    isPlayerTurn = true;
    thinkOff();
    renderPlayerHand();
    updateHUD();
    return;
  }

  currentColor = card.color;
  updateGem();
  renderDiscard();
  applyEffect(card.value, 'cpu');
}

/* ══════════════════════════════════════════════════════
   END ROUND
   ══════════════════════════════════════════════════════ */
function endRound(winner) {
  clearTimeout(cpuTimer);

  if (winner === 'player') {
    scorePlayer++;
    document.getElementById('win-emoji').textContent = '🎉';
    document.getElementById('win-title').textContent = 'YOU WIN!';
    document.getElementById('win-title').style.color = '#44dc80';
    document.getElementById('win-sub').textContent   = 'Computer ran out of cards!';
    spawnConfetti();
  } else {
    scoreCpu++;
    document.getElementById('win-emoji').textContent = '🤖';
    document.getElementById('win-title').textContent = 'CPU WINS!';
    document.getElementById('win-title').style.color = '#ff7070';
    document.getElementById('win-sub').textContent   = 'Better luck next time!';
  }

  document.getElementById('wp').textContent      = scorePlayer;
  document.getElementById('wc').textContent      = scoreCpu;
  document.getElementById('score-p').textContent = scorePlayer;
  document.getElementById('score-c').textContent = scoreCpu;

  setTimeout(() => document.getElementById('win-overlay').classList.add('show'), 520);
}

/* ══════════════════════════════════════════════════════
   CONFETTI
   ══════════════════════════════════════════════════════ */
function spawnConfetti() {
  const wrap   = document.getElementById('confetti-wrap');
  wrap.innerHTML = '';
  const palette = ['#ff7070','#5ab0ff','#44dc80','#ffe84d','#ff9800','#e040fb','#ffffff'];

  for (let i = 0; i < 90; i++) {
    const el = document.createElement('div');
    el.className = 'conf';
    el.style.cssText = `
      left:${Math.random() * 100}%;
      background:${palette[i % palette.length]};
      width:${5 + Math.random() * 9}px;
      height:${5 + Math.random() * 9}px;
      border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
      animation-name:conf-fall;
      animation-delay:${Math.random() * 1.1}s;
      animation-duration:${1.5 + Math.random() * 1.0}s;
    `;
    wrap.appendChild(el);
  }
}

/* ══════════════════════════════════════════════════════
   TOAST
   ══════════════════════════════════════════════════════ */
function showToast(msg, dur = 1700) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), dur);
}

/* ══════════════════════════════════════════════════════
   BOOT
   ══════════════════════════════════════════════════════ */
initGame();