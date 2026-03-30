/* ═══════════════════════════════════════════════════════════
   UNO — game.js  v8  (Cinematic Edition)
   ═══════════════════════════════════════════════════════════ */

/* ══  WEB AUDIO  ══════════════════════════════════════════ */
let _ctx = null;
function ac() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
  return _ctx;
}
function tone(freq, type, dur, vol, delay) {
  vol = vol || 0.15; delay = delay || 0;
  if (!cfg.sfx) return;
  try {
    var ctx = ac(), osc = ctx.createOscillator(), g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = type; osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    g.gain.setValueAtTime(vol, ctx.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
    osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + dur + 0.01);
  } catch(e) {}
}
var SFX = {
  play()    { tone(440,'sine',.08,.14); tone(660,'sine',.06,.1,.05); },
  draw()    { tone(300,'triangle',.1,.12); tone(260,'triangle',.08,.1,.06); },
  uno()     { [523,659,784,1047].forEach(function(f,i){ tone(f,'square',.18,.13,i*.09); }); },
  skip()    { tone(200,'sawtooth',.12,.12); tone(150,'sawtooth',.1,.1,.1); },
  reverse() { [500,400,300].forEach(function(f,i){ tone(f,'sine',.1,.11,i*.08); }); },
  draw2()   { [250,200].forEach(function(f,i){ tone(f,'triangle',.1,.13,i*.1); }); },
  draw4()   { [250,220,190,160].forEach(function(f,i){ tone(f,'triangle',.12,.13,i*.08); }); },
  wild()    { [523,622,740,880].forEach(function(f,i){ tone(f,'sine',.1,.11,i*.07); }); },
  win()     { [523,659,784,1047,784,1047,1319].forEach(function(f,i){ tone(f,'sine',.22,.17,i*.12); }); },
  lose()    { [330,294,261,220].forEach(function(f,i){ tone(f,'triangle',.18,.13,i*.13); }); },
  click()   { tone(800,'sine',.04,.07); },
};
function vibe(p) { p=p||30; if (cfg.vibe && navigator.vibrate) navigator.vibrate(p); }

/* ══  CONFIG  ══════════════════════════════════════════════ */
var DEF = { sfx:true, vibe:true, anim:true, style:'classic', table:'green' };
var cfg = Object.assign({}, DEF);
function loadCfg() {
  try { cfg = Object.assign({}, DEF, JSON.parse(localStorage.getItem('uno_cfg')||'{}')); } catch(e) {}
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
  function s(id,v){ var el=document.getElementById(id); if(el) el.checked=!!v; }
  s('snd-sfx',cfg.sfx); s('set-vibe',cfg.vibe); s('set-anim',cfg.anim);
  var ss=document.getElementById('set-style'); if(ss) ss.value=cfg.style;
  var st=document.getElementById('set-table'); if(st) st.value=cfg.table;
}

/* ══  SCREEN NAV  ═══════════════════════════════════════════ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
  var el = document.getElementById(id);
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

/* ══  MODE SELECT  ══════════════════════════════════════════ */
var cpuCount   = 1;
var mpCount    = 2;
var difficulty = 'medium';
function selectPlayers(btn, count, mode) {
  SFX.click();
  document.querySelectorAll('.mpb[data-mode="'+mode+'"]').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  if (mode === 'cpu') cpuCount = count;
  else mpCount = count;
}
function selectDiff(btn, diff) {
  SFX.click();
  document.querySelectorAll('.mdb').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  difficulty = diff;
}
function startVsCpu() {
  SFX.click();
  gameMode = 'cpu';
  scorePlayer = 0; scoreCpu = 0;
  showScreen('screen-game');
  var dp = document.getElementById('diff-pill');
  if (dp) dp.textContent = difficulty.toUpperCase();
  buildGameWorld();
  setTimeout(initGame, 200);
}

/* ══════════════════════════════════════════════════════════
   CINEMATIC GAME WORLD BUILDER
   ══════════════════════════════════════════════════════════ */
var particleInterval = null;
var fireflyInterval  = null;

function buildGameWorld() {
  var world = document.getElementById('game-world');
  if (!world) return;
  world.innerHTML = '';

  var stars = document.createElement('div');
  stars.className = 'star-layer';
  world.appendChild(stars);

  for (var n = 1; n <= 4; n++) {
    var neb = document.createElement('div');
    neb.className = 'nebula nebula-' + n;
    world.appendChild(neb);
  }

  var hg = document.createElement('div');
  hg.className = 'horizon-glow';
  world.appendChild(hg);

  var felt = document.getElementById('felt-table');
  if (felt) {
    var oldShimmer = felt.querySelector('.table-shimmer');
    if (!oldShimmer) {
      var shimmer = document.createElement('div');
      shimmer.className = 'table-shimmer';
      felt.appendChild(shimmer);
    }
  }

  for (var sl = 0; sl < 6; sl++) {
    var line = document.createElement('div');
    line.className = 'speed-line';
    line.style.cssText =
      'top:'+(Math.random()*70+10)+'%;'+
      'left:'+(Math.random()*20-20)+'%;'+
      'width:'+(Math.random()*200+80)+'px;'+
      'animation-duration:'+(Math.random()*3+2)+'s;'+
      'animation-delay:'+(Math.random()*4)+'s;';
    world.appendChild(line);
  }

  spawnCardParticles(world, 10);
  spawnFireflies(world, 16);

  if (particleInterval) clearInterval(particleInterval);
  if (fireflyInterval)  clearInterval(fireflyInterval);
  particleInterval = setInterval(function() {
    var w = document.getElementById('game-world');
    if (w) spawnCardParticles(w, 2);
  }, 3000);
  fireflyInterval = setInterval(function() {
    var w = document.getElementById('game-world');
    if (w) spawnFireflies(w, 3);
  }, 2000);
}

