'use strict';

const EMOJIS = ['7️⃣', '🍒', '🍋', '🍉', '🍇', '💎'];

function randomEmoji() {
  return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatTime(ms) {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes <= 0) return `${seconds} seg`;
  return `${minutes} min ${seconds} seg`;
}

module.exports = {
  name: 'slot',
  aliases: ['casino', '777', 'tragamonedas'],
  category: 'juegos',
  desc: 'Juega en el tragamonedas apostando tu XP',

  execute: async ({ sock, msg, remoteJid, sender, args, db, reply }) => {
    try {
      if (!db || typeof db.getUser !== 'function') {
        return reply('❌ Error: Base de datos no disponible.');
      }

      const user = await db.getUser(sender);
      if (!user) {
        return reply('❌ No estás registrado en la base de datos todavía. Escribe cualquier comando para registrarte.');
      }

      // ⏳ Control de Cooldown (5 minutos)
      const cooldown = 5 * 60 * 1000;
      const lastSlot = Number(user.lastSlot || 0);

      if (Date.now() - lastSlot < cooldown) {
        const remaining = cooldown - (Date.now() - lastSlot);
        return reply(`⏳ Ya jugaste recientemente.\n\n🎰 Debes esperar:\n*${formatTime(remaining)}*\n\npara volver a usar el tragamonedas.`);
      }

      // 💸 Validación de Apuesta
      const bet = Math.max(1, parseInt(args[0]) || 500);

      if ((user.xp || 0) < bet) {
        return reply(`❌ No tienes suficiente XP para esta apuesta.\n\n🎖️ XP actual: *${user.xp || 0}*\n💸 Apuesta: *${bet}*`);
      }

      // Actualizar Cooldown y descontar XP de inmediato
      user.lastSlot = Date.now();
      user.xp = (user.xp || 0) - bet;
      if (typeof user.save === 'function') await user.save();

      // 🎰 Animación de giro (Frames interactivos)
      const sent = await sock.sendMessage(remoteJid, {
        text: `🎰 *TRAGAMONEDAS* 🎰\n\n┏━━━━━━━━━━━┓\n┃ ${randomEmoji()} │ ${randomEmoji()} │ ${randomEmoji()} ┃\n┗━━━━━━━━━━━┛\n\n🎲 Girando...`
      }, { quoted: msg });

      await sleep(1000);
      await sock.sendMessage(remoteJid, {
        text: `🎰 *TRAGAMONEDAS* 🎰\n\n┏━━━━━━━━━━━┓\n┃ ${randomEmoji()} │ ${randomEmoji()} │ ${randomEmoji()} ┃\n┗━━━━━━━━━━━┛\n\n🎲 Girando...`,
        edit: sent.key
      });

      await sleep(1000);
      await sock.sendMessage(remoteJid, {
        text: `🎰 *TRAGAMONEDAS* 🎰\n\n┏━━━━━━━━━━━┓\n┃ ${randomEmoji()} │ ${randomEmoji()} │ ${randomEmoji()} ┃\n┗━━━━━━━━━━━┛\n\n🎲 Girando...`,
        edit: sent.key
      });

      await sleep(1000);

      // 🎲 Resultados finales
      const r1 = randomEmoji();
      const r2 = randomEmoji();
      const r3 = randomEmoji();

      let multiplier = 0;
      let result = '💀 Mala suerte';

      // 💥 JACKPOT 777
      if (r1 === '7️⃣' && r2 === '7️⃣' && r3 === '7️⃣') {
        multiplier = 5;
        result = '💥 JACKPOT 777 💥';
      }
      // 🔥 TRES IGUALES
      else if (r1 === r2 && r2 === r3) {
        multiplier = 3;
        result = '🔥 ¡Tres iguales!';
      }
      // ✨ DOS IGUALES
      else if (r1 === r2 || r1 === r3 || r2 === r3) {
        multiplier = 1.5;
        result = '✨ Dos iguales';
      }

      let reward = 0;
      if (multiplier > 0) {
        reward = Math.floor(bet * multiplier);
        user.xp = (user.xp || 0) + reward;
      }

      if (typeof user.save === 'function') await user.save();

      // 🏆 Mensaje Final con edición del mensaje original
      await sock.sendMessage(remoteJid, {
        text: `🎰 *TRAGAMONEDAS* 🎰\n\n┏━━━━━━━━━━━┓\n┃ ${r1} │ ${r2} │ ${r3} ┃\n┗━━━━━━━━━━━┛\n\n${result}\n\n💸 Apostaste: *${bet} XP*\n${reward > 0 ? `🏆 Ganaste: *${reward} XP*` : `💀 Perdiste: *${bet} XP*`}\n\n🎖️ XP actual: *${user.xp || 0}*`,
        edit: sent.key
      });

    } catch (err) {
      console.log('❌ Error en plugin slot:', err?.message || err);
      return reply('❌ Ocurrió un error al intentar jugar en el tragamonedas.');
    }
  }
};
