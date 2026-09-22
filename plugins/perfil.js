'use strict';

const fs = require('fs');
const path = require('path');

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

function cleanNumber(jid = '') {
  return cleanJid(jid).split('@')[0].replace(/\D/g, '');
}

function getTarget(msg, sender) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return cleanJid(quoted);

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return cleanJid(mentioned);

  return cleanJid(sender);
}

function msToTime(ms = 0) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);

  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

async function getProfileBuffer(sock, jid) {
  try {
    const url = await sock.profilePictureUrl(jid, 'image');
    const res = await fetch(url);
    return Buffer.from(await res.arrayBuffer());
  } catch {
    const defaultProfile = path.join(process.cwd(), 'assets', 'Sinperfil.jpg');
    if (fs.existsSync(defaultProfile)) {
      return fs.readFileSync(defaultProfile);
    }
    return null;
  }
}

module.exports = {
  name: 'perfil',
  aliases: ['profile', 'me', 'xp', 'nivel'],
  category: 'economía',
  desc: 'Muestra tu perfil o el de otro usuario',
  
  execute: async ({ sock, msg, remoteJid, sender, config, db }) => {
    try {
      const rawTarget = getTarget(msg, sender);
      const targetNum = cleanNumber(rawTarget);
      const targetJid = `${targetNum}@s.whatsapp.net`;
      
      const user = await db.getUser(targetJid);

      const ownerNumbers = Array.isArray(config.owner) ? config.owner.map(n => String(n).replace(/\D/g, '')) : [];
      const isOwner = ownerNumbers.includes(targetNum);
      const isPremium = user.premium === true || Number(user.premiumUntil || 0) > Date.now();
      
      const jailTimeLeft = Number(user.jailUntil || 0) - Date.now();
      const isJailed = jailTimeLeft > 0;
      
      // 🎯 Corrección: Extraer y limpiar el número de la pareja
      let partnerNum = null;
      let partnerJid = null;
      if (user.partner && user.partner !== 'null') {
        partnerNum = cleanNumber(user.partner);
        partnerJid = `${partnerNum}@s.whatsapp.net`;
      }

      const image = await getProfileBuffer(sock, targetJid);

      const text = `👤 *PERFIL DE USUARIO*

👤 Usuario: @${targetNum}
⭐ XP: *${user.xp || 0}*
🏆 Nivel: *${user.level || 1}*
💎 Premium: *${isPremium ? 'Sí' : 'No'}*
👑 Owner: *${isOwner ? 'Sí' : 'No'}*
🚫 Baneado: *${user.banned ? 'Sí' : 'No'}*

⛓️ Arrestado: *${isJailed ? 'Sí' : 'No'}*
${isJailed ? `⏳ Tiempo restante: *${msToTime(jailTimeLeft)}*\n` : ''}☠️ Fama criminal: *${user.fame || 0}*
💍 Pareja: ${partnerNum ? `@${partnerNum}` : '*Nadie (Soltero/a)*'}`;

      // Inyectamos el target y su pareja al array de menciones para que WhatsApp los pinte de azul
      const mentionsArr = [targetJid];
      if (partnerJid) mentionsArr.push(partnerJid);

      const messageOptions = {
        caption: text,
        mentions: mentionsArr
      };

      if (image) messageOptions.image = image;
      else messageOptions.text = text;

      await sock.sendMessage(remoteJid, messageOptions, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en perfil:', err);
      await sock.sendMessage(remoteJid, { text: '❌ Error al mostrar el perfil.' }, { quoted: msg });
    }
  }
};