function spawnCardParticles(world, count) {
  var PARTICLE_CARDS = ['2','5','7','9','+2','+4','★','⊘','↺'];
  var PARTICLE_COLORS = [
    'linear-gradient(150deg,#ff6060,#c8192c)',
    'linear-gradient(150deg,#5ab0ff,#0057b7)',
    'linear-gradient(150deg,#44dc80,#00a550)',
    'linear-gradient(150deg,#ffe84d,#ffda00)',
    'conic-gradient(#c8192c 0 90deg,#0057b7 90deg 180deg,#00a550 180deg 270deg,#ffda00 270deg)'
  ];
  for (var i = 0; i < count; i++) {
    (function() {
      var el = document.createElement('div');
      el.className = 'card-particle';
      var dur = (Math.random()*10 + 8).toFixed(1);
      var size = (Math.random()*16 + 18).toFixed(0);
      el.style.cssText =
        'left:'+Math.random()*100+'%;'+
        'bottom:'+(Math.random()*30-5)+'%;'+
        'width:'+size+'px;'+
        'height:'+(size*1.5)+'px;'+
        'background:'+PARTICLE_COLORS[Math.floor(Math.random()*PARTICLE_COLORS.length)]+';'+
        'border-radius:3px;'+
        'border:1.5px solid rgba(255,255,255,.18);'+
        'animation-duration:'+dur+'s;'+
        'animation-delay:'+(Math.random()*dur)+'s;';
      el.textContent = PARTICLE_CARDS[Math.floor(Math.random()*PARTICLE_CARDS.length)];
      world.appendChild(el);
      setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, (parseFloat(dur)+5)*1000);
    })();
  }
}

function spawnFireflies(world, count) {
  var FF_COLORS = ['rgba(100,255,150,','rgba(255,200,80,','rgba(100,200,255,','rgba(255,100,200,','rgba(200,255,100,'];
  for (var i = 0; i < count; i++) {
    (function() {
      var el = document.createElement('div');
      el.className = 'firefly';
      var dur = (Math.random()*5 + 4).toFixed(1);
      var col = FF_COLORS[Math.floor(Math.random()*FF_COLORS.length)];
      var fx  = ((Math.random()-0.5)*100).toFixed(0);
      var fy  = -(Math.random()*80+20);
      var fx2 = ((Math.random()-0.5)*120).toFixed(0);
      var fy2 = -(Math.random()*150+60);
      el.style.cssText =
        'left:'+Math.random()*100+'%;'+
        'top:'+(Math.random()*60+20)+'%;'+
        'background:'+col+'.9);'+
        'box-shadow:0 0 6px 2px '+col+'.6);'+
        '--fx:'+fx+'px;'+
        '--fy:'+fy+'px;'+
        '--fx2:'+fx2+'px;'+
        '--fy2:'+fy2+'px;'+
        'animation-duration:'+dur+'s;'+
        'animation-delay:'+(Math.random()*dur)+'s;';
      world.appendChild(el);
      setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, (parseFloat(dur)+3)*1000);
    })();
  }
}

function flashPlay(color) {
  if (!cfg.anim) return;
  var colorMap = { red:'rgba(255,23,68,.1)', blue:'rgba(41,121,255,.1)', green:'rgba(0,200,83,.1)', yellow:'rgba(255,214,0,.1)', wild:'rgba(255,255,255,.06)' };
  var world = document.getElementById('game-world');
  if (!world) return;
  if (!document.getElementById('flash-style')) {
    var st = document.createElement('style');
    st.id = 'flash-style';
    st.textContent = '@keyframes flash-pop{0%{opacity:0;}20%{opacity:1;}100%{opacity:0;}}';
    document.head.appendChild(st);
  }
  var flash = document.createElement('div');
  flash.style.cssText = 'position:absolute;inset:0;z-index:50;pointer-events:none;background:'+(colorMap[color]||colorMap.wild)+';animation:flash-pop .45s ease-out both;';
  world.appendChild(flash);
  setTimeout(function(){ if (flash.parentNode) flash.parentNode.removeChild(flash); }, 600);
}

/* ══════════════════════════════════════════════════════════
   MULTIPLAYER — Socket.IO
   ══════════════════════════════════════════════════════════ */
var socket=null, mpRoomCode='', mpMyId='', mpPlayers=[], mpSeatIndex=-1;
var mpIsHost=false, mpGameActive=false, mpDrawnThisTurn=false;
var MP_SERVER = window.location.origin;

