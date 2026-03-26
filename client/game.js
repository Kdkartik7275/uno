/* ═══════════════════════════════════════════════════════════
   UNO — game.js  v5 — Circular player layout
   ═══════════════════════════════════════════════════════════ */

/* ══  WEB AUDIO  ══════════════════════════════════════════ */
let _ctx = null;
function ac() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  return _ctx;
}
function tone(freq, type, dur, vol = 0.15, delay = 0) {
  if (!cfg.sfx) return;
  try {
    const ctx = ac(), osc = ctx.createOscillator(), g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = type; osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    g.gain.setValueAtTime(vol, ctx.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
    osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + dur + 0.01);
  } catch(e){}
}
const SFX = {
  play()    { tone(440,'sine',.08,.14); tone(660,'sine',.06,.1,.05); },
  draw()    { tone(300,'triangle',.1,.12); tone(260,'triangle',.08,.1,.06); },
  uno()     { [523,659,784,1047].forEach((f,i)=>tone(f,'square',.18,.13,i*.09)); },
  skip()    { tone(200,'sawtooth',.12,.12); tone(150,'sawtooth',.1,.1,.1); },
  reverse() { [500,400,300].forEach((f,i)=>tone(f,'sine',.1,.11,i*.08)); },
  draw2()   { [250,200].forEach((f,i)=>tone(f,'triangle',.1,.13,i*.1)); },
  draw4()   { [250,220,190,160].forEach((f,i)=>tone(f,'triangle',.12,.13,i*.08)); },
  wild()    { [523,622,740,880].forEach((f,i)=>tone(f,'sine',.1,.11,i*.07)); },
  win()     { [523,659,784,1047,784,1047,1319].forEach((f,i)=>tone(f,'sine',.22,.17,i*.12)); },
  lose()    { [330,294,261,220].forEach((f,i)=>tone(f,'triangle',.18,.13,i*.13)); },
  click()   { tone(800,'sine',.04,.07); },
};
function vibe(p=30) { if (cfg.vibe && navigator.vibrate) navigator.vibrate(p); }

/* ══  CONFIG  ══════════════════════════════════════════════ */
const DEF = { sfx:true, vibe:true, anim:true, style:'classic', table:'green' };
let cfg = { ...DEF };

function loadCfg() {
  try { cfg = { ...DEF, ...JSON.parse(localStorage.getItem('uno_cfg')||'{}') }; } catch(e){}
  applyCfg(); syncCfgUI();
}
function saveSetting(k, v) {
  SFX.click();
  cfg[k] = v;
  try { localStorage.setItem('uno_cfg', JSON.stringify(cfg)); } catch(e){}
  applyCfg();
}
function applyCfg() {
  document.body.classList.remove('st-neon','st-pastel');
  if (cfg.style === 'neon')   document.body.classList.add('st-neon');
  if (cfg.style === 'pastel') document.body.classList.add('st-pastel');
  document.body.classList.remove('th-blue','th-purple','th-red','th-dark');
  if (cfg.table !== 'green') document.body.classList.add(`th-${cfg.table}`);
}
function syncCfgUI() {
  const s = (id,v) => { const el=document.getElementById(id); if(el) el.checked=!!v; };
  s('snd-sfx',cfg.sfx); s('set-vibe',cfg.vibe); s('set-anim',cfg.anim);
  const ss=document.getElementById('set-style'); if(ss) ss.value=cfg.style;
  const st=document.getElementById('set-table'); if(st) st.value=cfg.table;
}

/* ══  SCREEN NAV  ═══════════════════════════════════════════ */
let _prevScreen = 'screen-home';

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
    s.style.opacity = '0';
  });
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'flex';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.classList.add('active');
  }));
}
function showHome()  { SFX.click(); showScreen('screen-home'); }
function showModes() { SFX.click(); showScreen('screen-modes'); }
function showSettings(from) {
  SFX.click();
  if (from) _prevScreen = (from === 'game') ? 'screen-game' : 'screen-home';
  syncCfgUI();
  showScreen('screen-settings');
}
function settingsBack() { SFX.click(); showScreen(_prevScreen); }

