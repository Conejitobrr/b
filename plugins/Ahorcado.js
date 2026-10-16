'use strict';

const games = new Map();

const PALABRAS = [
  { word: 'CEVICHE', pista: 'Plato bandera del Perú' },
  { word: 'MOTOTAXI', pista: 'Transporte clásico de barrio' },
  { word: 'SIRIUSBOT', pista: 'El mejor bot de este grupo' },
  { word: 'CHORIPAN', pista: 'Comida rápida con embutido' },
  { word: 'MIGAJERO', pista: 'El que ruega por un poquito de atención' },
  { word: 'WHATSAPP', pista: 'Aplicación donde estás chateando' },
  { word: 'ANTICUCHO', pista: 'Brocheta peruana clásica de noche' },
  { word: 'FANTASMA', pista: 'Miembro del grupo que lee todo y nunca habla' },
  { word: 'MADRUGADA', pista: 'Hora en la que mandan stickers turbios' }
];

const DIBUJOS = [
  `  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========`,
  `  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========`,
  `  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========`,
  `  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========`,
  `  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========`,
  `  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========`,
  `  +---+\n  |   |\n  💀  |\n /|\\  |\n / \\  |\n      |\n=========`
];

function renderBoard(game) {
  const display = game.word.split('').map(l => (game.guessed.has(l) ? l : '_')).join(' ');
  return `🪢 *JUEGO DEL AHORCADO* 🪢\n\n\`\`\`${DIBUJOS[game.errors]}\`\`\`\n\n🔤 *Palabra:* ${display}\n💡 *Pista:* _${game.pista}_\n❌ *Errores:* ${game.errors}/6\n📋 *Letras usadas:* ${[...game.guessed].join(', ') || 'Ninguna'}\n\n📌 _Usa *.letra [A-Z]* o escribe una sola letra en el chat._`;
}

module.exports = {
  name: 'ahorcado',
  aliases: ['letra', 'colgado'],
  category: 'juegos',
  desc: 'Juega al ahorcado en grupo y gana XP',

  execute: async ({ sock, msg, remoteJid, sender, args, commandName, db, reply }) => {
    const cmd = commandName.toLowerCase();

    if (cmd === 'ahorcado' || cmd === 'colgado') {
      if (games.has(remoteJid)) {
        const current = games.get(remoteJid);
        return reply(renderBoard(current));
      }

      const item = PALABRAS[Math.floor(Math.random() * PALABRAS.length)];
      const word = item.word.trim().toUpperCase();
      const game = { word, pista: item.pista, guessed: new Set(), errors: 0 };
      games.set(remoteJid, game);

      return reply(renderBoard(game));
    }

    if (cmd === 'letra') {
      if (!games.has(remoteJid)) return reply('❌ No hay ninguna partida activa. Inicia una con *.ahorcado*');
      const input = (args[0] || '').toUpperCase().trim();
      if (!input || !/^[A-ZÑ]+$/.test(input)) return reply('❌ Ingresa una letra o palabra válida.');

      return await module.exports.processGuess({ sock, msg, remoteJid, sender, input, db, reply });
    }
  },

  onMessage: async ({ sock, remoteJid, body, sender, msg, db, reply }) => {
    if (!games.has(remoteJid) || !body || msg.key.fromMe) return;
    const clean = body.trim().toUpperCase();
    // Si el usuario envía exactamente 1 letra suelta en el chat, la procesa directo
    if (/^[A-ZÑ]$/.test(clean)) {
      await module.exports.processGuess({ sock, msg, remoteJid, sender, input: clean, db, reply });
    }
  },

  processGuess: async ({ sock, msg, remoteJid, sender, input, db, reply }) => {
    const game = games.get(remoteJid);
    if (!game) return;

    // Si intenta adivinar la palabra completa
    if (input.length > 1) {
      if (input === game.word) {
        games.delete(remoteJid);
        const userData = await db.getUser(sender);
        userData.xp = (userData.xp || 0) + 1500;
        if (userData.save) await userData.save();
        return sock.sendMessage(remoteJid, {
          text: `🎉 *¡VICTORIA ÉPICA!* 🎉\n\n@${sender.split('@')[0]} adivinó la palabra completa: *${game.word}*\n💰 Recompensa: *+1500 XP*`,
          mentions: [sender]
        }, { quoted: msg });
      } else {
        game.errors += 1;
      }
    } else {
      // Si intenta una sola letra
      if (game.guessed.has(input)) return;
      game.guessed.add(input);
      if (!game.word.includes(input)) {
        game.errors += 1;
      }
    }

    // Verificar si ganaron
    const won = game.word.split('').every(l => game.guessed.has(l));
    if (won) {
      games.delete(remoteJid);
      const userData = await db.getUser(sender);
      userData.xp = (userData.xp || 0) + 1500;
      if (userData.save) await userData.save();
      return sock.sendMessage(remoteJid, {
        text: `🎉 *¡PALABRA COMPLETADA!* 🎉\n\nLa palabra era: *${game.word}*\n🏆 Ganador del último turno: @${sender.split('@')[0]}\n💰 Premio: *+1500 XP*`,
        mentions: [sender]
      }, { quoted: msg });
    }

    // Verificar si perdieron
    if (game.errors >= 6) {
      games.delete(remoteJid);
      return reply(`💀 *¡AHORCADO!* 💀\n\n\`\`\`${DIBUJOS[6]}\`\`\`\n\nNadie pudo salvarlo. La palabra correcta era: *${game.word}*`);
    }

    return reply(renderBoard(game));
  }
};