function connectSocket() {
  if (socket && socket.connected) return;
  if (!window.io) {
    var s = document.createElement('script');
    s.src = MP_SERVER + '/socket.io/socket.io.js';
    s.onload = function(){ doConnect(); };
    s.onerror = function(){ updateLobbyStatus('Cannot reach server — is server.js running?', false); };
    document.head.appendChild(s);
  } else { doConnect(); }
}
function doConnect() {
  socket = io(MP_SERVER, { transports: ['websocket','polling'] });
  socket.on('connect', function() { mpMyId = socket.id; updateLobbyStatus('Connected! Create or join a room.', true); });
  socket.on('disconnect', function() { updateLobbyStatus('Disconnected — reconnecting…', false); });
  socket.on('connect_error', function() { updateLobbyStatus('Server unreachable. Run: node server.js', false); });
  socket.on('room:joined', function(data) {
    mpRoomCode=data.room; mpPlayers=data.players; mpSeatIndex=data.seat; mpIsHost=data.isHost;
    document.getElementById('lobby-code').textContent = data.room;
    renderLobbyPlayers();
    var sb=document.getElementById('lobby-start-btn'); if(sb) sb.disabled=!(data.isHost&&data.players.length>=2);
    updateLobbyStatus('Room '+data.room+' — share the code!', true);
  });
  socket.on('room:players', function(data) {
    mpPlayers=data.players; renderLobbyPlayers();
    var sb=document.getElementById('lobby-start-btn'); if(sb) sb.disabled=!(mpIsHost&&data.players.length>=2);
    updateLobbyStatus(data.players.length+'/'+mpCount+' players joined', true);
  });
  socket.on('room:error', function(data) { showToast('Room error: '+data.msg, 3000); });
  socket.on('game:start', function(state) {
    mpGameActive=true; mpDrawnThisTurn=false;
    showScreen('screen-game');
    var dp=document.getElementById('diff-pill'); if(dp) dp.textContent='ONLINE';
    numPlayers=state.players.length; cpuCount=numPlayers-1; bots=[];
    state.players.forEach(function(p,i){ if(i===mpSeatIndex) return; var ri=bots.length; bots.push({name:p.name,icon:p.icon||BOT_ICONS[ri%3],hand:Array(p.cardCount).fill({color:'back',value:''}),seatIndex:i}); });
    buildGameWorld(); buildCircularLayout(); applyServerState(state);
  });
  socket.on('game:state', function(state) { applyServerState(state); });
  socket.on('game:choose_color', function() { SFX.wild(); document.getElementById('color-modal').classList.add('open'); });
  socket.on('game:drew_playable', function() { mpDrawnThisTurn=true; showToast('Drew a playable card — play it or pass!', 2500); renderPlayerHand(); updateHUD(); });
  socket.on('game:end', function(data) { mpGameActive=false; mpDrawnThisTurn=false; endRound(data.winnerSeat===mpSeatIndex?0:1); });
  socket.on('game:toast', function(data) { showToast(data.msg, data.dur||2000); });
}
function applyServerState(state) {
  playerHand=(state.hand||[]).map(function(c){ return Object.assign({},c); });
  currentColor=state.currentColor; currentValue=state.currentValue; direction=state.direction;
  var myTurnSeat=state.turnSeat;
  if(myTurnSeat===mpSeatIndex){ turnIndex=0; }
  else {
    var bi=0;
    for(var i=0;i<state.players.length;i++){ if(i===mpSeatIndex) continue; if(i===myTurnSeat){turnIndex=bi+1;break;} bi++; }
  }
  var bi2=0;
  state.players.forEach(function(p,i){ if(i===mpSeatIndex) return; if(bots[bi2]){bots[bi2].hand=Array(p.cardCount).fill({color:'back',value:''});bots[bi2].name=p.name;} bi2++; });
  discardPile=[state.discardTop]; deck=Array(state.deckCount).fill(null);
  if(turnIndex===0&&!mpDrawnThisTurn) drawnCard=null;
  renderAllHands(); renderDiscard(); updateHUD(); updateGem(); updateDir(); updateDeckCount(); thinkOff();
  if(turnIndex!==0) thinkOn();
}
function mpPlayCard(card) { if(socket){mpDrawnThisTurn=false;drawnCard=null;socket.emit('game:play',{card:card,room:mpRoomCode});} }
function mpDrawCard()     { if(socket&&!mpDrawnThisTurn) socket.emit('game:draw',{room:mpRoomCode}); }
function mpChooseColor(c) { if(socket) socket.emit('game:color',{color:c,room:mpRoomCode}); }
function mpCallUno()      { if(socket) socket.emit('game:uno',{room:mpRoomCode}); }
function mpPass()         { if(socket){mpDrawnThisTurn=false;drawnCard=null;socket.emit('game:pass',{room:mpRoomCode});} }
function updateLobbyStatus(msg, ok) {
  var el=document.getElementById('lobby-status-txt'); if(el) el.textContent=msg;
  var dot=document.querySelector('.lstat-dot'); if(dot) dot.style.background=ok?'#00c853':'#ff1744';
}
function renderLobbyPlayers() {
  var wrap=document.getElementById('lobby-players'); if(!wrap) return;
  wrap.innerHTML='';
  var total=Math.max(mpPlayers.length,mpCount);
  for(var i=0;i<total;i++){
    var p=mpPlayers[i], row=document.createElement('div');
    row.className='lobby-player-row';
    if(p){ var isMe=p.id===mpMyId; row.innerHTML='<div class="lpr-avatar '+(isMe?'lpr-you':'lpr-empty')+'">'+(p.icon||'🎮')+'</div><div class="lpr-name">'+p.name+(isMe?' (You)':'')+'</div><div class="lpr-status lpr-s-ready">JOINED</div>'; }
    else { row.innerHTML='<div class="lpr-avatar lpr-empty">⏳</div><div class="lpr-name" style="color:rgba(255,255,255,.3)">Waiting for player '+(i+1)+'…</div><div class="lpr-status lpr-s-waiting">EMPTY</div>'; }
    wrap.appendChild(row);
  }
}
function showMultiLobby() {
  SFX.click(); showScreen('screen-lobby');
  document.getElementById('lobby-sub').textContent=mpCount+'-player room';
  document.getElementById('lobby-code').textContent='------';
  document.getElementById('lobby-start-btn').disabled=true;
  mpPlayers=[]; renderLobbyPlayers(); updateLobbyStatus('Connecting to server…',false); connectSocket();
}
function createRoom() {
  if(!socket||!socket.connected){showToast('Not connected yet…',2000);return;}
  var name=prompt('Your name:','Player')||'Player';
  socket.emit('room:create',{name:name,maxPlayers:mpCount,icon:'😎'});
}
function joinRoom() {
  if(!socket||!socket.connected){showToast('Not connected yet…',2000);return;}
  var code=prompt('Room code:','')||''; if(!code.trim()) return;
  var name=prompt('Your name:','Player')||'Player';
  socket.emit('room:join',{room:code.trim().toUpperCase(),name:name,icon:'😎'});
}
function copyRoomCode() {
  SFX.click();
  if(navigator.clipboard&&mpRoomCode) navigator.clipboard.writeText(mpRoomCode);
  showToast('Room code copied! 📋');
}
function startMultiGame() { if(!socket||!mpIsHost) return; socket.emit('game:begin',{room:mpRoomCode}); }

/* ══  LOADING  ══════════════════════════════════════════════ */
function runLoader() {
  showScreen('screen-loading');
  var fill=document.getElementById('load-fill'), pct=document.getElementById('load-pct'), p=0;
  var iv=setInterval(function(){
    p+=Math.random()*14+4; if(p>=100){p=100;clearInterval(iv);}
    if(fill) fill.style.width=p+'%'; if(pct) pct.textContent=Math.round(p)+'%';
    if(p>=100) setTimeout(function(){loadCfg();showHome();},400);
  },110);
}

/* ══  QUIT  ═════════════════════════════════════════════════ */
function confirmQuit() { SFX.click(); document.getElementById('quit-modal').classList.add('open'); }
function closeQuit()   { SFX.click(); document.getElementById('quit-modal').classList.remove('open'); }
function quitToHome() {
  SFX.click(); clearAllTimers();
  document.getElementById('quit-modal').classList.remove('open');
  document.getElementById('win-overlay').classList.remove('show');
  document.getElementById('color-modal').classList.remove('open');
  document.getElementById('settings-modal').classList.remove('open');
  if(particleInterval) clearInterval(particleInterval);
  if(fireflyInterval)  clearInterval(fireflyInterval);
  if(socket&&mpGameActive){socket.emit('game:quit',{room:mpRoomCode});mpGameActive=false;}
  mpDrawnThisTurn=false; drawnCard=null; showHome();
}

