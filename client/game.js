/* ═══════════════════════════════════════════════════════════
   UNO — game.js  |  VS CPU + Online Multiplayer (Separated)
   ═══════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════
   AUDIO
   ════════════════════════════════════════════════════════════ */
let _ctx = null;
function ac() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}
function tone(freq, type, dur, vol, delay) {
  if (!cfg.sfx) return;
  vol = vol || 0.15; delay = delay || 0;
  try {
    const ctx = ac(), osc = ctx.createOscillator(), g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = type; osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    g.gain.setValueAtTime(vol, ctx.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
    osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + dur + 0.01);
  } catch(e) {}
}
const SFX = {
  play()    { tone(440,'sine',.08,.14); tone(660,'sine',.06,.1,.05); },
  draw()    { tone(300,'triangle',.1,.12); tone(260,'triangle',.08,.1,.06); },
  uno()     { [523,659,784,1047].forEach((f,i) => tone(f,'square',.18,.13,i*.09)); },
  skip()    { tone(200,'sawtooth',.12,.12); tone(150,'sawtooth',.1,.1,.1); },
  reverse() { [500,400,300].forEach((f,i) => tone(f,'sine',.1,.11,i*.08)); },
  draw2()   { [250,200].forEach((f,i) => tone(f,'triangle',.1,.13,i*.1)); },
  draw4()   { [250,220,190,160].forEach((f,i) => tone(f,'triangle',.12,.13,i*.08)); },
  wild()    { [523,622,740,880].forEach((f,i) => tone(f,'sine',.1,.11,i*.07)); },
  win()     { [523,659,784,1047,784,1047,1319].forEach((f,i) => tone(f,'sine',.22,.17,i*.12)); },
  lose()    { [330,294,261,220].forEach((f,i) => tone(f,'triangle',.18,.13,i*.13)); },
  click()   { tone(800,'sine',.04,.07); },
};
function vibe(p) { if (cfg.vibe && navigator.vibrate) navigator.vibrate(p || 30); }

/* ════════════════════════════════════════════════════════════
   CONFIG
   ════════════════════════════════════════════════════════════ */
const DEF = { sfx:true, vibe:true, anim:true, style:'classic', table:'green' };
let cfg = Object.assign({}, DEF);
function loadCfg() {
  try { cfg = Object.assign({}, DEF, JSON.parse(localStorage.getItem('uno_cfg') || '{}')); } catch(e) {}
  applyCfg(); syncCfgUI();
}
function saveSetting(k, v) {
  SFX.click(); cfg[k] = v;
  try { localStorage.setItem('uno_cfg', JSON.stringify(cfg)); } catch(e) {}
  applyCfg();
}
function applyCfg() {
  document.body.classList.remove('st-neon','st-pastel');
  if (cfg.style === 'neon')   document.body.classList.add('st-neon');
  if (cfg.style === 'pastel') document.body.classList.add('st-pastel');
  document.body.classList.remove('th-blue','th-purple','th-red','th-dark');
  if (cfg.table !== 'green')  document.body.classList.add('th-'+cfg.table);
}
function syncCfgUI() {
  const s = (id,v) => { const el = document.getElementById(id); if(el) el.checked = !!v; };
  s('snd-sfx', cfg.sfx); s('set-vibe', cfg.vibe); s('set-anim', cfg.anim);
  const ss = document.getElementById('set-style'); if(ss) ss.value = cfg.style;
  const st = document.getElementById('set-table'); if(st) st.value = cfg.table;
}

/* ════════════════════════════════════════════════════════════
   SCREEN NAVIGATION
   ════════════════════════════════════════════════════════════ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}
function showHome()  { SFX.click(); showScreen('screen-home'); }
function showModes() { SFX.click(); showScreen('screen-modes'); }
function showSettings() {
  SFX.click(); syncCfgUI();
  document.getElementById('settings-modal').classList.add('open');
}
function closeSettings() {
  SFX.click();
  document.getElementById('settings-modal').classList.remove('open');
}

/* ════════════════════════════════════════════════════════════
   QUIT HANDLING
   ════════════════════════════════════════════════════════════ */
let _quitFromMp = false;
function confirmQuit()   { SFX.click(); _quitFromMp = false; document.getElementById('quit-modal').classList.add('open'); }
function mpConfirmQuit() { SFX.click(); _quitFromMp = true;  document.getElementById('quit-modal').classList.add('open'); }
function closeQuit()     { SFX.click(); document.getElementById('quit-modal').classList.remove('open'); }
function doQuit()        { if (_quitFromMp) mpQuitGame(); else quitCpuGame(); }
function quitToHome()    { document.getElementById('win-overlay').classList.remove('show'); showHome(); }

/* ════════════════════════════════════════════════════════════
   WORLD / ATMOSPHERE BUILDER (shared)
   ════════════════════════════════════════════════════════════ */
let _particleIv = null, _fireflyIv = null;
function buildGameWorld(worldId) {
  const world = document.getElementById(worldId);
  if (!world) return;
  world.innerHTML = '';

  const stars = document.createElement('div'); stars.className = 'star-layer'; world.appendChild(stars);
  for (let n = 1; n <= 4; n++) { const nb = document.createElement('div'); nb.className = `nebula nebula-${n}`; world.appendChild(nb); }
  const hg = document.createElement('div'); hg.className = 'horizon-glow'; world.appendChild(hg);

  // Speed lines
  for (let sl = 0; sl < 6; sl++) {
    const line = document.createElement('div'); line.className = 'speed-line';
    line.style.cssText = `top:${Math.random()*70+10}%;left:${Math.random()*20-20}%;width:${Math.random()*200+80}px;animation-duration:${Math.random()*3+2}s;animation-delay:${Math.random()*4}s;`;
    world.appendChild(line);
  }
  spawnCardParticles(world, 10); spawnFireflies(world, 16);
}
function startWorldAnimations(worldId) {
  if (_particleIv) clearInterval(_particleIv);
  if (_fireflyIv)  clearInterval(_fireflyIv);
  _particleIv = setInterval(() => { const w = document.getElementById(worldId); if(w) spawnCardParticles(w,2); }, 3000);
  _fireflyIv  = setInterval(() => { const w = document.getElementById(worldId); if(w) spawnFireflies(w,3); }, 2000);
}
function stopWorldAnimations() { clearInterval(_particleIv); clearInterval(_fireflyIv); }