/* ══  MODE SELECT  ══════════════════════════════════════════ */
let cpuCount   = 1;
let mpCount    = 2;
let difficulty = 'medium';

function selectPlayers(btn, count, mode) {
  SFX.click();
  document.querySelectorAll(`.mpb[data-mode="${mode}"]`).forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (mode === 'cpu') cpuCount = count;
  else mpCount = count;
}
function selectDiff(btn, diff) {
  SFX.click();
  document.querySelectorAll('.mdb').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  difficulty = diff;
}
function startVsCpu() {
  SFX.click();
  gameMode = 'cpu';
  scorePlayer = 0; scoreCpu = 0;
  showScreen('screen-game');
  const dp = document.getElementById('diff-pill');
  if (dp) dp.textContent = difficulty.toUpperCase();
  setTimeout(initGame, 200);
}

/* ══  MULTIPLAYER LOBBY  ════════════════════════════════════ */
let roomCode = '';
function showMultiLobby() {
  SFX.click();
  roomCode = Math.random().toString(36).substr(2,6).toUpperCase();
  document.getElementById('lobby-code').textContent = roomCode;
  document.getElementById('lobby-sub').textContent = `${mpCount}-player room`;
  buildLobbyPlayers();
  document.getElementById('lobby-status-txt').textContent = 'Connecting to server… (coming soon)';
  document.getElementById('lobby-start-btn').disabled = true;
  showScreen('screen-lobby');
}
function buildLobbyPlayers() {
  const wrap = document.getElementById('lobby-players');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (let i = 0; i < mpCount; i++) {
    const row = document.createElement('div');
    row.className = 'lobby-player-row';
    if (i === 0) {
      row.innerHTML = `<div class="lpr-avatar lpr-you">😎</div><div class="lpr-name">You (Host)</div><div class="lpr-status lpr-s-ready">READY</div>`;
    } else {
      row.innerHTML = `<div class="lpr-avatar lpr-empty">⏳</div><div class="lpr-name" style="color:rgba(255,255,255,.3)">Waiting for player ${i+1}…</div><div class="lpr-status lpr-s-waiting">EMPTY</div>`;
    }
    wrap.appendChild(row);
  }
}
function copyRoomCode() {
  SFX.click();
  if (navigator.clipboard) navigator.clipboard.writeText(roomCode);
  showToast('Room code copied! 📋');
}
function startMultiGame() { showToast('Multiplayer coming soon! 🚧', 2000); }

/* ══  LOADING  ══════════════════════════════════════════════ */
function runLoader() {
  showScreen('screen-loading');
  const fill = document.getElementById('load-fill');
  const pct  = document.getElementById('load-pct');
  let p = 0;
  const iv = setInterval(() => {
    p += Math.random() * 14 + 4;
    if (p >= 100) { p = 100; clearInterval(iv); }
    if (fill) fill.style.width = p + '%';
    if (pct)  pct.textContent  = Math.round(p) + '%';
    if (p >= 100) setTimeout(() => { loadCfg(); showHome(); }, 400);
  }, 110);
}

/* ══  QUIT  ═════════════════════════════════════════════════ */
function confirmQuit() {
  SFX.click();
  document.getElementById('quit-modal').classList.add('open');
}
function closeQuit() {
  SFX.click();
  document.getElementById('quit-modal').classList.remove('open');
}
function quitToHome() {
  SFX.click();
  clearAllTimers();
  document.getElementById('quit-modal').classList.remove('open');
  document.getElementById('win-overlay').classList.remove('show');
  document.getElementById('color-modal').classList.remove('open');
  showHome();
}