/* ══  GAME CONSTANTS  ═══════════════════════════════════════ */
var COLORS=['red','blue','green','yellow'];
var VALUES=['0','1','2','3','4','5','6','7','8','9','skip','reverse','draw2'];
var WILDS=['wild','wild4'];
var BOT_ICONS=['🤖','👾','🦊'];
var BOT_NAMES=['Robo','Pixel','Foxy'];

/* ══  GAME STATE  ═══════════════════════════════════════════ */
var gameMode='cpu', deck=[], playerHand=[], bots=[], discardPile=[];
var currentColor='', currentValue='', turnIndex=0, numPlayers=0, direction=1;
var pendingWild=false, calledUno=false, drawnCard=null, scorePlayer=0, scoreCpu=0;
var cpuTimers=[], toastTimer=null, turnDotEl=null, currentAngle=270;

function clearAllTimers(){ cpuTimers.forEach(function(t){clearTimeout(t);}); cpuTimers=[]; }

/* ══  DECK  ═════════════════════════════════════════════════ */
function buildDeck() {
  var d=[];
  COLORS.forEach(function(c){ VALUES.forEach(function(v){ d.push({color:c,value:v}); if(v!=='0') d.push({color:c,value:v}); }); });
  WILDS.forEach(function(v){ for(var i=0;i<4;i++) d.push({color:'wild',value:v}); });
  return d;
}
function shuffle(a){ for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;} return a; }
function deal(){ if(!deck.length) reshuffleDiscard(); return deck.pop(); }
function reshuffleDiscard(){ var top=discardPile.pop(); deck=shuffle(discardPile.slice()); discardPile=[top]; showToast('Deck reshuffled 🔀'); }

/* ══  INIT  ═════════════════════════════════════════════════ */
function initGame() {
  clearAllTimers();
  deck=shuffle(buildDeck()); playerHand=[]; discardPile=[]; turnIndex=0; direction=1;
  pendingWild=false; calledUno=false; drawnCard=null; numPlayers=1+cpuCount; currentAngle=270;
  bots=[];
  for(var i=0;i<cpuCount;i++) bots.push({name:BOT_NAMES[i],icon:BOT_ICONS[i],hand:[]});
  for(var j=0;j<7;j++){ playerHand.push(deal()); bots.forEach(function(b){b.hand.push(deal());}); }
  var starter; do{starter=deal();}while(starter.color==='wild');
  discardPile.push(starter); currentColor=starter.color; currentValue=starter.value;
  buildCircularLayout();
  document.getElementById('win-overlay').classList.remove('show');
  document.getElementById('confetti-wrap').innerHTML='';
  thinkOff();
  renderAllHands(); renderDiscard(); updateHUD(); updateGem(); updateDir(); updateDeckCount();
}

/* ══  CIRCULAR LAYOUT  ══════════════════════════════════════ */
function buildCircularLayout() {
  var wrap=document.getElementById('opponents-wrap'); if(!wrap) return;
  wrap.innerHTML=''; turnDotEl=null;
  bots.forEach(function(bot,i){
    var slot=document.createElement('div');
    var posClass=getBotPositionClass(i,cpuCount);
    slot.className='player-slot '+posClass; slot.id='bot-slot-'+i;
    var handClass=getHandClass(i,cpuCount);
    var isTop=posClass.indexOf('top')!==-1;
    if(isTop){
      slot.innerHTML='<div class="slot-avatar av-bot'+i+'" id="bot-bubble-'+i+'">'+bot.icon+'</div><div class="slot-name">'+bot.name+'</div><div class="slot-cnt" id="bot-cnt-'+i+'">7</div><div class="slot-hand '+handClass+'" id="bot-hand-'+i+'"></div>';
    } else {
      slot.innerHTML='<div class="slot-hand '+handClass+'" id="bot-hand-'+i+'"></div><div class="slot-avatar av-bot'+i+'" id="bot-bubble-'+i+'">'+bot.icon+'</div><div class="slot-name">'+bot.name+'</div><div class="slot-cnt" id="bot-cnt-'+i+'">7</div>';
    }
    wrap.appendChild(slot);
    bot.el={hand:document.getElementById('bot-hand-'+i),cnt:document.getElementById('bot-cnt-'+i),bubble:document.getElementById('bot-bubble-'+i)};
  });
  var dot=document.createElement('div'); dot.id='turn-dot';
  dot.setAttribute('data-label','YOUR TURN');
  var arena=document.getElementById('circular-arena');
  if(arena){
    // Inject the faint orbit trail ellipse sized to match the dot's orbit
    var oldTrail=document.getElementById('orbit-trail');
    if(oldTrail) oldTrail.parentNode.removeChild(oldTrail);
    var trail=document.createElement('div');
    trail.id='orbit-trail';
    // Size it to match the orbit radii used in placeTurnDot
    var W=arena.offsetWidth||400, H=arena.offsetHeight||320;
    var rx=W*0.48, ry=H*0.47;
    trail.style.cssText='width:'+(rx*2)+'px;height:'+(ry*2)+'px;';
    arena.appendChild(trail);
    arena.appendChild(dot);
  }
  turnDotEl=dot; placeTurnDot(270,false);
}
function getBotPositionClass(idx,total){
  if(total===1) return 'bot-top-center';
  if(total===2) return idx===0?'bot-top-left':'bot-top-right';
  if(total===3) return ['bot-top-center','bot-mid-left','bot-mid-right'][idx];
  return 'bot-top-center';
}
function getHandClass(idx,total){
  if(total===3){ if(idx===1) return 'slot-hand-left'; if(idx===2) return 'slot-hand-right'; }
  return '';
}

/* ══  TURN DOT — smooth CSS-transition orbital ══════════════ */
function getTurnAngle(ti){
  var a={0:270};
  if(numPlayers===2){a[1]=90;}
  else if(numPlayers===3){a[1]=45;a[2]=135;}
  else if(numPlayers===4){a[1]=90;a[2]=180;a[3]=0;}
  return a[ti]!==undefined?a[ti]:270;
}

