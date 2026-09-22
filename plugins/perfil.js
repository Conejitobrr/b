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
      const target = getTarget(msg, sender);
      const user = await db.getUser(target);

      const ownerNumbers = Array.isArray(config.owner) ? config.owner.map(n => String(n).replace(/\D/g, '')) : [];
      const isOwner = ownerNumbers.includes(cleanNumber(target));
      const isPremium = user.premium === true || Number(user.premiumUntil || 0) > Date.now();
      
      const jailTimeLeft = Number(user.jailUntil || 0) - Date.now();
      const isJailed = jailTimeLeft > 0;
      
      let partnerText = '*Nadie (Soltero/a)*';
      
      // Siempre incluimos al dueño del perfil para que su mención principal funcione
      const targetJid = target.includes('@') ? target : `${cleanNumber(target)}@s.whatsapp.net`;
      const mentions = [targetJid]; 
      
      if (user.partner && user.partner !== 'null') {
        const partnerJid = user.partner.includes('@') ? user.partner : `${cleanNumber(user.partner)}@s.whatsapp.net`;
        const partnerNum = cleanNumber(partnerJid);
        
        let isPartnerInGroup = false;
        
        // 🔍 Verificamos si la pareja está actualmente en el grupo
        if (remoteJid.endsWith('@g.us')) {
          try {
            const metadata = await sock.groupMetadata(remoteJid);
            const participants = metadata.participants.map(p => cleanNumber(p.id));
            if (participants.includes(partnerNum)) {
              isPartnerInGroup = true;
            }
          } catch (e) {}
        }

        if (isPartnerInGroup) {
          // Opción 1: SÍ está en el grupo (Mención azul clásica)
          partnerText = `@${partnerNum}`;
          mentions.push(partnerJid);
        } else {
          // Opción 2: NO está en el grupo. Buscamos su nombre de WhatsApp en la memoria RAM (Baileys)
          let pushname = null;
          if (sock.store && sock.store.contacts && sock.store.contacts[partnerJid]) {
            const contact = sock.store.contacts[partnerJid];
            pushname = contact.notify || contact.pushname || contact.name || contact.verifiedName;
          }
          
          if (pushname) {
            // Logró extraer el nombre: Lo imprimimos como texto plano normal (@Alexa)
            partnerText = `@${pushname}`;
          } else {
            // Si la memoria está vacía, forzamos la mención nativa para evitar que salgan números crudos
            partnerText = `@${partnerNum}`;
            mentions.push(partnerJid);
          }
        }
      }

      const image = await getProfileBuffer(sock, targetJid);

      const text = `👤 *PERFIL DE USUARIO*

👤 Usuario: @${cleanNumber(target)}
⭐ XP: *${user.xp || 0}*
🏆 Nivel: *${user.level || 1}*
💎 Premium: *${isPremium ? 'Sí' : 'No'}*
👑 Owner: *${isOwner ? 'Sí' : 'No'}*
🚫 Baneado: *${user.banned ? 'Sí' : 'No'}*

⛓️ Arrestado: *${isJailed ? 'Sí' : 'No'}*
${isJailed ? `⏳ Tiempo restante: *${msToTime(jailTimeLeft)}*\n` : ''}☠️ Fama criminal: *${user.fame || 0}*
💍 Pareja: ${partnerText}`;

      const messageOptions = {
        caption: text,
        mentions: mentions
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
