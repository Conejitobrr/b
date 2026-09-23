'use strict';

// Mapas globales para mantener las partidas vivas en la memoria RAM
const groupSessions = new Map();
const botBetCooldowns = new Map(); 

const MAX_BET = 2000; 
const BOT_COOLDOWN_MINS = 10; 

// ==========================================
// FUNCIONES DE UTILIDAD ESTRICTA
// ==========================================
function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }

function getTarget(msg, args) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return `${cleanNumber(quoted)}@s.whatsapp.net`;
  
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return `${cleanNumber(mentioned)}@s.whatsapp.net`;
  
  return null;
}

// ==========================================
// MECÁNICAS DEL TRES EN RAYA
// ==========================================
const WIN_COMBOS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

function checkWin(board, mark) {
  return WIN_COMBOS.some(combo => combo.every(idx => board[idx] === mark));
}

function renderBoard(board) {
  const numEmojis = {
    1: '1️⃣', 2: '2️⃣', 3: '3️⃣',
    4: '4️⃣', 5: '5️⃣', 6: '6️⃣',
    7: '7️⃣', 8: '8️⃣', 9: '9️⃣'
  };
  const b = board.map(val => {
    if (val === 'X') return '✖️'; 
    if (val === 'O') return '⭕'; 
    return numEmojis[val];
  });
  return `\n  ${b[0]} │ ${b[1]} │ ${b[2]} \n ───┼───┼─── \n  ${b[3]} │ ${b[4]} │ ${b[5]} \n ───┼───┼─── \n  ${b[6]} │ ${b[7]} │ ${b[8]} \n`;
}

// Inteligencia Artificial Básica del Bot
function getBotMove(board) {
  // 1. Intentar ganar
  for (let i = 0; i < 9; i++) {
    if (typeof board[i] === 'number') {
      const backup = board[i]; board[i] = 'O';
      if (checkWin(board, 'O')) { board[i] = backup; return i; }
      board[i] = backup;
    }
  }
  // 2. Bloquear al jugador
  for (let i = 0; i < 9; i++) {
    if (typeof board[i] === 'number') {
      const backup = board[i]; board[i] = 'X';
      if (checkWin(board, 'X')) { board[i] = backup; return i; }
      board[i] = backup;
    }
  }
  // 3. Tomar el centro
  if (typeof board[4] === 'number') return 4;
  // 4. Tomar esquinas
  const corners = [0, 2, 6, 8].filter(i => typeof board[i] === 'number');
  if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
  // 5. Cualquier lado libre
  const available = board.filter(i => typeof i === 'number');
  if (available.length > 0) return board.indexOf(available[Math.floor(Math.random() * available.length)]);
  return -1;
}

// ==========================================
// GESTIÓN DE SESIONES
// ==========================================
function getUserGame(remoteJid, userJid) {
    const games = groupSessions.get(remoteJid) || [];
    return games.find(g => g.player1 === userJid || g.player2 === userJid);
}

function removeGame(remoteJid, session) {
    if (session.timeoutId) clearTimeout(session.timeoutId);
    let games = groupSessions.get(remoteJid) || [];
    games = games.filter(g => g !== session);
    if (games.length === 0) groupSessions.delete(remoteJid);
    else groupSessions.set(remoteJid, games);
}