function placeTurnDot(angleDeg, animate){
  if(!turnDotEl) return;
  var arena=document.getElementById('circular-arena'); if(!arena) return;
  var W=arena.offsetWidth||400, H=arena.offsetHeight||320;
  // Use a slightly larger orbit so the dot clearly orbits outside the table
  var rx=W*0.48, ry=H*0.47;
  var rad=(angleDeg-90)*Math.PI/180;
  var cx=W/2+rx*Math.cos(rad);
  var cy=H/2+ry*Math.sin(rad);

  if(animate){
    turnDotEl.style.transition='left 0.7s cubic-bezier(0.4,0,0.2,1), top 0.7s cubic-bezier(0.4,0,0.2,1)';
  } else {
    turnDotEl.style.transition='none';
  }
  turnDotEl.style.left=cx+'px';
  turnDotEl.style.top=cy+'px';
  turnDotEl.textContent=direction===1?'▶':'◀';
}

var dotAnimFrame=null;
function animateTurnDot(){
  if(!turnDotEl) return;
  var target=getTurnAngle(turnIndex);
  var diff=target-currentAngle;

  // Choose shortest arc in the direction of play
  if(direction===1){ if(diff<0) diff+=360; }
  else             { if(diff>0) diff-=360; }

  // If tiny move, snap immediately
  if(Math.abs(diff)<2){ currentAngle=target; placeTurnDot(target,false); return; }

  // Animate with rAF for buttery smooth arc travel
  var start=currentAngle;
  var startTime=null;
  var dur=Math.min(700, Math.max(400, Math.abs(diff)*2.2)); // duration scales with arc length

  // Cancel any in-progress animation
  if(dotAnimFrame) cancelAnimationFrame(dotAnimFrame);

  function step(ts){
    if(!startTime) startTime=ts;
    var t=Math.min(1,(ts-startTime)/dur);
    // Ease in-out cubic
    var e=t<0.5?4*t*t*t:(t-1)*(2*t-2)*(2*t-2)+1;
    var angle=start+diff*e;
    placeTurnDot(((angle%360)+360)%360, false);
    if(t<1){ dotAnimFrame=requestAnimationFrame(step); }
    else   { currentAngle=((target%360)+360)%360; dotAnimFrame=null; }
  }
  dotAnimFrame=requestAnimationFrame(step);
}

/* ══  CARD LABEL  ═══════════════════════════════════════════ */
function lbl(v){ var m={skip:'⊘',reverse:'↺',draw2:'+2',wild:'★',wild4:'+4'}; return m[v]!==undefined?m[v]:v; }

/* ══  MAKE CARD  ════════════════════════════════════════════ */
function makeCard(card,interactive,idx){
  interactive=interactive||false; idx=idx!==undefined?idx:-1;
  var el=document.createElement('div'), l=lbl(card.value);
  el.className='card '+(card.color==='wild'?'wild':card.color);
  el.innerHTML='<div class="oval"></div><span class="ctL">'+l+'</span><span class="cMid">'+l+'</span><span class="ctR">'+l+'</span>';
  if(interactive){
    el.classList.add('p-card'); el.style.animationDelay=(idx*0.036)+'s';
    var myTurn=isMyTurn(), playable=canPlay(card)&&myTurn;
    var isDrawnCard=(gameMode==='mp')?(mpDrawnThisTurn&&playerHand.indexOf(card)===playerHand.length-1):(drawnCard&&card===drawnCard);
    var hasDrawn=(gameMode==='mp')?mpDrawnThisTurn:!!drawnCard;
    var allowPlay=playable&&(!hasDrawn||isDrawnCard);
    if(allowPlay){ el.classList.add('can-play'); (function(i,elem){elem.addEventListener('click',function(){onPlayCard(i,elem);});})(idx,el); }
    else el.classList.add('no-play');
  }
  return el;
}
function makeBack(index){
  var el=document.createElement('div'); el.className='card back cpu-c';
  var r=((index*7+3)%10-5).toFixed(1);
  el.style.setProperty('--r',r+'deg'); el.style.transform='rotate('+r+'deg)';
  el.style.animationDelay=(index*0.034)+'s';
  el.innerHTML='<div class="oval"></div><span class="btxt">UNO</span>';
  return el;
}

