'use strict';

// ⏱️ Límite diario en RAM (Se resetea solo a la medianoche o si reinicias Termux)
const dailyLimits = new Map();

function getQuotedInfo(msg) {
  const context = msg.message?.extendedTextMessage?.contextInfo ||
                  msg.message?.imageMessage?.contextInfo ||
                  msg.message?.videoMessage?.contextInfo ||
                  msg.message?.documentMessage?.contextInfo ||
                  msg.message?.audioMessage?.contextInfo ||
                  msg.message?.stickerMessage?.contextInfo;

  if (!context?.quotedMessage) return null;

  return {
    quotedMessage: context.quotedMessage,
    participant: context.participant,
    stanzaId: context.stanzaId
  };
}

module.exports = {
  name: 'notify',
  aliases: ['hidetag', 'notificar'],
  category: 'grupos',
  desc: 'Etiqueta a todos los miembros de forma invisible',

  execute: async ({ sock, msg, remoteJid, args, sender, fromGroup, isOwner, userData, reply }) => {
    if (!fromGroup) {
      return reply('❌ Solo funciona en grupos.');
    }

    try {
      const isPremium = userData.premium === true || Number(userData.premiumUntil || 0) > Date.now();
      let remaining = null;

      // 🛡️ Lógica de 5 usos gratuitos diarios
      if (!isOwner && !isPremium) {
        const today = new Date().toDateString();
        let limitInfo = dailyLimits.get(sender) || { date: today, count: 0 };
        
        if (limitInfo.date !== today) {
          limitInfo = { date: today, count: 0 };
        }

        if (limitInfo.count >= 5) {
          return reply('❌ Ya usaste tus *5 notificaciones gratis* de hoy.\n\n⭐ Hazte premium para uso ilimitado.');
        }

        limitInfo.count += 1;
        dailyLimits.set(sender, limitInfo);
        remaining = 5 - limitInfo.count;
      }

      const metadata = await sock.groupMetadata(remoteJid);
      const users = metadata.participants.map(p => p.id);

      const text = args.join(' ').trim();
      const quoted = getQuotedInfo(msg);
      const extra = remaining !== null ? `\n\n📊 Usos restantes: ${remaining}/5` : '';

      // Opción 1: Reenviar el mensaje citado
      if (quoted && !text) {
        return await sock.sendMessage(remoteJid, {
          forward: {
            key: { remoteJid, fromMe: false, id: quoted.stanzaId, participant: quoted.participant },
            message: quoted.quotedMessage
          },
          contextInfo: { mentionedJid: users }
        }, { quoted: msg });
      }

      // Opción 2: Texto original respondiendo a un mensaje
      if (quoted && text) {
        return await sock.sendMessage(remoteJid, {
          text: text + extra,
          mentions: users
        }, {
          quoted: {
            key: { remoteJid, fromMe: false, id: quoted.stanzaId, participant: quoted.participant },
            message: quoted.quotedMessage
          }
        });
      }

      // Opción 3: Solo texto, sin responder a nada
      if (!text) {
        return reply('❌ Escribe un mensaje o responde a uno.');
      }

      await sock.sendMessage(remoteJid, {
        text: text + extra,
        mentions: users
      }, { quoted: msg });

    } catch (e) {
      console.log('❌ Error notify:', e?.stack || e);
      await reply('❌ Error al enviar notificación.');
    }
  }
};
