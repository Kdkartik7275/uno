/* ═══════════════════════════════════════════════════════════
   UNO — server.js  |  Multiplayer Backend
   Run: node server/server.js
   ═══════════════════════════════════════════════════════════ */
const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const path    = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, '../client')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../client/index.html')));

// ══ GAME CONSTANTS ══════════════════════════════════════════
const COLORS  = ['red','blue','green','yellow'];
const VALUES  = ['0','1','2','3','4','5','6','7','8','9','skip','reverse','draw2'];
const WILDS   = ['wild','wild4'];

function buildDeck() {
  const d = [];
  COLORS.forEach(c => {
    VALUES.forEach(v => {
      d.push({ color: c, value: v });
      if (v !== '0') d.push({ color: c, value: v });
    });
  });
  WILDS.forEach(v => { for (let i = 0; i < 4; i++) d.push({ color: 'wild', value: v }); });
  return d;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ══ ROOM STORE ═══════════════════════════════════════════════
// rooms[code] = { players:[], maxPlayers, started, game:{} }
const rooms = {};

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

// ══ GAME LOGIC ════════════════════════════════════════════════
function canPlay(card, color, value) {
  if (card.color === 'wild') return true;
  return card.color === color || card.value === value;
}

function startGame(code) {
  const room = rooms[code];
  if (!room || room.players.length < 2) return;
  room.started = true;

  let deck = shuffle(buildDeck());
  const hands = room.players.map(() => []);
  for (let i = 0; i < 7; i++) {
    room.players.forEach((_, pi) => hands[pi].push(deck.pop()));
  }

  let starter;
  do { starter = deck.pop(); } while (starter.color === 'wild');

  room.game = {
    deck,
    discard: [starter],
    hands,
    currentColor: starter.color,
    currentValue: starter.value,
    direction: 1,
    turnSeat: 0,
    drawStack: 0, // for stacking draw2/draw4 (optional extension)
    drawnThisTurn: false, // has the current player drawn this turn?
  };

  broadcastGameState(code);
}

function getPublicState(code, forSeat) {
  const room = rooms[code];
  if (!room || !room.game) return null;
  const g = room.game;

  return {
    hand: g.hands[forSeat],
    discardTop: g.discard[g.discard.length - 1],
    deckCount: g.deck.length,
    currentColor: g.currentColor,
    currentValue: g.currentValue,
    direction: g.direction,
    turnSeat: g.turnSeat,
    drawnThisTurn: g.drawnThisTurn,
    players: room.players.map((p, i) => ({
      name: p.name,
      icon: p.icon,
      cardCount: g.hands[i].length,
      seat: i,
    })),
  };
}

function broadcastGameState(code) {
  const room = rooms[code];
  if (!room) return;
  room.players.forEach((p, seat) => {
    if (!p.id) return;
    const state = getPublicState(code, seat);
    if (state) io.to(p.id).emit('game:state', state);
  });
}

function reshuffleIfNeeded(g) {
  if (g.deck.length < 4) {
    const top = g.discard.pop();
    g.deck = shuffle(g.discard);
    g.discard = [top];
  }
}

function nextTurn(g, numPlayers, steps) {
  steps = steps || 1;
  g.turnSeat = ((g.turnSeat + g.direction * steps) % numPlayers + numPlayers) % numPlayers;
  g.drawnThisTurn = false;
}

function applyCardEffect(code, playedCard, chosenColor) {
  const room = rooms[code];
  const g = room.game;
  const n = room.players.length;

  g.currentValue = playedCard.value;

  if (playedCard.color === 'wild') {
    g.currentColor = chosenColor || 'red';
  } else {
    g.currentColor = playedCard.color;
  }

  switch (playedCard.value) {
    case 'skip':
      nextTurn(g, n, 2);
      break;
    case 'reverse':
      g.direction *= -1;
      if (n === 2) nextTurn(g, n, 2); // In 2-player reverse acts like skip
      else nextTurn(g, n, 1);
      break;
    case 'draw2': {
      nextTurn(g, n, 1);
      const victim = g.turnSeat;
      reshuffleIfNeeded(g);
      for (let i = 0; i < 2; i++) g.hands[victim].push(g.deck.pop());
      const vName = room.players[victim]?.name || 'Someone';
      io.to(room.players[victim]?.id).emit('game:toast', { msg: 'You draw 2! ✌️', dur: 2500 });
      nextTurn(g, n, 1);
      break;
    }
    case 'wild':
      nextTurn(g, n, 1);
      break;
    case 'wild4': {
      nextTurn(g, n, 1);
      const victim4 = g.turnSeat;
      reshuffleIfNeeded(g);
      for (let i = 0; i < 4; i++) g.hands[victim4].push(g.deck.pop());
      io.to(room.players[victim4]?.id).emit('game:toast', { msg: 'You draw 4! 😱', dur: 2500 });
      nextTurn(g, n, 1);
      break;
    }
    default:
      nextTurn(g, n, 1);
  }
}

// ══ SOCKET HANDLERS ══════════════════════════════════════════
io.on('connection', (socket) => {
  console.log('[+] Connected:', socket.id);

  // ── CREATE ROOM ──────────────────────────────────────────
  socket.on('room:create', ({ name, icon, maxPlayers }) => {
    let code;
    do { code = genCode(); } while (rooms[code]);

    rooms[code] = {
      code,
      maxPlayers: maxPlayers || 4,
      started: false,
      players: [],
      game: null,
    };

    const seat = 0;
    rooms[code].players.push({ id: socket.id, name: name || 'Player', icon: icon || '😎', seat });
    socket.join(code);
    socket._unoRoom = code;
    socket._unoSeat = seat;

    socket.emit('room:joined', { room: code, seat, isHost: true, players: rooms[code].players });
    io.to(code).emit('room:players', { players: rooms[code].players });
    console.log(`Room ${code} created by ${name}`);
  });

  // ── JOIN ROOM ────────────────────────────────────────────
  socket.on('room:join', ({ room: code, name, icon }) => {
    const room = rooms[code];
    if (!room) { socket.emit('room:error', { msg: 'Room not found' }); return; }
    if (room.started) { socket.emit('room:error', { msg: 'Game already started' }); return; }
    if (room.players.length >= room.maxPlayers) { socket.emit('room:error', { msg: 'Room is full' }); return; }

    const seat = room.players.length;
    room.players.push({ id: socket.id, name: name || 'Player', icon: icon || '🎮', seat });
    socket.join(code);
    socket._unoRoom = code;
    socket._unoSeat = seat;

    socket.emit('room:joined', { room: code, seat, isHost: false, players: room.players });
    io.to(code).emit('room:players', { players: room.players });
    console.log(`${name} joined ${code} as seat ${seat}`);
  });

  // ── START GAME ───────────────────────────────────────────
  socket.on('game:begin', ({ room: code }) => {
    const room = rooms[code];
    if (!room) return;
    if (room.players[0]?.id !== socket.id) { socket.emit('room:error', { msg: 'Only the host can start' }); return; }
    if (room.players.length < 2) { socket.emit('room:error', { msg: 'Need at least 2 players' }); return; }
    startGame(code);
    io.to(code).emit('game:started');
    console.log(`Game started in room ${code}`);
  });

  // ── PLAY CARD ────────────────────────────────────────────
  socket.on('game:play', ({ room: code, card, chosenColor }) => {
    const room = rooms[code];
    if (!room?.game) return;
    const g = room.game;
    const seat = socket._unoSeat;
    if (g.turnSeat !== seat) { socket.emit('game:toast', { msg: "Not your turn!", dur: 1500 }); return; }

    // Find card in hand
    const hand = g.hands[seat];
    const idx = hand.findIndex(c => c.color === card.color && c.value === card.value);
    if (idx === -1) { socket.emit('game:toast', { msg: "Card not in hand", dur: 1500 }); return; }

    if (!canPlay(card, g.currentColor, g.currentValue)) {
      socket.emit('game:toast', { msg: "Can't play that card!", dur: 1500 }); return;
    }

    // Validate drawn-card-only rule
    if (g.drawnThisTurn) {
      if (idx !== hand.length - 1) {
        socket.emit('game:toast', { msg: "You can only play the drawn card!", dur: 1500 }); return;
      }
    }

    // Play the card
    hand.splice(idx, 1);
    g.discard.push(card);
    g.drawnThisTurn = false;

    // Broadcast the played card to all players for animation
    io.to(code).emit('game:card_played', {
      seat,
      card,
      playerName: room.players[seat]?.name,
    });

    // Check win
    if (hand.length === 0) {
      broadcastGameState(code);
      io.to(code).emit('game:over', { winnerSeat: seat, winnerName: room.players[seat]?.name });
      room.started = false;
      return;
    }

    // UNO shout (server-side broadcast)
    if (hand.length === 1) {
      io.to(code).emit('game:toast', { msg: `${room.players[seat]?.name} says UNO! 🔥`, dur: 2500 });
    }

    // Wild — request color choice from client
    if (card.color === 'wild' && !chosenColor) {
      applyCardEffect(code, card, null);
      broadcastGameState(code);
      socket.emit('game:choose_color', { card });
      // Pause turn until color chosen
      g.awaitingColor = true;
      g.colorFromSeat = seat;
      // Temporarily revert turn — we'll finalize after color chosen
      // Actually, let's just re-broadcast after color is set
      return;
    }

    applyCardEffect(code, card, chosenColor);
    broadcastGameState(code);
  });

  // ── CHOOSE COLOR (after wild) ────────────────────────────
  socket.on('game:color', ({ room: code, color }) => {
    const room = rooms[code];
    if (!room?.game) return;
    const g = room.game;
    if (!g.awaitingColor || g.colorFromSeat !== socket._unoSeat) return;

    g.currentColor = color;
    g.awaitingColor = false;
    g.colorFromSeat = null;

    io.to(code).emit('game:toast', { msg: `Color changed to ${color.toUpperCase()}! 🎨`, dur: 2000 });
    broadcastGameState(code);
  });

  // ── DRAW CARD ────────────────────────────────────────────
  socket.on('game:draw', ({ room: code }) => {
    const room = rooms[code];
    if (!room?.game) return;
    const g = room.game;
    const seat = socket._unoSeat;
    if (g.turnSeat !== seat) return;
    if (g.drawnThisTurn) { socket.emit('game:toast', { msg: 'Already drew a card!', dur: 1500 }); return; }

    reshuffleIfNeeded(g);
    const card = g.deck.pop();
    g.hands[seat].push(card);
    g.drawnThisTurn = true;

    broadcastGameState(code);

    if (canPlay(card, g.currentColor, g.currentValue)) {
      socket.emit('game:drew_playable', { card });
    } else {
      // Auto-pass after a short delay — frontend will show message
      socket.emit('game:toast', { msg: 'No playable card — pass your turn', dur: 2000 });
    }
  });

  // ── PASS TURN ────────────────────────────────────────────
  socket.on('game:pass', ({ room: code }) => {
    const room = rooms[code];
    if (!room?.game) return;
    const g = room.game;
    const seat = socket._unoSeat;
    if (g.turnSeat !== seat) return;
    if (!g.drawnThisTurn) { socket.emit('game:toast', { msg: 'Draw first, then pass', dur: 1500 }); return; }

    nextTurn(g, room.players.length, 1);
    broadcastGameState(code);
  });

  // ── UNO CALL ─────────────────────────────────────────────
  socket.on('game:uno', ({ room: code }) => {
    const room = rooms[code];
    if (!room?.game) return;
    const seat = socket._unoSeat;
    if (room.game.hands[seat]?.length === 2) {
      io.to(code).emit('game:toast', { msg: `${room.players[seat]?.name} calls UNO! 🔥`, dur: 2500 });
    }
  });

  // ── DISCONNECT ────────────────────────────────────────────
  socket.on('disconnect', () => {
    const code = socket._unoRoom;
    if (!code || !rooms[code]) return;
    const room = rooms[code];
    const seat = socket._unoSeat;
    const playerName = room.players[seat]?.name || 'A player';

    io.to(code).emit('game:toast', { msg: `${playerName} disconnected`, dur: 3000 });
    io.to(code).emit('room:player_left', { seat, name: playerName });

    if (room.started && room.game) {
      // End game if someone leaves mid-game
      io.to(code).emit('game:over', { winnerSeat: -1, winnerName: null, abandoned: true });
      room.started = false;
    }

    // Remove player
    if (room.players[seat]) room.players[seat] = null;

    // Clean up empty rooms
    if (room.players.every(p => !p)) {
      delete rooms[code];
      console.log(`Room ${code} cleaned up`);
    }

    console.log(`[-] ${playerName} left ${code}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🎮 UNO Server running on http://localhost:${PORT}`);
  console.log(`   Share this URL with friends on the same network!\n`);
});