/* ══  RENDER  ═══════════════════════════════════════════════ */
function renderAllHands(){ renderPlayerHand(); bots.forEach(function(_,i){renderBotHand(i);}); }
function renderPlayerHand(){ var c=document.getElementById('player-hand'); if(!c) return; c.innerHTML=''; playerHand.forEach(function(card,i){c.appendChild(makeCard(card,true,i));}); }
function renderBotHand(i){
  var bot=bots[i]; if(!bot||!bot.el||!bot.el.hand) return;
  bot.el.hand.innerHTML='';
  var isside=bot.el.hand.classList.contains('slot-hand-left')||bot.el.hand.classList.contains('slot-hand-right');
  var maxShow=isside?Math.min(bot.hand.length,5):Math.min(bot.hand.length,14);
  for(var j=0;j<maxShow;j++) bot.el.hand.appendChild(makeBack(j));
}
function renderDiscard(){
  var c=document.getElementById('discard-pile'); if(!c) return;
  c.innerHTML='';
  if(discardPile.length>=2){ var prev=discardPile[discardPile.length-2], pe=makeCard(prev); pe.classList.add('d-prev'); pe.style.transform='rotate('+((discardPile.length*17+3)%14-7).toFixed(1)+'deg)'; c.appendChild(pe); }
  var top=discardPile[discardPile.length-1], te=makeCard(top);
  te.classList.add('d-top'); var r2=((discardPile.length*13+7)%12-6).toFixed(1);
  te.style.setProperty('--drot','rotate('+r2+'deg)'); c.appendChild(te);
  var gmap={red:'#ff1744',blue:'#2979ff',green:'#00c853',yellow:'#ffd600'};
  var g=gmap[currentColor]||'rgba(255,255,255,.4)';
  c.style.setProperty('--disc-b',g); c.style.setProperty('--disc-g',g+'aa'); c.style.setProperty('--disc-g2',g+'33');
}
function updateHUD(){
  var pc=playerHand.length, tp=document.getElementById('turn-pill');
  if(tp){
    if(isMyTurn()){ var hd=(gameMode==='mp')?mpDrawnThisTurn:!!drawnCard; tp.textContent=hd?'PLAY OR PASS':'YOUR TURN'; tp.className='turn-you'; }
    else{ tp.textContent=(bots[turnIndex-1]?bots[turnIndex-1].name:'CPU')+"'s Turn"; tp.className='turn-cpu'; }
  }
  // Update turn dot label + arrow direction + color per whose turn
  if(turnDotEl){
    var dotLabel=isMyTurn()?'YOU':(bots[turnIndex-1]?bots[turnIndex-1].name:'CPU');
    turnDotEl.setAttribute('data-label', dotLabel);
    turnDotEl.textContent=direction===1?'▶':'◀';
    if(isMyTurn()){
      turnDotEl.style.background='radial-gradient(circle at 38% 32%, #a8ffbb, #00c853)';
      turnDotEl.style.boxShadow='0 0 0 3px rgba(0,200,80,.3),0 0 16px rgba(0,200,80,.9),0 0 40px rgba(0,200,80,.5),0 3px 8px rgba(0,0,0,.5)';
      turnDotEl.style.color='#003010';
    } else {
      turnDotEl.style.background='radial-gradient(circle at 38% 32%, #ff9090, #ff1744)';
      turnDotEl.style.boxShadow='0 0 0 3px rgba(255,23,68,.3),0 0 16px rgba(255,23,68,.9),0 0 40px rgba(255,23,68,.5),0 3px 8px rgba(0,0,0,.5)';
      turnDotEl.style.color='#fff';
    }
  }
  var pcEl=document.getElementById('player-count');
  if(pcEl){ pcEl.textContent=pc; pc===1?pcEl.classList.add('uno-pop'):pcEl.classList.remove('uno-pop'); }
  bots.forEach(function(bot,i){ if(bot.el&&bot.el.cnt){ var cc=bot.hand.length; bot.el.cnt.textContent=cc; cc===1?bot.el.cnt.classList.add('uno-pop'):bot.el.cnt.classList.remove('uno-pop'); } });
  var sp=document.getElementById('score-p'); if(sp) sp.textContent=scorePlayer;
  var sc=document.getElementById('score-c'); if(sc) sc.textContent=scoreCpu;
  var ub=document.getElementById('uno-btn'); if(ub) ub.disabled=!(pc===2&&isMyTurn());
  var ah=document.getElementById('action-hint'), pb=document.getElementById('pass-btn');
  var hasDrawn=(gameMode==='mp')?mpDrawnThisTurn:!!drawnCard;
  if(isMyTurn()){
    if(hasDrawn){ var cpd=(gameMode==='mp')?(playerHand.length>0&&canPlay(playerHand[playerHand.length-1])):(drawnCard&&canPlay(drawnCard)); if(ah) ah.textContent=cpd?'Play drawn card or pass':'No match — pass'; if(pb){pb.style.display='inline-flex';pb.disabled=false;} }
    else{ if(ah) ah.textContent='Pick a card or draw'; if(pb) pb.style.display='none'; }
  } else { if(ah) ah.textContent='Waiting…'; if(pb) pb.style.display='none'; }
  var pzone=document.getElementById('player-zone');
  if(pzone){ pzone.classList.toggle('my-turn',isMyTurn()); pzone.classList.toggle('not-my-turn',!isMyTurn()); }
  bots.forEach(function(bot,i){ var slot=document.getElementById('bot-slot-'+i); if(slot) slot.classList.toggle('active-bot',turnIndex===i+1); });
  updateAvatarGlows(); animateTurnDot();
}
function updateGem(){ var el=document.getElementById('color-gem'),nl=document.getElementById('color-name'),m={red:'gem-red',blue:'gem-blue',green:'gem-green',yellow:'gem-yellow',wild:'gem-wild'}; if(el) el.className=m[currentColor]||'gem-wild'; if(nl) nl.textContent=currentColor.toUpperCase(); }
function updateDir(){ var el=document.getElementById('dir-wheel'); if(el) el.textContent=direction===1?'↺':'↻'; if(turnDotEl) turnDotEl.textContent=direction===1?'▶':'◀'; }
function updateDeckCount(){ var el=document.getElementById('deck-count'); if(el) el.textContent=deck.length; }
function updateAvatarGlows(){
  var yb=document.getElementById('you-bubble'); if(yb) isMyTurn()?yb.classList.add('active-turn'):yb.classList.remove('active-turn');
  bots.forEach(function(bot,i){ if(bot.el&&bot.el.bubble) turnIndex===i+1?bot.el.bubble.classList.add('active-turn'):bot.el.bubble.classList.remove('active-turn'); });
}
function thinkOn(){
  var e=document.getElementById('think-dots'); if(e) e.classList.add('on');
  // Show whose turn it is clearly
  if(turnDotEl && bots[turnIndex-1]){
    showTurnBanner(bots[turnIndex-1].name+"'s Turn", false);
  }
}
function thinkOff(){
  var e=document.getElementById('think-dots'); if(e) e.classList.remove('on');
  // Flash YOUR TURN when control returns to player
  if(isMyTurn()) showTurnBanner('YOUR TURN', true);
}

var turnBannerTimer=null;
function showTurnBanner(text, isPlayer){
  // Reuse toast but style it differently for turn announcements
  var el=document.getElementById('toast'); if(!el) return;
  el.textContent=(isPlayer?'🟢 ':'🔴 ')+text;
  el.style.background=isPlayer?'rgba(0,100,30,.95)':'rgba(100,10,10,.95)';
  el.style.borderColor=isPlayer?'rgba(0,200,80,.4)':'rgba(255,50,50,.4)';
  el.style.color=isPlayer?'#a8ffbb':'#ffaaaa';
  el.classList.add('on');
  clearTimeout(turnBannerTimer);
  turnBannerTimer=setTimeout(function(){
    el.classList.remove('on');
    // Reset toast style
    el.style.background=''; el.style.borderColor=''; el.style.color='';
  }, 1400);
}

/* ══  HELPERS  ══════════════════════════════════════════════ */
function isMyTurn(){ return turnIndex===0; }
function curBot(){ return bots[turnIndex-1]; }
function nextTurn(){ turnIndex=((turnIndex+direction)+numPlayers)%numPlayers; }
function skipNext(){ turnIndex=((turnIndex+direction*2)+numPlayers)%numPlayers; }
function canPlay(card){ if(!card) return false; if(card.color==='wild') return true; return card.color===currentColor||card.value===currentValue; }

