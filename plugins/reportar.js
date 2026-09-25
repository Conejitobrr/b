'use strict';

function cleanNumber(jid = '') {
  return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
}

module.exports = {
  name: 'reportar',
  aliases: ['reporte', 'bug'],
  category: 'utilidad',
  desc: 'Envía un reporte de error o fallo directamente al creador',

  execute: async ({ sock, msg, remoteJid, sender, args, pushName, reply }) => {
    try {
      if (!args.length) {
        return reply('❌ Escribe el error que encontraste.\n\n📌 *Ejemplo:*\n.reportar El comando .play a veces no envía la música.');
      }

      const reporte = args.join(' ').trim();
      
      // 🔥 Tu número personal ya formateado para Baileys
      const ownerJid = '51958959882@s.whatsapp.net';
      const userNum = cleanNumber(sender);
      const userName = pushName || 'Usuario';

      // 📩 Mensaje estructurado que te llegará a TU PRIVADO
      const mensajeOwner = `🚨 *NUEVO REPORTE DE SISTEMA* 🚨\n\n` +
                           `👤 *De:* @${userNum} (${userName})\n` +
                           `💬 *ID del Chat:* ${remoteJid}\n\n` +
                           `📝 *Detalles del error:*\n_${reporte}_`;

      // 1. Te enviamos el reporte a ti
      await sock.sendMessage(ownerJid, { 
        text: mensajeOwner, 
        mentions: [sender] 
      });

      // 2. Le confirmamos al usuario con la personalidad del bot
      const textoConfirmacion = `✅ *Reporte enviado al cuartel general.*\n\n` +
                                `Mi creador revisará este supuesto "fallo" lo antes posible. Gracias por tu aporte (aunque probablemente el error fue tuyo por no saber usarme, pero igual lo revisaremos). 💅`;

      await sock.sendMessage(remoteJid, { text: textoConfirmacion }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en comando reportar:', err);
      return reply('❌ Mi antena de comunicación con el creador falló. Inténtalo más tarde.');
    }
  }
};
