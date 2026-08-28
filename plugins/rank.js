'use strict';

function getRole(level) {
  if (level >= 500) return '🐉 Trascendido';
  if (level >= 250) return '☄️ Celestial';
  if (level >= 150) return '🪐 Divino';
  if (level >= 100) return '👑 Inmortal';
  if (level >= 70) return '💠 Mítico';
  if (level >= 50) return '🌟 Leyenda';
  if (level >= 35) return '🧙 Maestro';
  if (level >= 25) return '🔥 Elite';
  if (level >= 18) return '⚔️ Veterano';
  if (level >= 12) return '🛡️ Guerrero';
  if (level >= 8) return '⚡ Aventurero';
  if (level >= 5) return '📚 Aprendiz';
  if (level >= 3) return '🌱 Principiante';
  return '🐣 Novato';
}

function makeBar(progress, total, size = 10) {
  let filled = Math.round((progress / total) * size);
  if (filled < 0) filled = 0;
  if (filled > size) filled = size;
  const empty = size - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

// Función para obtener al usuario objetivo
function getTarget(msg, sender) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return cleanJid(quoted);

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return cleanJid(mentioned);

  return cleanJid(sender);
}

module.exports = {
  name: 'rank',
  aliases: ['rango'],
  category: 'economía',
  desc: 'Muestra tu rango o el de otro usuario',

  execute: async ({ sock, msg, remoteJid, sender, pushName, db }) => {
    const target = getTarget(msg, sender);
    const user = await db.getUser(target);

    const xp = user.xp || 0;
    const level = user.level || 1;

    // Se requieren 10,000 XP por nivel
    const currentBase = (level - 1) * 10000;
    const nextBase = level * 10000;

    const progress = xp - currentBase;
    const needed = nextBase - xp;

    const role = getRole(level);
    const bar = makeBar(progress, 10000);

    const number = target.split('@')[0];
    const displayUser = target === cleanJid(sender) ? `👤 ${pushName}` : `👤 @${number}`;

    const text = `╔════════════════════╗
║      🎖️ PERFIL RANK
╠════════════════════╣
║ ${displayUser}
║
║ ⭐ XP: *${xp}*
║ 📈 Nivel: *${level}*
║ 🎭 Rol: *${role}*
║
║ ${bar}
║ ${progress} / 10000 XP
║
║ ⏳ Faltan: ${needed} XP
╚════════════════════╝`;

    await sock.sendMessage(remoteJid, { text, mentions: [target] }, { quoted: msg });
  }
};