/* ══  PLAYER ACTIONS  ═══════════════════════════════════════ */
function onPlayCard(idx,el){
  if(!isMyTurn()) return;
  var card=playerHand[idx]; if(!canPlay(card)) return;
  var hasDrawn=(gameMode==='mp')?mpDrawnThisTurn:!!drawnCard;
  if(hasDrawn){
    var isLast=(idx===playerHand.length-1), isDrawnRef=(gameMode==='cpu')&&(card===drawnCard);
    if(gameMode==='mp'&&!isLast) return;
    if(gameMode==='cpu'&&!isDrawnRef) return;
  }
  if(gameMode==='mp'){mpPlayCard(card);return;}
  SFX.play(); vibe(20); flashPlay(card.color); el.classList.add('playing');
  setTimeout(function(){
    playerHand.splice(idx,1); discardPile.push(card); currentValue=card.value; calledUno=false; drawnCard=null;
    renderDiscard(); updateHUD(); updateDeckCount();
    if(!playerHand.length){renderPlayerHand();endRound(0);return;}
    if(card.color==='wild'){SFX.wild();pendingWild=card.value;renderPlayerHand();setTimeout(function(){document.getElementById('color-modal').classList.add('open');},90);return;}
    currentColor=card.color; updateGem(); applyEffect(card.value,'player');
  },270);
}
function onDraw(){
  if(!isMyTurn()) return;
  if(gameMode==='mp'){if(mpDrawnThisTurn) return; mpDrawCard(); return;}
  if(drawnCard) return;
  SFX.draw(); vibe(15);
  var card=deal(); playerHand.push(card); drawnCard=card; updateDeckCount();
  if(canPlay(card)){showToast('Tap to play drawn card, or PASS ✋',2500);renderPlayerHand();updateHUD();}
  else{showToast("No match — auto passing…",1600);renderPlayerHand();updateHUD();var t=setTimeout(function(){drawnCard=null;nextTurn();if(isMyTurn()){thinkOff();renderPlayerHand();updateHUD();}else{thinkOn();updateHUD();scheduleBots();}},1400);cpuTimers.push(t);}
}
function passTurn(){
  if(!isMyTurn()) return;
  if(gameMode==='mp'){if(!mpDrawnThisTurn) return; mpPass(); return;}
  if(!drawnCard) return;
  SFX.click(); drawnCard=null; nextTurn();
  if(isMyTurn()){thinkOff();renderPlayerHand();updateHUD();}else{thinkOn();updateHUD();scheduleBots();}
}
function callUno(){
  if(playerHand.length!==2||!isMyTurn()) return;
  calledUno=true; SFX.uno(); vibe([50,30,50]);
  if(gameMode==='mp') mpCallUno();
  document.getElementById('uno-btn').disabled=true;
  showToast('UNO! 🔥',2200);
}
function chooseColor(color){
  SFX.click(); document.getElementById('color-modal').classList.remove('open');
  currentColor=color; updateGem(); renderDiscard();
  if(gameMode==='mp'){mpChooseColor(color);return;}
  var was4=(pendingWild==='wild4'); pendingWild=false;
  if(was4){
    SFX.draw4(); vibe([30,20,30,20,30]);
    var nextIdx=((turnIndex+direction)+numPlayers)%numPlayers;
    var tname=nextIdx===0?'You':(bots[nextIdx-1]?bots[nextIdx-1].name:'CPU');
    drawPenalty(nextIdx,4,tname+' draws 4 & is skipped! 😈'); skipNext();
    thinkOff(); updateHUD(); renderPlayerHand();
  } else { nextTurn(); thinkOn(); updateHUD(); scheduleBots(); }
}
function drawPenalty(seatIdx,n,msg){
  if(seatIdx===0){for(var i=0;i<n;i++) playerHand.push(deal());showToast(msg);renderPlayerHand();updateHUD();updateDeckCount();}
  else{var bot=bots[seatIdx-1];if(!bot)return;for(var j=0;j<n;j++) bot.hand.push(deal());showToast(msg);renderBotHand(seatIdx-1);updateHUD();updateDeckCount();}
}

/* ══  APPLY EFFECT  ═════════════════════════════════════════ */
function applyEffect(value,who){
  var isTwoPlayer=(numPlayers===2);
  if(value==='skip'){
    SFX.skip(); var ni=((turnIndex+direction)+numPlayers)%numPlayers, nn=ni===0?'You':(bots[ni-1]?bots[ni-1].name:'Someone'); showToast(nn+' skipped! ⊘');
    if(isTwoPlayer){if(who==='player'){thinkOff();renderPlayerHand();updateHUD();}else{thinkOn();updateHUD();scheduleBots();}}
    else{skipNext();if(isMyTurn()){thinkOff();renderPlayerHand();updateHUD();}else{thinkOn();updateHUD();scheduleBots();}}
  } else if(value==='reverse'){
    SFX.reverse(); direction*=-1; updateDir(); showToast(direction===1?'Direction: Clockwise ↺':'Direction: Counter-CW ↻');
    if(isTwoPlayer){if(who==='player'){thinkOff();renderPlayerHand();updateHUD();}else{thinkOn();updateHUD();scheduleBots();}}
    else{nextTurn();if(isMyTurn()){thinkOff();renderPlayerHand();updateHUD();}else{thinkOn();updateHUD();scheduleBots();}}
  } else if(value==='draw2'){
    SFX.draw2(); var tgt=((turnIndex+direction)+numPlayers)%numPlayers, tn=tgt===0?'You':(bots[tgt-1]?bots[tgt-1].name:'CPU');
    var msg=tgt===0?'You draw 2 & are skipped! 😖':tn+' draws 2 & skipped! 🃏'; drawPenalty(tgt,2,msg);
    if(isTwoPlayer){if(who==='player'){thinkOff();renderPlayerHand();updateHUD();}else{thinkOn();updateHUD();scheduleBots();}}
    else{skipNext();if(isMyTurn()){thinkOff();renderPlayerHand();updateHUD();}else{thinkOn();updateHUD();scheduleBots();}}
  } else {
    nextTurn();
    if(isMyTurn()){thinkOff();renderPlayerHand();updateHUD();}else{thinkOn();updateHUD();scheduleBots();}
  }
}

