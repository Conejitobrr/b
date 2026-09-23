'use strict';

const bjSessions = new Map();

const SUITS = ['♠️', '♥️', '♣️', '♦️'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function getDeck() {
  let deck = [];
  for (let suit of SUITS) {
    for (let value of VALUES) {
      deck.push({ suit, value });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

function getCardValue(card) {
  if (['J', 'Q', 'K'].includes(card.value)) return 10;
  if (card.value === 'A') return 11;
  return parseInt(card.value);
}

function calculateScore(cards) {
  let score = 0;
  let aces = 0;
  for (let card of cards) {
    score += getCardValue(card);
    if (card.value === 'A') aces += 1;
  }
  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }
  return score;
}

function renderCards(cards, hideSecond = false) {
  if (hideSecond && cards.length > 1) {
    return `[ ${cards[0].value}${cards[0].suit} ] [ ❓ ]`;
  }
  return cards.map(c => `[ ${c.value}${c.suit} ]`).join(' ');
}

function cleanNumber(jid = '') { return String(jid).split('@')[0].split(':')[0].replace(/\D/g, ''); }

module.exports = {
  name: 'blackjack',
  aliases: ['bj', 'pedir', 'plantarse'],
  category: 'juegos',
  desc: 'Juega al Blackjack (21) contra SiriusBot',

  execute: async ({ sock, msg, remoteJid, sender, args, commandName, db, reply }) => {
    const action = commandName.toLowerCase();
    const session = bjSessions.get(sender);

    // ==========================================
    // 🟢 INICIAR PARTIDA NUEVA (.bj [apuesta])
    // ==========================================
    if (['blackjack', 'bj'].includes(action)) {
      if (session) return reply('❌ Ya tienes una partida en curso. Usa *.pedir* o *.plantarse*.');
      
      const bet = parseInt(args.find(a => /^\d+$/.test(a))) || 0;
      if (bet <= 0) return reply('❌ Debes apostar algo de XP. Ejemplo: *.bj 500*');
      
      const uData = await db.getUser(sender);
      if ((uData.xp || 0) < bet) return reply(`❌ No tienes XP suficiente. Intentas apostar *${bet}* pero tienes *${uData.xp || 0}*.`);

      // Cobramos la apuesta por adelantado (para evitar que se salgan si les tocan malas cartas)
      uData.xp -= bet;
      if (uData.save) await uData.save();

      const deck = getDeck();
      const playerHand = [deck.pop(), deck.pop()];
      const botHand = [deck.pop(), deck.pop()];

      const newSession = { bet, deck, playerHand, botHand, timeoutId: null };

      // Calcular si alguien hizo Blackjack (21 exacto)
      const playerScore = calculateScore(playerHand);
      const botScore = calculateScore(botHand);

      if (playerScore === 21) {
        // Blackjack natural
        uData.xp += bet * 2.5; // Gana el 150% en Blackjack natural
        if (uData.save) await uData.save();
        return sock.sendMessage(remoteJid, { 
          text: `🎰 *BLACKJACK NATURAL* 🎰\n\n🃏 Cartas de SiriusBot: ${renderCards(botHand)}\n📊 Total: ${botScore}\n\n🃏 Tus cartas: ${renderCards(playerHand)}\n📊 Total: *21*\n\n🎉 ¡Felicidades @${cleanNumber(sender)}! Ganaste *${bet * 2.5} XP*.`,
          mentions: [sender]
        }, { quoted: msg });
      }

      bjSessions.set(sender, newSession);

      // Timeout por inactividad
      newSession.timeoutId = setTimeout(() => {
        bjSessions.delete(sender);
        sock.sendMessage(remoteJid, { text: `⏱️ @${cleanNumber(sender)}, tu partida de Blackjack expiró por inactividad. El crupier se queda con tus *${bet} XP*.`, mentions: [sender] });
      }, 2 * 60 * 1000);

      let txt = `🎰 *MESA DE BLACKJACK (21)* 🎰\n\n💰 Pozo en juego: *${bet * 2} XP*\n\n🤖 Cartas de SiriusBot: ${renderCards(botHand, true)}\n📊 Total: ?\n\n👤 Tus cartas: ${renderCards(playerHand)}\n📊 Total: *${playerScore}*\n\n_(Presiona los botones o escribe *.pedir* / *.plantarse*)_`;

      return sock.sendMessage(remoteJid, {
        text: txt,
        buttons: [
          { buttonId: '.pedir', buttonText: { displayText: '🃏 Pedir Carta' }, type: 1 },
          { buttonId: '.plantarse', buttonText: { displayText: '🛑 Plantarse' }, type: 1 }
        ],
        headerType: 1,
        mentions: [sender]
      });
    }

    // ==========================================
    // 🃏 PEDIR CARTA
    // ==========================================
    if (action === 'pedir') {
      if (!session) return reply('❌ No estás jugando al Blackjack. Usa *.bj [apuesta]*');

      clearTimeout(session.timeoutId);
      session.playerHand.push(session.deck.pop());
      const playerScore = calculateScore(session.playerHand);

      if (playerScore > 21) {
        // SE PASÓ (BUST)
        bjSessions.delete(sender);
        return sock.sendMessage(remoteJid, {
          text: `💥 *¡TE PASASTE! (BUST)* 💥\n\n🃏 Tus cartas: ${renderCards(session.playerHand)}\n📊 Total: *${playerScore}*\n\n💀 Has perdido tus *${session.bet} XP* apostados. ¡Mejor suerte a la próxima!`,
          mentions: [sender]
        }, { quoted: msg });
      }

      if (playerScore === 21) {
        // Alcanzó 21 justo, forzamos a plantarse automáticamente
        msg.message.conversation = '.plantarse'; // Fake command
        return module.exports.execute({ sock, msg, remoteJid, sender, args, commandName: 'plantarse', db, reply });
      }

      // Sigue vivo, renueva el timeout
      session.timeoutId = setTimeout(() => {
        bjSessions.delete(sender);
        sock.sendMessage(remoteJid, { text: `⏱️ @${cleanNumber(sender)}, partida expirada. Perdiste tus *${session.bet} XP*.`, mentions: [sender] });
      }, 2 * 60 * 1000);

      let txt = `🎰 *BLACKJACK* (Continuación) 🎰\n\n🤖 Cartas de SiriusBot: ${renderCards(session.botHand, true)}\n\n👤 Tus cartas: ${renderCards(session.playerHand)}\n📊 Total: *${playerScore}*\n\n_(¿Quieres otra carta o te plantas?)_`;
      
      return sock.sendMessage(remoteJid, {
        text: txt,
        buttons: [
          { buttonId: '.pedir', buttonText: { displayText: '🃏 Pedir Carta' }, type: 1 },
          { buttonId: '.plantarse', buttonText: { displayText: '🛑 Plantarse' }, type: 1 }
        ],
        headerType: 1,
        mentions: [sender]
      });
    }

    // ==========================================
    // 🛑 PLANTARSE Y QUE JUEGUE EL BOT
    // ==========================================
    if (action === 'plantarse') {
      if (!session) return reply('❌ No estás jugando al Blackjack.');
      clearTimeout(session.timeoutId);
      bjSessions.delete(sender);

      const playerScore = calculateScore(session.playerHand);
      let botScore = calculateScore(session.botHand);

      // El crupier (bot) siempre pide carta si tiene 16 o menos
      while (botScore < 17) {
        session.botHand.push(session.deck.pop());
        botScore = calculateScore(session.botHand);
      }

      let txt = `🎰 *RESULTADO DEL BLACKJACK* 🎰\n\n`;
      txt += `🤖 SiriusBot: ${renderCards(session.botHand)} (Total: *${botScore}*)\n`;
      txt += `👤 @${cleanNumber(sender)}: ${renderCards(session.playerHand)} (Total: *${playerScore}*)\n\n`;

      const uData = await db.getUser(sender);

      if (botScore > 21) {
        // Bot Bust
        uData.xp = (uData.xp || 0) + (session.bet * 2);
        txt += `🎉 ¡El crupier se pasó! Ganaste *${session.bet * 2} XP*.`;
      } else if (playerScore > botScore) {
        // Jugador gana
        uData.xp = (uData.xp || 0) + (session.bet * 2);
        txt += `🏆 ¡Le ganaste al crupier! Te llevas *${session.bet * 2} XP*.`;
      } else if (playerScore === botScore) {
        // Empate (Push)
        uData.xp = (uData.xp || 0) + session.bet;
        txt += `🤝 ¡Empate! (Push). Se te devuelve tu apuesta de *${session.bet} XP*.`;
      } else {
        // Bot gana
        txt += `💀 El crupier gana. Pierdes tu apuesta de *${session.bet} XP*.`;
      }

      if (uData.save) await uData.save();
      return sock.sendMessage(remoteJid, { text: txt, mentions: [sender] }, { quoted: msg });
    }
  }
};