/* ══  GAME CONSTANTS  ═══════════════════════════════════════ */
const COLORS = ['red','blue','green','yellow'];
const VALUES = ['0','1','2','3','4','5','6','7','8','9','skip','reverse','draw2'];
const WILDS  = ['wild','wild4'];
const BOT_ICONS = ['🤖','👾','🦊'];
const BOT_NAMES = ['Robo','Pixel','Foxy'];

/* ══  GAME STATE  ═══════════════════════════════════════════ */
let gameMode     = 'cpu';
let deck         = [];
let playerHand   = [];
let bots         = [];
let discardPile  = [];
let currentColor = '';
let currentValue = '';
let turnIndex    = 0;
let numPlayers   = 0;
let direction    = 1;
let pendingWild  = false;
let calledUno    = false;
let scorePlayer  = 0;
let scoreCpu     = 0;
let cpuTimers    = [];
let toastTimer   = null;

function clearAllTimers() {
  cpuTimers.forEach(t => clearTimeout(t));
  cpuTimers = [];
}

/* ══  DECK  ═════════════════════════════════════════════════ */
function buildDeck() {
  const d = [];
  COLORS.forEach(c => VALUES.forEach(v => {
    d.push({color:c,value:v});
    if (v !== '0') d.push({color:c,value:v});
  }));
  WILDS.forEach(v => { for (let i=0;i<4;i++) d.push({color:'wild',value:v}); });
  return d;
}
function shuffle(a) {
  for (let i=a.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
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

/* ══  INIT  ═════════════════════════════════════════════════ */
function initGame() {
  clearAllTimers();
  deck        = shuffle(buildDeck());
  playerHand  = [];
  discardPile = [];
  turnIndex   = 0;
  direction   = 1;
  pendingWild = false;
  calledUno   = false;
  numPlayers  = 1 + cpuCount;

  bots = [];
  for (let i=0;i<cpuCount;i++) {
    bots.push({ name:BOT_NAMES[i], icon:BOT_ICONS[i], hand:[] });
  }

  for (let i=0;i<7;i++) {
    playerHand.push(deal());
    bots.forEach(b => b.hand.push(deal()));
  }

  let starter;
  do { starter = deal(); } while (starter.color === 'wild');
  discardPile.push(starter);
  currentColor = starter.color;
  currentValue = starter.value;

  buildCircularLayout();

  document.getElementById('win-overlay').classList.remove('show');
  document.getElementById('confetti-wrap').innerHTML = '';
  thinkOff();

  renderAllHands();
  renderDiscard();
  updateHUD();
  updateGem();
  updateDir();
  updateDeckCount();
}

/* ══════════════════════════════════════════════════════════
   CIRCULAR LAYOUT BUILDER
   
   Positions:
   - 2 players (1 bot): bot at TOP, you at BOTTOM
   - 3 players (2 bots): bots at TOP-LEFT and TOP-RIGHT
   - 4 players (3 bots): bots at TOP, LEFT, RIGHT
   ══════════════════════════════════════════════════════════ */
function buildCircularLayout() {
  const wrap = document.getElementById('opponents-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';

  const arena = document.getElementById('circular-arena');
  // Remove old layout classes
  arena.className = '';
  arena.id = 'circular-arena';

  bots.forEach((bot, i) => {
    const slot = document.createElement('div');
    slot.className = 'player-slot';
    slot.id = `bot-slot-${i}`;

    // Determine position class based on cpuCount and bot index
    const posClass = getBotPositionClass(i, cpuCount);
    slot.classList.add(posClass);

    const handClass = getHandClass(i, cpuCount);

    slot.innerHTML = `
      <div class="slot-hand ${handClass}" id="bot-hand-${i}"></div>
      <div class="slot-avatar av-bot${i}" id="bot-bubble-${i}">${bot.icon}</div>
      <div class="slot-name">${bot.name}</div>
      <div class="slot-cnt" id="bot-cnt-${i}">7</div>
    `;

    // For top position, reorder: avatar first, then hand
    if (posClass.includes('top') || posClass.includes('pos-0')) {
      slot.innerHTML = `
        <div class="slot-avatar av-bot${i}" id="bot-bubble-${i}">${bot.icon}</div>
        <div class="slot-name">${bot.name}</div>
        <div class="slot-cnt" id="bot-cnt-${i}">7</div>
        <div class="slot-hand ${handClass}" id="bot-hand-${i}"></div>
      `;
    }

    wrap.appendChild(slot);

    bot.el = {
      hand:   document.getElementById(`bot-hand-${i}`),
      cnt:    document.getElementById(`bot-cnt-${i}`),
      bubble: document.getElementById(`bot-bubble-${i}`),
    };
  });
}

function getBotPositionClass(botIndex, total) {
  // total = number of bots (1, 2, or 3)
  if (total === 1) {
    // Only 1 bot → goes top center
    return 'bot-top-center';
  }
  if (total === 2) {
    // 2 bots → top-left, top-right
    return botIndex === 0 ? 'bot-top-left' : 'bot-top-right';
  }
  if (total === 3) {
    // 3 bots → top-center, left, right
    return ['bot-top-center', 'bot-mid-left', 'bot-mid-right'][botIndex];
  }
  return 'bot-top-center';
}

function getHandClass(botIndex, total) {
  if (total === 3) {
    if (botIndex === 1) return 'slot-hand-left';
    if (botIndex === 2) return 'slot-hand-right';
  }
  return '';
}

/* ══  CARD LABEL  ═══════════════════════════════════════════ */
function lbl(v) {
  return {skip:'⊘',reverse:'↺',draw2:'+2',wild:'★',wild4:'+4'}[v] ?? v;
}

/* ══  BUILD CARD ELEMENT  ═══════════════════════════════════ */
function makeCard(card, interactive=false, idx=-1) {
  const el  = document.createElement('div');
  const l   = lbl(card.value);
  el.className = `card ${card.color === 'wild' ? 'wild' : card.color}`;
  el.innerHTML = `<div class="oval"></div><span class="ctL">${l}</span><span class="cMid">${l}</span><span class="ctR">${l}</span>`;
  if (interactive) {
    el.classList.add('p-card');
    el.style.animationDelay = `${idx * 0.036}s`;
    if (canPlay(card) && isMyTurn()) {
      el.classList.add('can-play');
      el.addEventListener('click', () => onPlayCard(idx, el));
    } else {
      el.classList.add('no-play');
    }
  }
  return el;
}
function makeBack(index) {
  const el = document.createElement('div');
  el.className = `card back cpu-c`;
  const r = ((index*7+3)%10-5).toFixed(1);
  el.style.setProperty('--r',`${r}deg`);
  el.style.transform = `rotate(${r}deg)`;
  el.style.animationDelay = `${index*0.034}s`;
  el.innerHTML = `<div class="oval"></div><span class="btxt">UNO</span>`;
  return el;
}

/* ══  RENDER  ═══════════════════════════════════════════════ */
function renderAllHands() {
  renderPlayerHand();
  bots.forEach((_,i) => renderBotHand(i));
}
function renderPlayerHand() {
  const c = document.getElementById('player-hand');
  if (!c) return;
  c.innerHTML = '';
  playerHand.forEach((card,i) => c.appendChild(makeCard(card,true,i)));
}
function renderBotHand(i) {
  const bot = bots[i];
  if (!bot?.el?.hand) return;
  bot.el.hand.innerHTML = '';
  // Show a limited number of cards visually for side players
  const isside = bot.el.hand.classList.contains('slot-hand-left') || bot.el.hand.classList.contains('slot-hand-right');
  const maxShow = isside ? Math.min(bot.hand.length, 5) : bot.hand.length;
  for (let j = 0; j < maxShow; j++) {
    bot.el.hand.appendChild(makeBack(j));
  }
}
function renderDiscard() {
  const c = document.getElementById('discard-pile');
  if (!c) return;
  c.innerHTML = '';
  if (discardPile.length >= 2) {
    const prev = discardPile[discardPile.length-2];
    const el = makeCard(prev);
    el.classList.add('d-prev');
    el.style.transform = `rotate(${((discardPile.length*17+3)%14-7).toFixed(1)}deg)`;
    c.appendChild(el);
  }
  const top = discardPile[discardPile.length-1];
  const el = makeCard(top);
  el.classList.add('d-top');
  const r2 = ((discardPile.length*13+7)%12-6).toFixed(1);
  el.style.setProperty('--drot',`rotate(${r2}deg)`);
  c.appendChild(el);

  const gmap = {red:'#ff1744',blue:'#2979ff',green:'#00c853',yellow:'#ffd600'};
  const g = gmap[currentColor]||'rgba(255,255,255,.4)';
  c.style.setProperty('--disc-b', g);
  c.style.setProperty('--disc-g', g+'66');
}
function updateHUD() {
  const pc = playerHand.length;
  const tp = document.getElementById('turn-pill');
  if (tp) {
    if (isMyTurn()) { tp.textContent='YOUR TURN'; tp.className='turn-you'; }
    else {
      const bi = turnIndex - 1;
      const bname = bots[bi]?.name || 'CPU';
      tp.textContent=`${bname}'s Turn`;
      tp.className='turn-cpu';
    }
  }
  const pcEl = document.getElementById('player-count');
  if (pcEl) {
    pcEl.textContent = pc;
    pc===1 ? pcEl.classList.add('uno-pop') : pcEl.classList.remove('uno-pop');
  }
  bots.forEach((bot,i) => {
    if (bot.el?.cnt) {
      const cc = bot.hand.length;
      bot.el.cnt.textContent = cc;
      cc===1 ? bot.el.cnt.classList.add('uno-pop') : bot.el.cnt.classList.remove('uno-pop');
    }
  });
  const sp = document.getElementById('score-p'); if(sp) sp.textContent = scorePlayer;
  const sc = document.getElementById('score-c'); if(sc) sc.textContent = scoreCpu;
  const ub = document.getElementById('uno-btn');
  if (ub) ub.disabled = !(pc===2 && isMyTurn());
  const ah = document.getElementById('action-hint');
  if (ah) ah.textContent = isMyTurn() ? 'Pick a card to play' : 'Waiting…';
  updateAvatarGlows();
}
function updateGem() {
  const el = document.getElementById('color-gem');
  const nl = document.getElementById('color-name');
  const m = {red:'gem-red',blue:'gem-blue',green:'gem-green',yellow:'gem-yellow',wild:'gem-wild'};
  if (el) el.className = m[currentColor]||'gem-wild';
  if (nl) nl.textContent = currentColor.toUpperCase();
}
function updateDir() {
  const el = document.getElementById('dir-wheel');
  if (el) el.textContent = direction===1?'↺':'↻';
}
function updateDeckCount() {
  const el = document.getElementById('deck-count');
  if (el) el.textContent = deck.length;
}
function updateAvatarGlows() {
  const yb = document.getElementById('you-bubble');
  if (yb) isMyTurn() ? yb.classList.add('active-turn') : yb.classList.remove('active-turn');
  bots.forEach((bot, i) => {
    if (bot.el?.bubble) {
      turnIndex === i+1 ? bot.el.bubble.classList.add('active-turn') : bot.el.bubble.classList.remove('active-turn');
    }
  });
}
function thinkOn()  { const e=document.getElementById('think-dots'); if(e) e.classList.add('on'); }
function thinkOff() { const e=document.getElementById('think-dots'); if(e) e.classList.remove('on'); }

/* ══  TURN HELPERS  ═════════════════════════════════════════ */
function isMyTurn()   { return turnIndex === 0; }
function curBot()     { return bots[turnIndex - 1]; }
function nextTurn()   { turnIndex = ((turnIndex + direction) + numPlayers) % numPlayers; }
function skipNext()   { turnIndex = ((turnIndex + direction * 2) + numPlayers) % numPlayers; }
function canPlay(card) {
  if (card.color === 'wild') return true;
  return card.color === currentColor || card.value === currentValue;
}

/* ══  PLAYER ACTIONS  ═══════════════════════════════════════ */
function onPlayCard(idx, el) {
  if (!isMyTurn()) return;
  const card = playerHand[idx];
  if (!canPlay(card)) return;

  SFX.play(); vibe(20);
  el.classList.add('playing');

  setTimeout(() => {
    playerHand.splice(idx, 1);
    discardPile.push(card);
    currentValue = card.value;
    calledUno    = false;

    renderDiscard(); updateHUD(); updateDeckCount();

    if (!playerHand.length) { renderPlayerHand(); endRound(0); return; }

    if (card.color === 'wild') {
      SFX.wild();
      pendingWild = card.value;
      renderPlayerHand();
      setTimeout(() => document.getElementById('color-modal').classList.add('open'), 90);
      return;
    }

    currentColor = card.color;
    updateGem();
    applyEffect(card.value, 'player');
  }, 270);
}

function onDraw() {
  if (!isMyTurn()) return;
  SFX.draw(); vibe(15);
  const card = deal();
  playerHand.push(card);
  showToast(canPlay(card) ? 'Drew a playable card! 🃏' : 'Drew a card');
  renderPlayerHand(); updateHUD(); updateDeckCount();
  nextTurn();
  thinkOn(); updateHUD();
  scheduleBots();
}

function callUno() {
  if (playerHand.length !== 2 || !isMyTurn()) return;
  calledUno = true;
  SFX.uno(); vibe([50,30,50]);
  document.getElementById('uno-btn').disabled = true;
  showToast('UNO! 🔥', 2200);
}

function chooseColor(color) {
  SFX.click();
  document.getElementById('color-modal').classList.remove('open');
  currentColor = color;
  updateGem(); renderDiscard();

  const was4 = (pendingWild === 'wild4');
  pendingWild = false;

  if (was4) {
    SFX.draw4(); vibe([30,20,30,20,30]);
    const nextIdx = ((turnIndex + direction) + numPlayers) % numPlayers;
    drawPenalty(nextIdx, 4, `${bots[nextIdx-1]?.name||'Next player'} draws 4 & is skipped! 😈`);
    skipNext();
    thinkOff();
    updateHUD(); renderPlayerHand();
  } else {
    nextTurn();
    thinkOn(); updateHUD();
    scheduleBots();
  }
}

function drawPenalty(seatIdx, n, msg) {
  if (seatIdx === 0) {
    for (let i=0;i<n;i++) playerHand.push(deal());
    showToast(msg); renderPlayerHand(); updateHUD(); updateDeckCount();
  } else {
    const bot = bots[seatIdx-1];
    for (let i=0;i<n;i++) bot.hand.push(deal());
    showToast(msg); renderBotHand(seatIdx-1); updateHUD(); updateDeckCount();
  }
}

/* ══  APPLY EFFECT  ═════════════════════════════════════════ */
function applyEffect(value, who) {
  const isTwoPlayer = (numPlayers === 2);

  switch (value) {
    case 'skip':
      SFX.skip();
      if (isTwoPlayer) {
        showToast(who==='player' ? `${bots[0].name} skipped! ⊘` : 'You were skipped! ⊘');
        if (who === 'player') { thinkOff(); renderPlayerHand(); updateHUD(); }
        else { thinkOn(); updateHUD(); scheduleBots(); }
      } else {
        const nextIdx = ((turnIndex+direction)+numPlayers)%numPlayers;
        const nextName = nextIdx===0?'You':(bots[nextIdx-1]?.name||'Someone');
        showToast(`${nextName} skipped! ⊘`);
        skipNext();
        if (isMyTurn()) { thinkOff(); renderPlayerHand(); updateHUD(); }
        else { thinkOn(); updateHUD(); scheduleBots(); }
      }
      break;

    case 'reverse':
      SFX.reverse();
      direction *= -1; updateDir();
      showToast('Direction reversed!');
      if (isTwoPlayer) {
        if (who === 'player') { thinkOff(); renderPlayerHand(); updateHUD(); }
        else { thinkOn(); updateHUD(); scheduleBots(); }
      } else {
        nextTurn();
        if (isMyTurn()) { thinkOff(); renderPlayerHand(); updateHUD(); }
        else { thinkOn(); updateHUD(); scheduleBots(); }
      }
      break;

    case 'draw2': {
      SFX.draw2();
      const tgt = ((turnIndex+direction)+numPlayers)%numPlayers;
      const tname = tgt===0?'You':(bots[tgt-1]?.name||'CPU');
      const msg = tgt===0 ? 'You draw 2 & are skipped! 😖' : `${tname} draws 2 & is skipped! 🃏`;
      if (isTwoPlayer) {
        drawPenalty(tgt, 2, msg);
        if (who === 'player') { thinkOff(); renderPlayerHand(); updateHUD(); }
        else { thinkOn(); updateHUD(); scheduleBots(); }
      } else {
        drawPenalty(tgt, 2, msg);
        skipNext();
        if (isMyTurn()) { thinkOff(); renderPlayerHand(); updateHUD(); }
        else { thinkOn(); updateHUD(); scheduleBots(); }
      }
      break;
    }

    default:
      nextTurn();
      if (isMyTurn()) { thinkOff(); renderPlayerHand(); updateHUD(); }
      else { thinkOn(); updateHUD(); scheduleBots(); }
  }
}

/* ══  BOT AI  ═══════════════════════════════════════════════ */
function scheduleBots() {
  if (isMyTurn()) return;
  clearAllTimers();
  const delay = difficulty==='hard' ? 700+Math.random()*400
              : difficulty==='easy' ? 1200+Math.random()*800
              :                        900+Math.random()*600;
  const t = setTimeout(runBot, delay);
  cpuTimers.push(t);
}

function runBot() {
  if (isMyTurn()) return;
  const bot = curBot();
  if (!bot) return;

  const playable = bot.hand.filter(canPlay);

  if (!playable.length) {
    SFX.draw();
    const drawn = deal();
    bot.hand.push(drawn);
    showToast(`${bot.name} draws a card`);
    renderBotHand(turnIndex-1); updateHUD(); updateDeckCount();

    if (canPlay(drawn)) {
      const t = setTimeout(() => runBotPlay(drawn), 700);
      cpuTimers.push(t);
    } else {
      nextTurn();
      if (isMyTurn()) { thinkOff(); renderPlayerHand(); updateHUD(); }
      else { thinkOn(); updateHUD(); scheduleBots(); }
    }
    return;
  }

  const pri = c => {
    if (c.value==='wild4')   return difficulty==='hard'?8:6;
    if (c.value==='draw2')   return 5;
    if (c.value==='skip')    return 4;
    if (c.value==='reverse') return 3;
    if (c.color==='wild')    return 2;
    if (c.color===currentColor) return 1;
    return 0;
  };

  let chosen;
  if (difficulty === 'easy') {
    chosen = playable[Math.floor(Math.random()*playable.length)];
  } else {
    playable.sort((a,b) => pri(b)-pri(a));
    chosen = playable[0];
  }
  runBotPlay(chosen);
}

function runBotPlay(card) {
  const bot = curBot();
  if (!bot) return;
  const idx = bot.hand.indexOf(card);
  if (idx === -1) return;

  SFX.play();
  bot.hand.splice(idx, 1);
  discardPile.push(card);
  currentValue = card.value;

  thinkOff();
  renderBotHand(turnIndex-1); renderDiscard(); updateHUD(); updateDeckCount();

  if (!bot.hand.length) { endRound(turnIndex); return; }
  if (bot.hand.length === 1) { SFX.uno(); showToast(`${bot.name} says UNO! 🤖`); }

  if (card.color === 'wild') {
    SFX.wild();
    const cnt = {red:0,blue:0,green:0,yellow:0};
    bot.hand.forEach(c => { if(cnt[c.color]!==undefined) cnt[c.color]++; });
    currentColor = Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0][0];
    updateGem(); renderDiscard();

    if (card.value === 'wild4') {
      SFX.draw4();
      const tgt = ((turnIndex+direction)+numPlayers)%numPlayers;
      const tname = tgt===0?'You':(bots[tgt-1]?.name||'CPU');
      const msg = tgt===0
        ? `${bot.name} plays +4 → ${currentColor.toUpperCase()}! You draw 4 & are skipped! 😱`
        : `${bot.name} plays +4! ${tname} draws 4 & is skipped! 😱`;
      if (tgt===0) vibe([50,30,50,30,50]);
      drawPenalty(tgt, 4, msg);
      skipNext();
      if (isMyTurn()) { thinkOff(); renderPlayerHand(); updateHUD(); }
      else { thinkOn(); updateHUD(); scheduleBots(); }
      return;
    }
    nextTurn();
    if (isMyTurn()) { thinkOff(); renderPlayerHand(); updateHUD(); }
    else { thinkOn(); updateHUD(); scheduleBots(); }
    return;
  }

  currentColor = card.color;
  updateGem(); renderDiscard();
  applyEffect(card.value, 'bot');
}

/* ══  END ROUND  ════════════════════════════════════════════ */
function endRound(winnerSeat) {
  clearAllTimers();
  const isPlayer = (winnerSeat === 0);
  if (isPlayer) {
    scorePlayer++;
    SFX.win(); vibe([60,30,60,30,100]);
    document.getElementById('win-emoji').textContent = '🎉';
    document.getElementById('win-title').textContent = 'YOU WIN!';
    document.getElementById('win-title').style.color = '#44dc80';
    document.getElementById('win-sub').textContent   = 'You ran out of cards first!';
    spawnConfetti();
  } else {
    scoreCpu++;
    const bot = bots[winnerSeat-1];
    SFX.lose(); vibe(200);
    document.getElementById('win-emoji').textContent = bot?.icon || '🤖';
    document.getElementById('win-title').textContent = `${bot?.name||'CPU'} WINS!`;
    document.getElementById('win-title').style.color = '#ff7070';
    document.getElementById('win-sub').textContent   = 'Better luck next time!';
  }

  const row = document.getElementById('win-score-row');
  if (row) {
    let html = `<div class="wscore"><div class="wlbl">YOU</div><div class="wval">${scorePlayer}</div></div>`;
    bots.forEach(b => {
      html += `<div class="wscore"><div class="wlbl">${b.name}</div><div class="wval">${scoreCpu}</div></div>`;
    });
    row.innerHTML = html;
  }
  document.getElementById('score-p').textContent = scorePlayer;
  document.getElementById('score-c').textContent = scoreCpu;

  setTimeout(() => document.getElementById('win-overlay').classList.add('show'), 520);
}

/* ══  CONFETTI  ═════════════════════════════════════════════ */
function spawnConfetti() {
  const wrap = document.getElementById('confetti-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  const pal = ['#ff1744','#2979ff','#00c853','#ffd600','#ff6d00','#d500f9','#fff','#00e5ff'];
  for (let i=0;i<100;i++) {
    const el = document.createElement('div');
    el.className = 'conf';
    el.style.cssText = `
      left:${Math.random()*100}%;
      background:${pal[i%pal.length]};
      width:${5+Math.random()*10}px;
      height:${5+Math.random()*10}px;
      border-radius:${Math.random()>.5?'50%':'2px'};
      animation-name:conf-fall;
      animation-delay:${Math.random()*1.2}s;
      animation-duration:${1.4+Math.random()*1.1}s;
    `;
    wrap.appendChild(el);
  }
}

/* ══  TOAST  ════════════════════════════════════════════════ */
function showToast(msg, dur=1700) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), dur);
}

/* ══  BOOT  ═════════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', runLoader);