/* ══  BOT AI  ═══════════════════════════════════════════════ */
function scheduleBots(){
  if(isMyTurn()) return; clearAllTimers();
  // Slower delays so players can clearly see whose turn it is
  var delay=difficulty==='hard'?1600+Math.random()*600
           :difficulty==='easy'?3000+Math.random()*1200
           :                    2200+Math.random()*800;
  cpuTimers.push(setTimeout(runBot,delay));
}
function runBot(){
  if(isMyTurn()) return; var bot=curBot(); if(!bot) return;
  var playable=bot.hand.filter(canPlay);
  if(!playable.length){
    SFX.draw(); var drawn=deal(); bot.hand.push(drawn); showToast(bot.name+' draws a card');
    renderBotHand(turnIndex-1); updateHUD(); updateDeckCount();
    if(canPlay(drawn)){ cpuTimers.push(setTimeout(function(){runBotPlay(drawn);},750)); }
    else{ cpuTimers.push(setTimeout(function(){nextTurn();if(isMyTurn()){thinkOff();renderPlayerHand();updateHUD();}else{thinkOn();updateHUD();scheduleBots();}},1400)); }
    return;
  }
  function pri(c){ if(c.value==='wild4') return difficulty==='hard'?8:6; if(c.value==='draw2') return 5; if(c.value==='skip') return 4; if(c.value==='reverse') return 3; if(c.color==='wild') return 2; if(c.color===currentColor) return 1; return 0; }
  var chosen=difficulty==='easy'?playable[Math.floor(Math.random()*playable.length)]:(playable.sort(function(a,b){return pri(b)-pri(a);}),playable[0]);
  runBotPlay(chosen);
}
function runBotPlay(card){
  var bot=curBot(); if(!bot) return; var idx=bot.hand.indexOf(card); if(idx===-1) return;
  SFX.play(); flashPlay(card.color); bot.hand.splice(idx,1); discardPile.push(card); currentValue=card.value;
  thinkOff(); renderBotHand(turnIndex-1); renderDiscard(); updateHUD(); updateDeckCount();
  if(!bot.hand.length){endRound(turnIndex);return;}
  if(bot.hand.length===1){SFX.uno();showToast(bot.name+' says UNO! 🤖');}
  if(card.color==='wild'){
    SFX.wild(); var cnt={red:0,blue:0,green:0,yellow:0};
    bot.hand.forEach(function(c){if(cnt[c.color]!==undefined) cnt[c.color]++;});
    currentColor=Object.entries(cnt).sort(function(a,b){return b[1]-a[1];})[0][0];
    updateGem(); renderDiscard();
    if(card.value==='wild4'){
      SFX.draw4(); var tgt=((turnIndex+direction)+numPlayers)%numPlayers;
      var tn=tgt===0?'You':(bots[tgt-1]?bots[tgt-1].name:'CPU');
      var msg2=tgt===0?bot.name+' plays +4 → '+currentColor.toUpperCase()+'! You draw 4 & skipped! 😱':bot.name+' plays +4! '+tn+' draws 4 & skipped! 😱';
      if(tgt===0) vibe([50,30,50,30,50]);
      drawPenalty(tgt,4,msg2); skipNext();
      if(isMyTurn()){thinkOff();renderPlayerHand();updateHUD();}else{thinkOn();updateHUD();scheduleBots();}
      return;
    }
    nextTurn();
    if(isMyTurn()){thinkOff();renderPlayerHand();updateHUD();}else{thinkOn();updateHUD();scheduleBots();}
    return;
  }
  currentColor=card.color; updateGem(); renderDiscard(); applyEffect(card.value,'bot');
}

/* ══  END ROUND  ════════════════════════════════════════════ */
function endRound(winnerSeat){
  clearAllTimers();
  var isPlayer=(winnerSeat===0);
  if(isPlayer){
    scorePlayer++; SFX.win(); vibe([60,30,60,30,100]);
    document.getElementById('win-emoji').textContent='🎉';
    document.getElementById('win-title').textContent='YOU WIN!';
    document.getElementById('win-title').style.color='#44dc80';
    document.getElementById('win-sub').textContent='You ran out of cards first!';
    spawnConfetti();
  } else {
    scoreCpu++; var bot=bots[winnerSeat-1]; SFX.lose(); vibe(200);
    document.getElementById('win-emoji').textContent=bot?bot.icon:'🤖';
    document.getElementById('win-title').textContent=(bot?bot.name:'CPU')+' WINS!';
    document.getElementById('win-title').style.color='#ff7070';
    document.getElementById('win-sub').textContent='Better luck next time!';
  }
  var row=document.getElementById('win-score-row');
  if(row){ var html='<div class="wscore"><div class="wlbl">YOU</div><div class="wval">'+scorePlayer+'</div></div>'; bots.forEach(function(b){html+='<div class="wscore"><div class="wlbl">'+b.name+'</div><div class="wval">'+scoreCpu+'</div></div>';}); row.innerHTML=html; }
  document.getElementById('score-p').textContent=scorePlayer;
  document.getElementById('score-c').textContent=scoreCpu;
  setTimeout(function(){document.getElementById('win-overlay').classList.add('show');},520);
}

/* ══  CONFETTI  ═════════════════════════════════════════════ */
function spawnConfetti(){
  var wrap=document.getElementById('confetti-wrap'); if(!wrap) return;
  wrap.innerHTML='';
  var pal=['#ff1744','#2979ff','#00c853','#ffd600','#ff6d00','#d500f9','#fff','#00e5ff'];
  for(var i=0;i<120;i++){
    var el=document.createElement('div'); el.className='conf';
    el.style.cssText='left:'+Math.random()*100+'%;background:'+pal[i%pal.length]+';width:'+(4+Math.random()*10)+'px;height:'+(4+Math.random()*12)+'px;border-radius:'+(Math.random()>.4?'50%':'2px')+';animation-name:conf-fall;animation-delay:'+Math.random()*1.4+'s;animation-duration:'+(1.4+Math.random()*1.2)+'s;';
    wrap.appendChild(el);
  }
}

/* ══  TOAST  ════════════════════════════════════════════════ */
function showToast(msg,dur){
  dur=dur||1700; var el=document.getElementById('toast'); if(!el) return;
  el.textContent=msg; el.classList.add('on'); clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){el.classList.remove('on');},dur);
}

/* ══  BOOT  ═════════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded',function(){
  runLoader();
  var sm=document.getElementById('settings-modal');
  if(sm) sm.addEventListener('click',function(e){if(e.target===this) closeSettings();});
});