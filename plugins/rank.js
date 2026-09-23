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

function cleanNumber(jid = '') {
  return cleanJid(jid).split('@')[0].replace(/\D/g, '');
}

// Función para obtener al usuario objetivo
function getTarget(msg, sender) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return cleanJid(quoted);

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return cleanJid(mentioned);

  return cleanJid(sender);
}

// 🔥 FÓRMULA MAESTRA DE NIVEL (Igual que topxp.js y perfil.js)
function calculateLevel(xp) {
  return Math.floor(0.1 * Math.sqrt(xp)) || 0;
}

module.exports = {
  name: 'rank',
  aliases: ['rango'],
  category: 'economía',
  desc: 'Muestra tu rango o el de otro usuario con la barra de progreso',

  execute: async ({ sock, msg, remoteJid, sender, pushName, db }) => {
    const target = getTarget(msg, sender);
    const user = await db.getUser(target);

    const xp = user.xp || 0;
    
    // 1️⃣ Calculamos el nivel real
    const level = (typeof db.calculateLevel === 'function') ? db.calculateLevel(xp) : calculateLevel(xp);

    // 2️⃣ Matemática inversa para saber la XP exacta de cada nivel
    const currentBaseXP = 100 * Math.pow(level, 2);       // XP base de tu nivel actual
    const nextBaseXP = 100 * Math.pow(level + 1, 2);      // XP necesaria para el próximo nivel

    // 3️⃣ Calculamos el progreso dentro del nivel actual
    const tierTotal = nextBaseXP - currentBaseXP;         // XP total de esta fase
    const progress = xp - currentBaseXP;                  // XP ganada en esta fase
    const needed = nextBaseXP - xp;                       // XP que falta para subir

    const role = getRole(level);
    const bar = makeBar(progress, tierTotal);

    const number = cleanNumber(target);
    const displayUser = target === cleanJid(sender) ? `👤 ${pushName}` : `👤 @${number}`;
    
    // Aseguramos que la mención funcione pintándose de azul
    const targetJid = `${number}@s.whatsapp.net`;

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
║ ${progress} / ${tierTotal} XP
║
║ ⏳ Faltan: ${needed} XP
╚════════════════════╝`;

    await sock.sendMessage(remoteJid, { text, mentions: [targetJid] }, { quoted: msg });
  }
};
