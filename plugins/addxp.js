'use strict';

function cleanJid(jid = '') { return String(jid).split(':')[0]; }

module.exports = {
  name: 'addxp',
  aliases: ['quitarxp', 'delxp', 'removexp'],
  category: 'owner',
  desc: 'Añadir o quitar XP a un usuario o al bot',

  execute: async ({ sock, remoteJid, msg, args, isOwner, botJid, commandName, db, reply }) => {
    if (!isOwner) return reply('❌ Solo el owner puede usar este comando.');

    let target = msg.message?.extendedTextMessage?.contextInfo?.participant 
              || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

    if (args.includes('bot') || args.includes('Bot')) {
      let botId = botJid || sock.user?.id || '';
      target = botId.includes(':') ? botId.split(':')[0] + '@s.whatsapp.net' : botId;
    }

    if (!target) return reply('❌ Debes mencionar, responder a alguien o poner "bot".\nEjemplos:\n.addxp @usuario 1000\n.quitarxp bot 500');

    target = cleanJid(target);
    const amountStr = args.find(a => /^\d+$/.test(a));
    const amount = parseInt(amountStr);

    if (isNaN(amount) || amount <= 0) return reply('❌ Indica una cantidad válida mayor a 0.\nEjemplo: .addxp @usuario 1000');

    const isRemoving = ['quitarxp', 'delxp', 'removexp'].includes(commandName);
    const targetData = await db.getUser(target);

    // 🔥 Modificación matemática directa (Libre de errores)
    if (isRemoving) {
      targetData.xp = Math.max(0, (targetData.xp || 0) - amount);
    } else {
      targetData.xp = (targetData.xp || 0) + amount;
    }

    // Recalcular nivel
    targetData.level = Math.floor(targetData.xp / 10000) + 1;
    if (targetData.level < 1) targetData.level = 1;

    // Guardado seguro
    if (targetData.save) await targetData.save();
    else await db.setUser(target, targetData);

    const number = target.split('@')[0];
    const isBot = target === cleanJid(botJid);
    const accionTexto = isRemoving ? 'quitaron' : 'añadieron';
    const icono = isRemoving ? '➖' : '✅';

    return sock.sendMessage(remoteJid, { 
      text: `${icono} XP actualizada correctamente\n\nSe ${accionTexto} *${amount} XP* a ${isBot ? 'SiriusBot 🤖' : `@${number}`}`, 
      mentions: [target] 
    }, { quoted: msg });
  }
};