const PARTICLE_CARDS  = ['2','5','7','9','+2','+4','★','⊘','↺'];
const PARTICLE_COLORS = ['linear-gradient(150deg,#ff6060,#c8192c)','linear-gradient(150deg,#5ab0ff,#0057b7)','linear-gradient(150deg,#44dc80,#00a550)','linear-gradient(150deg,#ffe84d,#ffda00)','conic-gradient(#c8192c 0 90deg,#0057b7 90deg 180deg,#00a550 180deg 270deg,#ffda00 270deg)'];
function spawnCardParticles(world, count) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div'); el.className = 'card-particle';
    const dur = (Math.random()*10+8).toFixed(1), size = (Math.random()*16+18).toFixed(0);
    el.style.cssText = `left:${Math.random()*100}%;bottom:${Math.random()*30-5}%;width:${size}px;height:${size*1.5}px;background:${PARTICLE_COLORS[Math.floor(Math.random()*PARTICLE_COLORS.length)]};border-radius:3px;border:1.5px solid rgba(255,255,255,.18);animation-duration:${dur}s;animation-delay:${Math.random()*dur}s;`;
    el.textContent = PARTICLE_CARDS[Math.floor(Math.random()*PARTICLE_CARDS.length)];
    world.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, (parseFloat(dur)+5)*1000);
  }
}
function spawnFireflies(world, count) {
  const FF = ['rgba(100,255,150,','rgba(255,200,80,','rgba(100,200,255,','rgba(255,100,200,'];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div'); el.className = 'firefly';
    const dur = (Math.random()*5+4).toFixed(1), col = FF[Math.floor(Math.random()*FF.length)];
    const fx=(Math.random()-.5)*100, fy=-(Math.random()*80+20), fx2=(Math.random()-.5)*120, fy2=-(Math.random()*150+60);
    el.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*60+20}%;background:${col}.9);box-shadow:0 0 6px 2px ${col}.6);--fx:${fx}px;--fy:${fy}px;--fx2:${fx2}px;--fy2:${fy2}px;animation-duration:${dur}s;animation-delay:${Math.random()*dur}s;`;
    world.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, (parseFloat(dur)+3)*1000);
  }
}
function flashPlay(color, arenaId) {
  if (!cfg.anim) return;
  const cmap = { red:'rgba(255,23,68,.1)', blue:'rgba(41,121,255,.1)', green:'rgba(0,200,83,.1)', yellow:'rgba(255,214,0,.1)', wild:'rgba(255,255,255,.06)' };
  const world = document.getElementById(arenaId || 'game-world'); if (!world) return;
  const flash = document.createElement('div');
  flash.style.cssText = `position:absolute;inset:0;z-index:50;pointer-events:none;background:${cmap[color]||cmap.wild};animation:flash-pop .45s ease-out both;`;
  if (!document.getElementById('flash-style')) {
    const st = document.createElement('style'); st.id='flash-style';
    st.textContent = '@keyframes flash-pop{0%{opacity:0;}20%{opacity:1;}100%{opacity:0;}}';
    document.head.appendChild(st);
  }
  world.appendChild(flash);
  setTimeout(() => { if (flash.parentNode) flash.parentNode.removeChild(flash); }, 600);
}

/* ════════════════════════════════════════════════════════════
   CARD RENDERING (shared helpers)
   ════════════════════════════════════════════════════════════ */
function lbl(v) { const m={skip:'⊘',reverse:'↺',draw2:'+2',wild:'★',wild4:'+4'}; return m[v]!==undefined?m[v]:v; }

function makeCard(card, interactive, idx, onClickFn) {
  const el = document.createElement('div'), l = lbl(card.value);
  el.className = 'card ' + (card.color==='wild' ? 'wild' : card.color);
  el.innerHTML = `<div class="oval"></div><span class="ctL">${l}</span><span class="cMid">${l}</span><span class="ctR">${l}</span>`;
  if (interactive) {
    el.classList.add('p-card'); el.style.animationDelay = ((idx||0)*0.036) + 's';
    if (onClickFn) { el.classList.add('can-play'); el.addEventListener('click', onClickFn); }
    else           el.classList.add('no-play');
  }
  return el;
}
function makeBack(index) {
  const el = document.createElement('div'); el.className = 'card back cpu-c';
  const r = ((index*7+3)%10-5).toFixed(1);
  el.style.setProperty('--r', r+'deg'); el.style.transform = `rotate(${r}deg)`;
  el.style.animationDelay = (index*0.034) + 's';
  el.innerHTML = '<div class="oval"></div><span class="btxt">UNO</span>';
  return el;
}
function renderDiscardPile(pileEl, discardPile, currentColor) {
  if (!pileEl) return;
  pileEl.innerHTML = '';
  if (discardPile.length >= 2) {
    const prev = discardPile[discardPile.length-2];
    const pe = makeCard(prev); pe.classList.add('d-prev');
    pe.style.transform = `rotate(${((discardPile.length*17+3)%14-7).toFixed(1)}deg)`;
    pileEl.appendChild(pe);
  }
  const top = discardPile[discardPile.length-1];
  const te = makeCard(top); te.classList.add('d-top');
  const r2 = ((discardPile.length*13+7)%12-6).toFixed(1);
  te.style.setProperty('--drot', `rotate(${r2}deg)`);
  pileEl.appendChild(te);
  const gmap = { red:'#ff1744', blue:'#2979ff', green:'#00c853', yellow:'#ffd600' };
  const g = gmap[currentColor] || 'rgba(255,255,255,.4)';
  pileEl.style.setProperty('--disc-b', g);
  pileEl.style.setProperty('--disc-g', g+'aa');
  pileEl.style.setProperty('--disc-g2', g+'33');
}
function updateGemEl(gemEl, nameEl, color) {
  const m = { red:'gem-red', blue:'gem-blue', green:'gem-green', yellow:'gem-yellow', wild:'gem-wild' };
  if (gemEl) gemEl.className = m[color] || 'gem-wild';
  if (nameEl) nameEl.textContent = color.toUpperCase();
}

/* ════════════════════════════════════════════════════════════
   TURN DOT (shared)
   ════════════════════════════════════════════════════════════ */
let turnDotEl = null, _dotAnimFrame = null, _currentAngle = 270;
function initTurnDot(arenaId) {
  const arena = document.getElementById(arenaId); if (!arena) return;
  const old = document.getElementById('turn-dot'); if(old && old.parentNode) old.parentNode.removeChild(old);
  const dot = document.createElement('div'); dot.id = 'turn-dot'; dot.setAttribute('data-label','...');
  arena.appendChild(dot); turnDotEl = dot;
  _currentAngle = 270;
}
function getTurnAngle(ti, numPlayers) {
  const a = { 0:270 };
  if (numPlayers === 2) a[1] = 90;
  else if (numPlayers === 3) { a[1]=45; a[2]=135; }
  else if (numPlayers === 4) { a[1]=90; a[2]=180; a[3]=0; }
  return a[ti] !== undefined ? a[ti] : 270;
}
function placeTurnDotAt(angleDeg) {
  if (!turnDotEl) return;
  const arena = document.getElementById(turnDotEl.parentElement?.id) || turnDotEl.parentElement;
  if (!arena) return;
  const W = arena.offsetWidth || 400, H = arena.offsetHeight || 320;
  const rx = W*0.48, ry = H*0.47;
  const rad = (angleDeg-90) * Math.PI/180;
  turnDotEl.style.left = (W/2 + rx*Math.cos(rad)) + 'px';
  turnDotEl.style.top  = (H/2 + ry*Math.sin(rad)) + 'px';
}
function animateTurnDot(target, direction) {
  if (!turnDotEl) return;
  let diff = target - _currentAngle;
  if (direction === 1) { if (diff < 0) diff += 360; }
  else                 { if (diff > 0) diff -= 360; }
  if (Math.abs(diff) < 2) { _currentAngle = target; placeTurnDotAt(target); return; }
  const start = _currentAngle, dur = Math.min(700, Math.max(400, Math.abs(diff)*2.2));
  let startTime = null;
  if (_dotAnimFrame) cancelAnimationFrame(_dotAnimFrame);
  function step(ts) {
    if (!startTime) startTime = ts;
    const t = Math.min(1,(ts-startTime)/dur);
    const e = t<0.5?4*t*t*t:(t-1)*(2*t-2)*(2*t-2)+1;
    placeTurnDotAt(((( start+diff*e)%360)+360)%360);
    if (t < 1) { _dotAnimFrame = requestAnimationFrame(step); }
    else { _currentAngle = ((target%360)+360)%360; _dotAnimFrame = null; }
  }
  _dotAnimFrame = requestAnimationFrame(step);
}
function setTurnDotStyle(isMyTurn, label, direction) {
  if (!turnDotEl) return;
  turnDotEl.setAttribute('data-label', label);
  turnDotEl.textContent = direction === 1 ? '▶' : '◀';
  if (isMyTurn) {
    turnDotEl.style.background = 'radial-gradient(circle at 38% 32%,#a8ffbb,#00c853)';
    turnDotEl.style.boxShadow = '0 0 0 3px rgba(0,200,80,.3),0 0 16px rgba(0,200,80,.9),0 0 40px rgba(0,200,80,.5),0 3px 8px rgba(0,0,0,.5)';
  } else {
    turnDotEl.style.background = 'radial-gradient(circle at 38% 32%,#ff9090,#ff1744)';
    turnDotEl.style.boxShadow = '0 0 0 3px rgba(255,23,68,.3),0 0 16px rgba(255,23,68,.9),0 0 40px rgba(255,23,68,.5),0 3px 8px rgba(0,0,0,.5)';
  }
}

/* ════════════════════════════════════════════════════════════
   TOAST
   ════════════════════════════════════════════════════════════ */
let toastTimer = null;
function showToast(msg, dur) {
  dur = dur || 1700;
  const el = document.getElementById('toast'); if (!el) return;
  el.textContent = msg; el.style.background = el.style.borderColor = el.style.color = '';
  el.classList.add('on'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), dur);
}

/* ════════════════════════════════════════════════════════════
   WIN SCREEN
   ════════════════════════════════════════════════════════════ */
function showWinScreen(opts) {
  // opts: { isWinner, title, sub, emoji, scores:[] }
  const el = document.getElementById('win-emoji'); if(el) el.textContent = opts.emoji || '🎉';
  const wt = document.getElementById('win-title'); if(wt) { wt.textContent = opts.title; wt.style.color = opts.isWinner ? '#44dc80':'#ff7070'; }
  const ws = document.getElementById('win-sub'); if(ws) ws.textContent = opts.sub || '';
  const row = document.getElementById('win-score-row');
  if (row && opts.scores) {
    row.innerHTML = opts.scores.map(s => `<div class="wscore"><div class="wlbl">${s.name}</div><div class="wval">${s.value}</div></div>`).join('');
  }
  if (opts.isWinner) { SFX.win(); vibe([60,30,60,30,100]); spawnConfetti(); }
  else               { SFX.lose(); vibe(200); }
  setTimeout(() => document.getElementById('win-overlay').classList.add('show'), 520);
}
function spawnConfetti() {
  const wrap = document.getElementById('confetti-wrap'); if (!wrap) return;
  wrap.innerHTML = '';
  const pal = ['#ff1744','#2979ff','#00c853','#ffd600','#ff6d00','#d500f9','#fff','#00e5ff'];
  for (let i = 0; i < 120; i++) {
    const el = document.createElement('div'); el.className = 'conf';
    el.style.cssText = `left:${Math.random()*100}%;background:${pal[i%pal.length]};width:${4+Math.random()*10}px;height:${4+Math.random()*12}px;border-radius:${Math.random()>.4?'50%':'2px'};animation-name:conf-fall;animation-delay:${Math.random()*1.4}s;animation-duration:${1.4+Math.random()*1.2}s;`;
    wrap.appendChild(el);
  }
}

/* ════════════════════════════════════════════════════════════
   ██████████████████████████████████████████████████████████
   VS CPU GAME
   ██████████████████████████████████████████████████████████
   ════════════════════════════════════════════════════════════ */
const COLORS   = ['red','blue','green','yellow'];
const VALUES   = ['0','1','2','3','4','5','6','7','8','9','skip','reverse','draw2'];
const WILDS    = ['wild','wild4'];
const BOT_ICONS = ['🤖','👾','🦊'];
const BOT_NAMES = ['Robo','Pixel','Foxy'];

// CPU game state
let cpu_deck=[], cpu_playerHand=[], cpu_bots=[], cpu_discardPile=[];
let cpu_currentColor='', cpu_currentValue='', cpu_turnIndex=0, cpu_numPlayers=0, cpu_direction=1;
let cpu_pendingWild=false, cpu_drawnCard=null, cpu_timers=[], cpu_scorePlayer=0, cpu_scoreCpu=0;
let cpu_cpuCount=1, cpu_difficulty='medium';

// ── Mode select ───────────────────────────────────────────────
function selectCpuCount(btn, count) {
  SFX.click(); document.querySelectorAll('.mpb').forEach(b => b.classList.remove('active'));
  btn.classList.add('active'); cpu_cpuCount = count;
}
function selectDiff(btn, diff) {
  SFX.click(); document.querySelectorAll('.mdb').forEach(b => b.classList.remove('active'));
  btn.classList.add('active'); cpu_difficulty = diff;
}
function startVsCpu() {
  SFX.click(); cpu_scorePlayer = 0; cpu_scoreCpu = 0;
  const dp = document.getElementById('diff-pill'); if(dp) dp.textContent = cpu_difficulty.toUpperCase();
  showScreen('screen-game');
  buildGameWorld('game-world'); startWorldAnimations('game-world');
  setTimeout(cpu_initGame, 200);
}
function quitCpuGame() {
  cpu_clearTimers(); stopWorldAnimations();
  document.getElementById('quit-modal').classList.remove('open');
  document.getElementById('win-overlay').classList.remove('show');
  document.getElementById('color-modal').classList.remove('open');
  showHome();
}
function onPlayAgain() {
  document.getElementById('win-overlay').classList.remove('show');
  document.getElementById('confetti-wrap').innerHTML = '';
  if (_mpActive) mpRestart();
  else cpu_initGame();
}

// ── Deck ──────────────────────────────────────────────────────
function cpu_buildDeck() {
  const d = [];
  COLORS.forEach(c => VALUES.forEach(v => { d.push({color:c,value:v}); if(v!=='0') d.push({color:c,value:v}); }));
  WILDS.forEach(v => { for(let i=0;i<4;i++) d.push({color:'wild',value:v}); });
  return d;
}
function cpu_shuffle(a) { for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function cpu_deal() { if(!cpu_deck.length) cpu_reshuffle(); return cpu_deck.pop(); }
function cpu_reshuffle() { const top=cpu_discardPile.pop(); cpu_deck=cpu_shuffle(cpu_discardPile.slice()); cpu_discardPile=[top]; showToast('Deck reshuffled 🔀'); }

// ── Init ──────────────────────────────────────────────────────
function cpu_initGame() {
  cpu_clearTimers();
  cpu_deck = cpu_shuffle(cpu_buildDeck());
  cpu_playerHand=[]; cpu_discardPile=[]; cpu_turnIndex=0; cpu_direction=1;
  cpu_pendingWild=false; cpu_drawnCard=null;
  cpu_numPlayers = 1 + cpu_cpuCount; cpu_bots=[];
  for(let i=0;i<cpu_cpuCount;i++) cpu_bots.push({name:BOT_NAMES[i], icon:BOT_ICONS[i], hand:[]});
  for(let j=0;j<7;j++) { cpu_playerHand.push(cpu_deal()); cpu_bots.forEach(b => b.hand.push(cpu_deal())); }
  let starter; do{starter=cpu_deal();}while(starter.color==='wild');
  cpu_discardPile.push(starter); cpu_currentColor=starter.color; cpu_currentValue=starter.value;
  cpu_buildCircularLayout();
  document.getElementById('win-overlay').classList.remove('show');
  document.getElementById('confetti-wrap').innerHTML='';
  cpu_thinkOff(); cpu_renderAll(); cpu_updateHUD();
  initTurnDot('circular-arena');
  placeTurnDotAt(270);
  setTurnDotStyle(true,'YOU',1);
}
function cpu_clearTimers() { cpu_timers.forEach(t => clearTimeout(t)); cpu_timers=[]; }

// ── Layout ────────────────────────────────────────────────────
function cpu_buildCircularLayout() {
  const wrap = document.getElementById('opponents-wrap'); if(!wrap) return; wrap.innerHTML='';
  cpu_bots.forEach((bot,i) => {
    const slot = document.createElement('div');
    const posClass = cpu_getBotPos(i, cpu_cpuCount), hClass = cpu_getHandClass(i, cpu_cpuCount);
    const isTop = posClass.indexOf('top') !== -1;
    slot.className = 'player-slot ' + posClass; slot.id = 'cpu-slot-'+i;
    if(isTop) slot.innerHTML=`<div class="slot-avatar av-bot${i}" id="cpu-bubble-${i}">${bot.icon}</div><div class="slot-name">${bot.name}</div><div class="slot-cnt" id="cpu-cnt-${i}">7</div><div class="slot-hand ${hClass}" id="cpu-hand-${i}"></div>`;
    else slot.innerHTML=`<div class="slot-hand ${hClass}" id="cpu-hand-${i}"></div><div class="slot-avatar av-bot${i}" id="cpu-bubble-${i}">${bot.icon}</div><div class="slot-name">${bot.name}</div><div class="slot-cnt" id="cpu-cnt-${i}">7</div>`;
    wrap.appendChild(slot);
    bot.el={hand:document.getElementById('cpu-hand-'+i),cnt:document.getElementById('cpu-cnt-'+i),bubble:document.getElementById('cpu-bubble-'+i)};
  });
  const scoreChip = document.getElementById('score-cpu-chip');
  if (scoreChip) scoreChip.innerHTML = `${cpu_bots[0]?.name||'CPU'} <span id="score-c">${cpu_scoreCpu}</span>`;
}
function cpu_getBotPos(idx,total){
  if(total===1) return 'bot-top-center';
  if(total===2) return idx===0?'bot-top-left':'bot-top-right';
  if(total===3) return ['bot-top-center','bot-mid-left','bot-mid-right'][idx];
  return 'bot-top-center';
}
function cpu_getHandClass(idx,total){
  if(total===3){ if(idx===1) return 'slot-hand-left'; if(idx===2) return 'slot-hand-right'; }
  return '';
}

// ── Render ────────────────────────────────────────────────────
function cpu_renderAll() { cpu_renderHand(); cpu_bots.forEach((_,i) => cpu_renderBotHand(i)); cpu_renderDiscard(); }
function cpu_renderHand() {
  const c = document.getElementById('player-hand'); if(!c) return; c.innerHTML='';
  cpu_playerHand.forEach((card,i) => {
    const myTurn = cpu_turnIndex === 0;
    const playable = myTurn && cpu_canPlay(card);
    const hasDrawn = !!cpu_drawnCard;
    const isDrawnCard = hasDrawn && card === cpu_drawnCard;
    const allowPlay = playable && (!hasDrawn || isDrawnCard);
    const el = makeCard(card, true, i, allowPlay ? () => cpu_onPlayCard(i, el) : null);
    c.appendChild(el);
  });
}
function cpu_renderBotHand(i) {
  const bot=cpu_bots[i]; if(!bot||!bot.el||!bot.el.hand) return;
  bot.el.hand.innerHTML='';
  const isSide = bot.el.hand.classList.contains('slot-hand-left')||bot.el.hand.classList.contains('slot-hand-right');
  const max=isSide?Math.min(bot.hand.length,5):Math.min(bot.hand.length,14);
  for(let j=0;j<max;j++) bot.el.hand.appendChild(makeBack(j));
}
function cpu_renderDiscard() { renderDiscardPile(document.getElementById('discard-pile'), cpu_discardPile, cpu_currentColor); }
function cpu_updateHUD() {
  const myTurn = cpu_turnIndex === 0;
  const hasDrawn = !!cpu_drawnCard;
  const tp = document.getElementById('turn-pill');
  if(tp){ if(myTurn){ tp.textContent=hasDrawn?'PLAY OR PASS':'YOUR TURN'; tp.className='turn-you'; } else{ tp.textContent=(cpu_bots[cpu_turnIndex-1]?.name||'CPU')+"'s Turn"; tp.className='turn-cpu'; } }
  updateGemEl(document.getElementById('color-gem'),document.getElementById('color-name'),cpu_currentColor);
  const dir=document.getElementById('dir-wheel'); if(dir) dir.textContent=cpu_direction===1?'↺':'↻';
  const dc=document.getElementById('deck-count'); if(dc) dc.textContent=cpu_deck.length;
  const pc=document.getElementById('player-count'); if(pc){ pc.textContent=cpu_playerHand.length; cpu_playerHand.length===1?pc.classList.add('uno-pop'):pc.classList.remove('uno-pop'); }
  cpu_bots.forEach((bot,i)=>{ if(bot.el?.cnt){ bot.el.cnt.textContent=bot.hand.length; bot.hand.length===1?bot.el.cnt.classList.add('uno-pop'):bot.el.cnt.classList.remove('uno-pop'); } });
  document.getElementById('score-p').textContent=cpu_scorePlayer;
  const sc=document.getElementById('score-c'); if(sc) sc.textContent=cpu_scoreCpu;
  const ub=document.getElementById('uno-btn'); if(ub) ub.disabled=!(cpu_playerHand.length===2&&myTurn);
  const ah=document.getElementById('action-hint'),pb=document.getElementById('pass-btn');
  if(myTurn){ if(hasDrawn){ const canP=cpu_drawnCard&&cpu_canPlay(cpu_drawnCard); if(ah) ah.textContent=canP?'Play drawn card or pass':'No match — pass'; if(pb){pb.style.display='inline-flex';pb.disabled=false;} } else{ if(ah) ah.textContent='Pick a card or draw'; if(pb) pb.style.display='none'; } }
  else { if(ah) ah.textContent='Waiting…'; if(pb) pb.style.display='none'; }
  const pzone=document.getElementById('player-zone'); if(pzone){ pzone.classList.toggle('my-turn',myTurn); pzone.classList.toggle('not-my-turn',!myTurn); }
  cpu_bots.forEach((bot,i)=>{ const slot=document.getElementById('cpu-slot-'+i); if(slot) slot.classList.toggle('active-bot',cpu_turnIndex===i+1); });
  // Avatar glows
  const yb=document.getElementById('you-bubble'); if(yb) myTurn?yb.classList.add('active-turn'):yb.classList.remove('active-turn');
  cpu_bots.forEach((bot,i)=>{ if(bot.el?.bubble) cpu_turnIndex===i+1?bot.el.bubble.classList.add('active-turn'):bot.el.bubble.classList.remove('active-turn'); });
  // Turn dot
  const dotLabel = myTurn?'YOU':(cpu_bots[cpu_turnIndex-1]?.name||'CPU');
  setTurnDotStyle(myTurn, dotLabel, cpu_direction);
  animateTurnDot(getTurnAngle(cpu_turnIndex, cpu_numPlayers), cpu_direction);
}
function cpu_thinkOn()  { const e=document.getElementById('think-dots'); if(e) e.classList.add('on'); }
function cpu_thinkOff() { const e=document.getElementById('think-dots'); if(e) e.classList.remove('on'); }

// ── Game logic ────────────────────────────────────────────────
function cpu_canPlay(card) { if(!card) return false; if(card.color==='wild') return true; return card.color===cpu_currentColor||card.value===cpu_currentValue; }
function cpu_nextTurn() { cpu_turnIndex=((cpu_turnIndex+cpu_direction)+cpu_numPlayers)%cpu_numPlayers; }
function cpu_skipNext() { cpu_turnIndex=((cpu_turnIndex+cpu_direction*2)+cpu_numPlayers)%cpu_numPlayers; }
function cpu_drawPenalty(seatIdx, n, msg) {
  if(seatIdx===0){ for(let i=0;i<n;i++) cpu_playerHand.push(cpu_deal()); showToast(msg); cpu_renderHand(); cpu_updateHUD(); }
  else { const bot=cpu_bots[seatIdx-1]; if(!bot) return; for(let j=0;j<n;j++) bot.hand.push(cpu_deal()); showToast(msg); cpu_renderBotHand(seatIdx-1); cpu_updateHUD(); }
}

// Player actions
function onDraw() {
  if(cpu_turnIndex!==0||cpu_drawnCard) return;
  SFX.draw(); vibe(15); const card=cpu_deal(); cpu_playerHand.push(card); cpu_drawnCard=card;
  if(cpu_canPlay(card)) { showToast('Tap to play drawn card, or PASS ✋',2500); cpu_renderHand(); cpu_updateHUD(); }
  else { showToast("No match — auto passing…",1600); cpu_renderHand(); cpu_updateHUD(); const t=setTimeout(()=>{cpu_drawnCard=null;cpu_nextTurn();if(cpu_turnIndex===0){cpu_thinkOff();cpu_renderHand();cpu_updateHUD();}else{cpu_thinkOn();cpu_updateHUD();cpu_scheduleBots();}},1400); cpu_timers.push(t); }
}
function passTurn() {
  if(cpu_turnIndex!==0||!cpu_drawnCard) return;
  SFX.click(); cpu_drawnCard=null; cpu_nextTurn();
  if(cpu_turnIndex===0){cpu_thinkOff();cpu_renderHand();cpu_updateHUD();}else{cpu_thinkOn();cpu_updateHUD();cpu_scheduleBots();}
}
function callUno() {
  if(cpu_playerHand.length!==2||cpu_turnIndex!==0) return;
  SFX.uno(); vibe([50,30,50]); document.getElementById('uno-btn').disabled=true; showToast('UNO! 🔥',2200);
}

function cpu_onPlayCard(idx, el) {
  if(cpu_turnIndex!==0) return;
  const card=cpu_playerHand[idx]; if(!cpu_canPlay(card)) return;
  if(cpu_drawnCard){ if(card!==cpu_drawnCard) return; }
  SFX.play(); vibe(20); flashPlay(card.color,'game-world');
  el.classList.add('playing');
  setTimeout(() => {
    cpu_playerHand.splice(idx,1); cpu_discardPile.push(card); cpu_currentValue=card.value; cpu_drawnCard=null;
    cpu_renderDiscard(); cpu_updateHUD();
    if(!cpu_playerHand.length){ cpu_renderHand(); cpu_endRound(0); return; }
    if(card.color==='wild'){ SFX.wild(); cpu_pendingWild=card.value; cpu_renderHand(); setTimeout(()=>document.getElementById('color-modal').classList.add('open'),90); return; }
    cpu_currentColor=card.color; cpu_applyEffect(card.value,'player');
  },270);
}

function chooseColor(color) {
  SFX.click(); document.getElementById('color-modal').classList.remove('open');
  if (_mpActive) { mpChooseColor(color); return; }
  cpu_currentColor=color; updateGemEl(document.getElementById('color-gem'),document.getElementById('color-name'),color);
  cpu_renderDiscard();
  const was4=(cpu_pendingWild==='wild4'); cpu_pendingWild=false;
  if(was4){
    SFX.draw4(); vibe([30,20,30,20,30]);
    const nextIdx=((cpu_turnIndex+cpu_direction)+cpu_numPlayers)%cpu_numPlayers;
    const tn=nextIdx===0?'You':(cpu_bots[nextIdx-1]?.name||'CPU');
    cpu_drawPenalty(nextIdx,4,tn+(nextIdx===0?' draw 4 & skipped! 😈':' draws 4 & skipped! 😈'));
    cpu_skipNext(); cpu_thinkOff(); cpu_updateHUD(); cpu_renderHand();
  } else { cpu_nextTurn(); if(cpu_turnIndex===0){cpu_thinkOff();cpu_renderHand();cpu_updateHUD();}else{cpu_thinkOn();cpu_updateHUD();cpu_scheduleBots();} }
}

function cpu_applyEffect(value, who) {
  const isTwoPlayer=(cpu_numPlayers===2);
  if(value==='skip'){
    SFX.skip(); const ni=((cpu_turnIndex+cpu_direction)+cpu_numPlayers)%cpu_numPlayers; const nn=ni===0?'You':(cpu_bots[ni-1]?.name||'CPU'); showToast(nn+' skipped! ⊘');
    if(isTwoPlayer){if(who==='player'){cpu_thinkOff();cpu_renderHand();cpu_updateHUD();}else{cpu_thinkOn();cpu_updateHUD();cpu_scheduleBots();}}
    else{cpu_skipNext();if(cpu_turnIndex===0){cpu_thinkOff();cpu_renderHand();cpu_updateHUD();}else{cpu_thinkOn();cpu_updateHUD();cpu_scheduleBots();}}
  }else if(value==='reverse'){
    SFX.reverse(); cpu_direction*=-1; showToast(cpu_direction===1?'Direction: Clockwise ↺':'Direction: Counter-CW ↻');
    if(isTwoPlayer){if(who==='player'){cpu_thinkOff();cpu_renderHand();cpu_updateHUD();}else{cpu_thinkOn();cpu_updateHUD();cpu_scheduleBots();}}
    else{cpu_nextTurn();if(cpu_turnIndex===0){cpu_thinkOff();cpu_renderHand();cpu_updateHUD();}else{cpu_thinkOn();cpu_updateHUD();cpu_scheduleBots();}}
  }else if(value==='draw2'){
    SFX.draw2(); const tgt=((cpu_turnIndex+cpu_direction)+cpu_numPlayers)%cpu_numPlayers; const tn=tgt===0?'You':(cpu_bots[tgt-1]?.name||'CPU');
    cpu_drawPenalty(tgt,2,tgt===0?'You draw 2 & skipped! 😖':tn+' draws 2 & skipped! 🃏');
    if(isTwoPlayer){if(who==='player'){cpu_thinkOff();cpu_renderHand();cpu_updateHUD();}else{cpu_thinkOn();cpu_updateHUD();cpu_scheduleBots();}}
    else{cpu_skipNext();if(cpu_turnIndex===0){cpu_thinkOff();cpu_renderHand();cpu_updateHUD();}else{cpu_thinkOn();cpu_updateHUD();cpu_scheduleBots();}}
  }else{
    cpu_nextTurn(); if(cpu_turnIndex===0){cpu_thinkOff();cpu_renderHand();cpu_updateHUD();}else{cpu_thinkOn();cpu_updateHUD();cpu_scheduleBots();}
  }
}

// Bot AI
function cpu_scheduleBots() {
  if(cpu_turnIndex===0) return; cpu_clearTimers();
  const delay=cpu_difficulty==='hard'?1600+Math.random()*600:cpu_difficulty==='easy'?3000+Math.random()*1200:2200+Math.random()*800;
  cpu_timers.push(setTimeout(cpu_runBot,delay));
}
function cpu_runBot() {
  if(cpu_turnIndex===0) return;
  const bot=cpu_bots[cpu_turnIndex-1]; if(!bot) return;
  const playable=bot.hand.filter(cpu_canPlay);
  if(!playable.length){
    SFX.draw(); const drawn=cpu_deal(); bot.hand.push(drawn); showToast(bot.name+' draws a card');
    cpu_renderBotHand(cpu_turnIndex-1); cpu_updateHUD();
    if(cpu_canPlay(drawn)) cpu_timers.push(setTimeout(()=>cpu_runBotPlay(drawn),750));
    else cpu_timers.push(setTimeout(()=>{cpu_nextTurn();if(cpu_turnIndex===0){cpu_thinkOff();cpu_renderHand();cpu_updateHUD();}else{cpu_thinkOn();cpu_updateHUD();cpu_scheduleBots();}},1400));
    return;
  }
  const pri=(c)=>{if(c.value==='wild4') return 8;if(c.value==='draw2') return 5;if(c.value==='skip') return 4;if(c.value==='reverse') return 3;if(c.color==='wild') return 2;if(c.color===cpu_currentColor) return 1;return 0;};
  const chosen=cpu_difficulty==='easy'?playable[Math.floor(Math.random()*playable.length)]:playable.sort((a,b)=>pri(b)-pri(a))[0];
  cpu_runBotPlay(chosen);
}
function cpu_runBotPlay(card) {
  const bot=cpu_bots[cpu_turnIndex-1]; if(!bot) return;
  const idx=bot.hand.indexOf(card); if(idx===-1) return;
  SFX.play(); flashPlay(card.color,'game-world'); bot.hand.splice(idx,1); cpu_discardPile.push(card); cpu_currentValue=card.value;
  cpu_thinkOff(); cpu_renderBotHand(cpu_turnIndex-1); cpu_renderDiscard(); cpu_updateHUD();
  if(!bot.hand.length){cpu_endRound(cpu_turnIndex);return;}
  if(bot.hand.length===1){SFX.uno();showToast(bot.name+' says UNO! 🤖');}
  if(card.color==='wild'){
    SFX.wild(); const cnt={red:0,blue:0,green:0,yellow:0}; bot.hand.forEach(c=>{if(cnt[c.color]!==undefined)cnt[c.color]++;});
    cpu_currentColor=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0][0];
    updateGemEl(document.getElementById('color-gem'),document.getElementById('color-name'),cpu_currentColor); cpu_renderDiscard();
    if(card.value==='wild4'){
      SFX.draw4(); const tgt=((cpu_turnIndex+cpu_direction)+cpu_numPlayers)%cpu_numPlayers; const tn=tgt===0?'You':(cpu_bots[tgt-1]?.name||'CPU');
      cpu_drawPenalty(tgt,4,tgt===0?bot.name+' plays +4! You draw 4! 😱':bot.name+' plays +4! '+tn+' draws 4! 😱');
      if(tgt===0) vibe([50,30,50,30,50]); cpu_skipNext();
      if(cpu_turnIndex===0){cpu_thinkOff();cpu_renderHand();cpu_updateHUD();}else{cpu_thinkOn();cpu_updateHUD();cpu_scheduleBots();}
      return;
    }
    cpu_nextTurn(); if(cpu_turnIndex===0){cpu_thinkOff();cpu_renderHand();cpu_updateHUD();}else{cpu_thinkOn();cpu_updateHUD();cpu_scheduleBots();}
    return;
  }
  cpu_currentColor=card.color; cpu_renderDiscard(); cpu_applyEffect(card.value,'bot');
}

function cpu_endRound(winnerSeat) {
  cpu_clearTimers();
  const isPlayer=(winnerSeat===0);
  if(isPlayer) cpu_scorePlayer++; else cpu_scoreCpu++;
  showWinScreen({
    isWinner:isPlayer, emoji:isPlayer?'🎉':(cpu_bots[winnerSeat-1]?.icon||'🤖'),
    title:isPlayer?'YOU WIN!':(cpu_bots[winnerSeat-1]?.name||'CPU')+' WINS!',
    sub:isPlayer?'You ran out of cards first!':'Better luck next time!',
    scores:[{name:'You',value:cpu_scorePlayer},...cpu_bots.map(b=>({name:b.name,value:cpu_scoreCpu}))]
  });
}

/* ════════════════════════════════════════════════════════════
   ██████████████████████████████████████████████████████████
   MULTIPLAYER GAME
   ██████████████████████████████████████████████████████████
   ════════════════════════════════════════════════════════════ */
let socket = null;
let _mpActive = false;
let mp_roomCode = '';
let mp_mySeat = -1;
let mp_isHost = false;
let mp_players = [];
let mp_hand = [];
let mp_discardPile = [];
let mp_currentColor = '';
let mp_currentValue = '';
let mp_direction = 1;
let mp_turnSeat = -1;
let mp_deckCount = 0;
let mp_drawnThisTurn = false;
let mp_myName = 'Player';
let mp_scoreMap = {}; // seatIndex -> score

function showLobby() {
  SFX.click(); showScreen('screen-lobby');
  mp_connectSocket();
}
function mp_connectSocket() {
  if (socket && socket.connected) { updateLobbyStatus('Connected! Create or join a room.', true); return; }
  if (typeof io === 'undefined') { updateLobbyStatus('Server not reachable — run: npm start', false); return; }
  updateLobbyStatus('Connecting…', false);
  try {
    socket = io({ transports: ['websocket','polling'] });
    socket.on('connect', ()         => { updateLobbyStatus('Connected! Create or join a room.', true); mp_myName = document.getElementById('player-name-input')?.value || 'Player'; });
    socket.on('disconnect', ()      => { updateLobbyStatus('Disconnected', false); });
    socket.on('connect_error', ()   => { updateLobbyStatus('Cannot reach server — run: npm start', false); });
    socket.on('room:joined',    mp_onRoomJoined);
    socket.on('room:players',   mp_onRoomPlayers);
    socket.on('room:error',     d  => showToast('Error: ' + d.msg, 3000));
    socket.on('room:player_left', d => showToast(d.name + ' left the game', 2500));
    socket.on('game:started',   mp_onGameStarted);
    socket.on('game:state',     mp_onGameState);
    socket.on('game:card_played', mp_onCardPlayed);
    socket.on('game:choose_color', () => { SFX.wild(); document.getElementById('color-modal').classList.add('open'); });
    socket.on('game:drew_playable', d => { mp_drawnThisTurn=true; showToast('Drew a playable card — play it or pass!',2500); mp_renderHand(); mp_updateHUD(); });
    socket.on('game:over',      mp_onGameOver);
    socket.on('game:toast',     d  => showToast(d.msg, d.dur||2000));
  } catch(e) { updateLobbyStatus('Socket.IO error: ' + e.message, false); }
}

function createRoom() {
  if (!socket?.connected) { showToast('Not connected — is the server running?', 2500); return; }
  mp_myName = document.getElementById('player-name-input')?.value?.trim() || 'Player';
  socket.emit('room:create', { name:mp_myName, icon:'😎', maxPlayers:4 });
}
function promptJoinRoom() {
  if (!socket?.connected) { showToast('Not connected — is the server running?', 2500); return; }
  const code = prompt('Enter room code:')?.trim().toUpperCase(); if (!code) return;
  mp_myName = document.getElementById('player-name-input')?.value?.trim() || 'Player';
  socket.emit('room:join', { room:code, name:mp_myName, icon:'😎' });
}
function startMultiGame() {
  if (!socket || !mp_isHost) return;
  if (mp_players.filter(Boolean).length < 2) { showToast('Need at least 2 players!', 2000); return; }
  socket.emit('game:begin', { room: mp_roomCode });
}
function copyRoomCode() {
  SFX.click(); if(navigator.clipboard && mp_roomCode) navigator.clipboard.writeText(mp_roomCode);
  showToast('Room code copied! 📋');
}
function mpQuitGame() {
  document.getElementById('quit-modal').classList.remove('open');
  document.getElementById('win-overlay').classList.remove('show');
  document.getElementById('color-modal').classList.remove('open');
  if (socket && mp_roomCode) socket.emit('room:leave', { room: mp_roomCode });
  _mpActive = false; mp_roomCode=''; mp_mySeat=-1; mp_isHost=false; mp_players=[];
  stopWorldAnimations(); showHome();
}
function mpRestart() {
  // Return to lobby
  document.getElementById('win-overlay').classList.remove('show');
  showScreen('screen-lobby');
}

function updateLobbyStatus(msg, ok) {
  const el = document.getElementById('lobby-status-txt'); if(el) el.textContent = msg;
  const dot = document.getElementById('lstat-dot'); if(dot) dot.style.background = ok ? '#00c853' : '#ff1744';
}
function mp_renderLobbyPlayers() {
  const wrap = document.getElementById('lobby-players'); if(!wrap) return;
  wrap.innerHTML = '';
  mp_players.forEach((p,i) => {
    if (!p) return;
    const isMe = i === mp_mySeat;
    const row = document.createElement('div'); row.className = 'lobby-player-row';
    row.innerHTML = `<div class="lpr-avatar ${isMe?'lpr-you':'lpr-other'}">${p.icon||'🎮'}</div><div class="lpr-name">${p.name}${isMe?' (You)':''}</div><div class="lpr-status lpr-s-ready">READY</div>`;
    wrap.appendChild(row);
  });
}

function mp_onRoomJoined(data) {
  mp_roomCode = data.room; mp_mySeat = data.seat; mp_isHost = data.isHost;
  mp_players = data.players;
  const cw = document.getElementById('lobby-code-wrap'); if(cw) cw.style.display='flex';
  const lc = document.getElementById('lobby-code'); if(lc) lc.textContent = data.room;
  mp_renderLobbyPlayers();
  const sb = document.getElementById('lobby-start-btn'); if(sb) sb.disabled = !(data.isHost && data.players.filter(Boolean).length>=2);
  updateLobbyStatus(`Room ${data.room} — ${data.isHost?'You are the host':'Waiting for host to start'}`, true);
  showToast(data.isHost ? '🏠 Room created! Share the code.' : `✅ Joined room ${data.room}`, 2500);
}
function mp_onRoomPlayers(data) {
  mp_players = data.players; mp_renderLobbyPlayers();
  const sb = document.getElementById('lobby-start-btn'); if(sb) sb.disabled = !(mp_isHost && data.players.filter(Boolean).length>=2);
  updateLobbyStatus(`${data.players.filter(Boolean).length} player(s) in room`, true);
}
function mp_onGameStarted() {
  _mpActive = true; mp_drawnThisTurn = false;
  showScreen('screen-mp-game');
  buildGameWorld('mp-game-world'); startWorldAnimations('mp-game-world');
  // Init score map
  mp_players.filter(Boolean).forEach(p => { if(mp_scoreMap[p.seat]===undefined) mp_scoreMap[p.seat]=0; });
  // Update room badge
  const rb = document.getElementById('mp-room-badge'); if(rb) rb.textContent = `ROOM: ${mp_roomCode}`;
  // Update player name
  const yn = document.getElementById('mp-you-name'); if(yn) yn.textContent = mp_players[mp_mySeat]?.name || 'You';
  // Player badge
  const pb = document.getElementById('mp-player-badge'); if(pb) pb.textContent = `P${mp_mySeat+1}`;
  // You bubble icon
  const yb = document.getElementById('mp-you-bubble'); if(yb) yb.textContent = mp_players[mp_mySeat]?.icon || '😎';
}
function mp_onGameState(state) {
  mp_hand = state.hand || [];
  mp_discardPile = [state.discardTop];
  mp_currentColor = state.currentColor;
  mp_currentValue = state.currentValue;
  mp_direction = state.direction;
  mp_turnSeat = state.turnSeat;
  mp_deckCount = state.deckCount;
  if (!state.drawnThisTurn) mp_drawnThisTurn = false;
  // Build opponent slots if needed
  mp_buildOpponentSlots(state.players);
  mp_renderHand();
  mp_renderDiscard();
  mp_updateHUD(state.players);
}
function mp_onCardPlayed(data) {
  flashPlay(data.card?.color, 'mp-game-world');
  SFX.play();
  if (data.seat !== mp_mySeat) showToast(`${data.playerName} played ${lbl(data.card?.value)}!`, 1500);
}
function mp_onGameOver(data) {
  _mpActive = false;
  const isMe = data.winnerSeat === mp_mySeat;
  if (data.abandoned) { showWinScreen({ isWinner:false, emoji:'😢', title:'GAME OVER', sub:'A player disconnected', scores:[] }); return; }
  if (isMe) mp_scoreMap[mp_mySeat] = (mp_scoreMap[mp_mySeat]||0)+1;
  showWinScreen({
    isWinner: isMe, emoji: isMe?'🎉':'😔',
    title: isMe?'YOU WIN!': (data.winnerName||'Someone')+' WINS!',
    sub: isMe?'You ran out of cards first!':'Better luck next time!',
    scores: mp_players.filter(Boolean).map(p => ({name:p.name+(p.seat===mp_mySeat?' (You)':''), value:mp_scoreMap[p.seat]||0}))
  });
}

// MP Layout
let _mpOpponentsBuilt = false;
function mp_buildOpponentSlots(players) {
  const wrap = document.getElementById('mp-opponents-wrap'); if(!wrap) return;
  const others = players.filter(p => p.seat !== mp_mySeat);
  // Only rebuild if player count changed
  if (wrap.children.length === others.length) return;
  wrap.innerHTML=''; _mpOpponentsBuilt=false;
  const positions = mp_getPositions(others.length);
  others.forEach((p, i) => {
    const slot = document.createElement('div');
    slot.className = 'player-slot ' + positions[i]; slot.id = `mp-opp-slot-${p.seat}`;
    slot.innerHTML = `<div class="slot-avatar av-mp${i}" id="mp-opp-bubble-${p.seat}">${p.icon||'🎮'}</div><div class="slot-name">${p.name}</div><div class="slot-cnt" id="mp-opp-cnt-${p.seat}">${p.cardCount}</div><div class="slot-hand" id="mp-opp-hand-${p.seat}"></div>`;
    wrap.appendChild(slot);
  });
  initTurnDot('mp-circular-arena');
  placeTurnDotAt(270);
  _mpOpponentsBuilt = true;
}
function mp_getPositions(count) {
  if (count===1) return ['bot-top-center'];
  if (count===2) return ['bot-top-left','bot-top-right'];
  if (count===3) return ['bot-top-center','bot-mid-left','bot-mid-right'];
  return ['bot-top-center','bot-mid-left','bot-top-right','bot-mid-right'];
}

function mp_renderHand() {
  const c = document.getElementById('mp-player-hand'); if(!c) return; c.innerHTML='';
  const isMyTurn = mp_turnSeat === mp_mySeat;
  mp_hand.forEach((card,i) => {
    const playable = isMyTurn && mp_canPlay(card);
    const isDrawnCard = mp_drawnThisTurn && i === mp_hand.length-1;
    const hasDrawn = mp_drawnThisTurn;
    const allowPlay = playable && (!hasDrawn || isDrawnCard);
    const el = makeCard(card, true, i, allowPlay ? () => mpPlayCard(card, el) : null);
    c.appendChild(el);
  });
}
function mp_renderDiscard() { renderDiscardPile(document.getElementById('mp-discard-pile'), mp_discardPile, mp_currentColor); }
function mp_canPlay(card) { if(!card) return false; if(card.color==='wild') return true; return card.color===mp_currentColor||card.value===mp_currentValue; }

function mp_updateHUD(players) {
  const isMyTurn = mp_turnSeat === mp_mySeat;
  const tp = document.getElementById('mp-turn-pill');
  if(tp){
    if(isMyTurn){ tp.textContent = mp_drawnThisTurn?'PLAY OR PASS':'YOUR TURN'; tp.className='turn-you'; }
    else { const p=players?.find(p=>p.seat===mp_turnSeat); tp.textContent=(p?.name||'Opponent')+"'s Turn"; tp.className='turn-cpu'; }
  }
  updateGemEl(document.getElementById('mp-color-gem'),document.getElementById('mp-color-name'),mp_currentColor);
  const dir=document.getElementById('mp-dir-wheel'); if(dir) dir.textContent=mp_direction===1?'↺':'↻';
  const dc=document.getElementById('mp-deck-count'); if(dc) dc.textContent=mp_deckCount;
  const pc=document.getElementById('mp-player-count'); if(pc){ pc.textContent=mp_hand.length; mp_hand.length===1?pc.classList.add('uno-pop'):pc.classList.remove('uno-pop'); }
  // Opponent counts
  if(players) players.filter(p=>p.seat!==mp_mySeat).forEach(p => {
    const cnt=document.getElementById(`mp-opp-cnt-${p.seat}`); if(cnt){ cnt.textContent=p.cardCount; p.cardCount===1?cnt.classList.add('uno-pop'):cnt.classList.remove('uno-pop'); }
    const hand=document.getElementById(`mp-opp-hand-${p.seat}`); if(hand){ hand.innerHTML=''; for(let j=0;j<Math.min(p.cardCount,12);j++) hand.appendChild(makeBack(j)); }
    const slot=document.getElementById(`mp-opp-slot-${p.seat}`); if(slot) slot.classList.toggle('active-bot', mp_turnSeat===p.seat);
    const bub=document.getElementById(`mp-opp-bubble-${p.seat}`); if(bub) mp_turnSeat===p.seat?bub.classList.add('active-turn'):bub.classList.remove('active-turn');
  });
  const ub=document.getElementById('mp-uno-btn'); if(ub) ub.disabled=!(mp_hand.length===2&&isMyTurn);
  const ah=document.getElementById('mp-action-hint'),pb=document.getElementById('mp-pass-btn');
  if(isMyTurn){
    if(mp_drawnThisTurn){ const canP=mp_hand.length>0&&mp_canPlay(mp_hand[mp_hand.length-1]); if(ah) ah.textContent=canP?'Play drawn card or pass':'No match — pass'; if(pb){pb.style.display='inline-flex';pb.disabled=false;} }
    else{ if(ah) ah.textContent='Pick a card or draw'; if(pb) pb.style.display='none'; }
  }else{ if(ah) ah.textContent='Waiting…'; if(pb) pb.style.display='none'; }
  const pzone=document.getElementById('mp-player-zone'); if(pzone){ pzone.classList.toggle('my-turn',isMyTurn); pzone.classList.toggle('not-my-turn',!isMyTurn); }
  const yb=document.getElementById('mp-you-bubble'); if(yb) isMyTurn?yb.classList.add('active-turn'):yb.classList.remove('active-turn');
  // Thinking dots
  const td=document.getElementById('mp-think-dots'); if(td) isMyTurn?td.classList.remove('on'):td.classList.add('on');
  // Turn dot
  if(players){
    const totalPlayers = players.length;
    const myGlobalIdx = mp_mySeat;
    const turnGlobalIdx = mp_turnSeat;
    // Map seats to turn dot index (0=you, 1..n=others in order)
    const turnDotIdx = turnGlobalIdx === myGlobalIdx ? 0 : (() => {
      const others = players.filter(p=>p.seat!==myGlobalIdx).map(p=>p.seat).sort((a,b)=>a-b);
      return others.indexOf(turnGlobalIdx)+1;
    })();
    const dotLabel = isMyTurn?'YOU':(players.find(p=>p.seat===mp_turnSeat)?.name||'???');
    setTurnDotStyle(isMyTurn, dotLabel, mp_direction);
    animateTurnDot(getTurnAngle(turnDotIdx, totalPlayers), mp_direction);
  }
}

// MP player actions
function mpPlayCard(card, el) {
  if (!socket || mp_turnSeat !== mp_mySeat) return;
  SFX.play(); vibe(20); el.classList.add('playing');
  if(card.color==='wild'){
    setTimeout(()=>{ document.getElementById('color-modal').classList.add('open'); mp_hand.splice(mp_hand.findIndex(c=>c===card),1); socket.emit('game:play',{room:mp_roomCode,card}); },200);
  } else {
    socket.emit('game:play', { room: mp_roomCode, card });
    mp_drawnThisTurn = false;
  }
}
function mpOnDraw() {
  if(!socket||mp_turnSeat!==mp_mySeat||mp_drawnThisTurn) return;
  SFX.draw(); vibe(15);
  socket.emit('game:draw', { room: mp_roomCode });
}
function mpPassTurn() {
  if(!socket||mp_turnSeat!==mp_mySeat||!mp_drawnThisTurn) return;
  SFX.click(); mp_drawnThisTurn=false;
  socket.emit('game:pass', { room: mp_roomCode });
}
function mpCallUno() {
  if(!socket||mp_hand.length!==2||mp_turnSeat!==mp_mySeat) return;
  SFX.uno(); vibe([50,30,50]);
  socket.emit('game:uno', { room: mp_roomCode });
  document.getElementById('mp-uno-btn').disabled=true;
  showToast('UNO! 🔥',2200);
}
function mpChooseColor(color) {
  if(!socket) return;
  socket.emit('game:color', { room: mp_roomCode, color });
}

/* ════════════════════════════════════════════════════════════
   LOADING & BOOT
   ════════════════════════════════════════════════════════════ */
function runLoader() {
  showScreen('screen-loading');
  const fill=document.getElementById('load-fill'), pct=document.getElementById('load-pct'); let p=0;
  const iv=setInterval(()=>{
    p+=Math.random()*14+4; if(p>=100){p=100;clearInterval(iv);}
    if(fill) fill.style.width=p+'%'; if(pct) pct.textContent=Math.round(p)+'%';
    if(p>=100) setTimeout(()=>{loadCfg();showHome();},400);
  },110);
}

window.addEventListener('DOMContentLoaded', () => {
  runLoader();
  document.getElementById('settings-modal')?.addEventListener('click', e => { if(e.target===e.currentTarget) closeSettings(); });
  // Make mp-draw-pile clickable
  document.getElementById('mp-draw-pile')?.addEventListener('click', mpOnDraw);
});