module.exports = {
  name: 'michi',
  aliases: ['tictactoe', 'tresenraya'],
  category: 'juegos',
  desc: 'Juega al tres en raya con apuestas',

  execute: async ({ sock, msg, remoteJid, sender, args, commandName, db, fromGroup, reply }) => {
    if (!fromGroup) return reply('❌ Este minijuego solo está disponible en grupos.');

    const p1 = `${cleanNumber(sender)}@s.whatsapp.net`;
    const session = getUserGame(remoteJid, p1);
    const action = args[0] ? args[0].toLowerCase().trim() : '';

    // ==========================================
    // ⛔ LÓGICA DE RENDICIÓN O CANCELACIÓN
    // ==========================================
    if (['salir', 'cancelar', 'abandonar', 'rendirse'].includes(action)) {
      if (!session) return sock.sendMessage(remoteJid, { text: '❌ No estás en ninguna partida activa.', mentions: [p1] }, { quoted: msg });
      
      // Si el P2 aún no aceptaba y P1 cancela, devolvemos dinero a P1
      if (!session.accepted) {
          if (session.bet > 0) {
              const uData = await db.getUser(session.player1);
              uData.xp = (uData.xp || 0) + session.bet;
              if (uData.save) await uData.save();
              removeGame(remoteJid, session);
              return sock.sendMessage(remoteJid, { text: `🏳️ @${cleanNumber(p1)} canceló el duelo antes de empezar. Se le devolvieron sus *${session.bet} XP*.`, mentions: [p1] }, { quoted: msg });
          }
          removeGame(remoteJid, session);
          return sock.sendMessage(remoteJid, { text: `🏳️ Partida cancelada.`, mentions: [p1] }, { quoted: msg });
      }

      // Si se rinde a mitad del juego
      const winner = session.player1 === p1 ? session.player2 : session.player1;
      if (session.bet > 0) {
        const winData = await db.getUser(winner);
        winData.xp = (winData.xp || 0) + (session.bet * 2);
        if (winData.save) await winData.save();
        sock.sendMessage(remoteJid, { text: `🏳️ @${cleanNumber(p1)} se acobardó y abandonó.\n\n🏆 ¡Gana @${cleanNumber(winner)} y se lleva *${session.bet * 2} XP*!`, mentions: [p1, winner] }, { quoted: msg });
      } else {
        sock.sendMessage(remoteJid, { text: `🏳️ @${cleanNumber(p1)} se rindió. ¡Gana @${cleanNumber(winner)}!`, mentions: [p1, winner] }, { quoted: msg });
      }
      removeGame(remoteJid, session);
      return;
    }

    // ==========================================
    // 🟢 CREAR NUEVA PARTIDA
    // ==========================================
    if (!session) {
      if (getUserGame(remoteJid, p1)) return reply('❌ Ya estás en otra partida.');

      let target = getTarget(msg, args) || 'bot';
      // Buscar el número de apuesta en los argumentos
      let bet = parseInt(args.find(a => /^\d+$/.test(a))) || 0;

      if (bet > MAX_BET) return reply(`❌ El límite de apuestas para el Michi es de *${MAX_BET} XP*.`);
      if (target === p1) return reply('❌ Ve al psicólogo, no puedes jugar contigo mismo.');
      
      // Cooldown vs Bot (Evita que farmeen XP con el bot)
      if (target === 'bot' && bet > 0) {
          const last = botBetCooldowns.get(p1) || 0;
          if (Date.now() - last < BOT_COOLDOWN_MINS * 60000) {
              const timeLeft = Math.ceil((BOT_COOLDOWN_MINS * 60000 - (Date.now() - last)) / 60000);
              return reply(`⏳ *¡CÁLMATE LUDÓPATA!*\n\nEspera *${timeLeft} minutos* para volver a apostar contra SiriusBot.`);
          }
      }

      // Validar dinero y cobrar entrada a P1
      if (bet > 0) {
         const p1Data = await db.getUser(p1);
         if ((p1Data.xp || 0) < bet) return reply(`❌ No tienes XP suficiente. Intentas apostar *${bet}* pero tienes *${p1Data.xp || 0}*.`);
         
         if (target !== 'bot') {
             const p2Data = await db.getUser(target);
             if ((p2Data.xp || 0) < bet) { 
               return sock.sendMessage(remoteJid, { text: `❌ @${cleanNumber(target)} es muy pobre y no tiene *${bet} XP* para igualar la apuesta.`, mentions: [target] }, { quoted: msg }); 
             }
         }
         
         p1Data.xp -= bet;
         if (p1Data.save) await p1Data.save();
      }

      const startingPlayer = Math.random() < 0.5 ? p1 : target;

      const newSession = {
        player1: p1, player2: target, board: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        turn: startingPlayer, bet, accepted: target === 'bot', timeoutId: null
      };

      // Si empieza el bot, mueve directo
      if (newSession.turn === 'bot') {
          newSession.board[getBotMove(newSession.board)] = 'O';
          newSession.turn = p1;
      }
      
      groupSessions.set(remoteJid, [...(groupSessions.get(remoteJid) || []), newSession]);
      if (target === 'bot' && bet > 0) botBetCooldowns.set(p1, Date.now());

      const txt = `⚔️ *PARTIDA DE MICHI* ⚔️\n\n` + 
                  (bet > 0 ? `💰 Pozo: *${bet * 2} XP*\n` : '') +
                  `✖️ P1: @${cleanNumber(p1)}\n⭕ P2: ${target === 'bot' ? '🤖 SiriusBot' : `@${cleanNumber(target)}`}\n` +
                  renderBoard(newSession.board) +
                  `\n🎲 Empieza: ${startingPlayer === 'bot' ? '🤖 SiriusBot' : `@${cleanNumber(startingPlayer)}`}\n` +
                  `_(Escribe un número del 1 al 9 para jugar)_\n` + 
                  (target !== 'bot' ? `\n📌 _Para aceptar el reto, @${cleanNumber(target)} debe hacer su primera jugada._` : '');
      
      const menciones = target === 'bot' ? [p1] : [p1, target];
      return sock.sendMessage(remoteJid, { text: txt, mentions: menciones }, { quoted: msg });
    }

    // ==========================================
    // 🎮 PROCESAMIENTO DE TURNOS
    // ==========================================
    if (session.turn !== p1) return sock.sendMessage(remoteJid, { text: `⏳ Espera tu turno. Le toca a @${cleanNumber(session.turn)}`, mentions: [session.turn] }, { quoted: msg });
    
    const idx = parseInt(action) - 1;
    if (isNaN(idx) || idx < 0 || idx > 8 || typeof session.board[idx] !== 'number') {
        return reply('❌ Casilla inválida o ya ocupada. Envía un número libre del 1 al 9.');
    }

    // 🔥 ACEPTACIÓN OFICIAL DEL RIVAL: Se le cobra la apuesta en su primer movimiento
    if (p1 === session.player2 && !session.accepted) {
        if (session.bet > 0) {
            const p2Data = await db.getUser(p1);
            if ((p2Data.xp || 0) < session.bet) {
                // Si justo gastó su dinero en la tienda, cancelamos
                removeGame(remoteJid, session);
                const p1Data = await db.getUser(session.player1);
                p1Data.xp = (p1Data.xp || 0) + session.bet;
                if (p1Data.save) await p1Data.save();
                return sock.sendMessage(remoteJid, { text: `❌ @${cleanNumber(session.player2)} se quedó sin XP antes de aceptar.\nDuelo cancelado y dinero devuelto a P1.`, mentions: [session.player2, session.player1] }, { quoted: msg });
            }
            p2Data.xp -= session.bet;
            if (p2Data.save) await p2Data.save();
        }
        session.accepted = true; 
    }

    // Registrar la jugada
    session.board[idx] = (session.turn === session.player1) ? 'X' : 'O';
    
    // Función local para terminar la partida
    const endGame = async (result, winner, loser) => {
        removeGame(remoteJid, session);
        let txt = '';
        const mentions = [];
        
        if (result === 'win') {
           txt = `🏆 *¡HAY UN GANADOR!* 🏆\n\n🥇 Ganador: ${winner === 'bot' ? '🤖 SiriusBot' : `@${cleanNumber(winner)}`}\n`;
           if (winner !== 'bot') mentions.push(winner);
           if (loser !== 'bot') mentions.push(loser);
           
           txt += renderBoard(session.board);
           
           if (session.bet > 0) {
             if (winner !== 'bot') {
                 const wData = await db.getUser(winner);
                 wData.xp = (wData.xp || 0) + (session.bet * 2);
                 if (wData.save) await wData.save();
             }
             txt += `\n💰 Se lleva el pozo de *${session.bet * 2} XP*.`;
           } else {
             if (winner !== 'bot') { 
                 const wData = await db.getUser(winner);
                 wData.xp = (wData.xp || 0) + 50;
                 if (wData.save) await wData.save();
                 txt += `\n🎁 Se lleva *+50 XP* de recompensa.`; 
             }
           }
        } else {
           txt = `🤝 *¡EMPATE TÁCTICO!* 🤝\n` + renderBoard(session.board);
           mentions.push(session.player1);
           if (session.player2 !== 'bot') mentions.push(session.player2);
           
           if (session.bet > 0) {
              const p1Data = await db.getUser(session.player1);
              p1Data.xp = (p1Data.xp || 0) + session.bet;
              if (p1Data.save) await p1Data.save();

              if (session.player2 !== 'bot') {
                  const p2Data = await db.getUser(session.player2);
                  p2Data.xp = (p2Data.xp || 0) + session.bet;
                  if (p2Data.save) await p2Data.save();
              }
              txt += `\n♻️ El pozo ha sido devuelto a ambos jugadores.`;
           } else {
              const p1Data = await db.getUser(session.player1);
              p1Data.xp = (p1Data.xp || 0) + 10;
              if (p1Data.save) await p1Data.save();

              if (session.player2 !== 'bot') {
                  const p2Data = await db.getUser(session.player2);
                  p2Data.xp = (p2Data.xp || 0) + 10;
                  if (p2Data.save) await p2Data.save();
              }
              txt += `\n🎁 Recompensa por esfuerzo: *+10 XP* para cada uno.`;
           }
        }
        sock.sendMessage(remoteJid, { text: txt, mentions }, { quoted: msg });
    };

    // Revisar si alguien ganó o empató
    if (checkWin(session.board, session.board[idx])) return endGame('win', p1, p1 === session.player1 ? session.player2 : session.player1);
    if (session.board.every(val => typeof val === 'string')) return endGame('tie');

    // Cambiar turno
    session.turn = (session.turn === session.player1) ? session.player2 : session.player1;

    // Si le toca al bot
    if (session.turn === 'bot') {
        session.board[getBotMove(session.board)] = 'O';
        if (checkWin(session.board, 'O')) return endGame('win', 'bot', p1);
        if (session.board.every(val => typeof val === 'string')) return endGame('tie');
        session.turn = p1;
    }
    
    sock.sendMessage(remoteJid, { text: `👉 Tu turno: @${cleanNumber(session.turn)}` + renderBoard(session.board) + `\n_(Escribe un número del 1 al 9 o .michi rendirse)_`, mentions: [session.turn] }, { quoted: msg });
  }
};
