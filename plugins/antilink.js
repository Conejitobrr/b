'use strict';

const MAX_WARN = 3;
function cleanJid(jid = '') { return String(jid).split(':')[0]; }

module.exports = {
  name: 'antilink',
  category: 'seguridad',
  desc: 'Detector automático de links de WhatsApp',

  // Hook pasivo que corre en el handler
  onMessage: async ({ sock, msg, remoteJid, sender, body, fromGroup, isOwner, isAdmin, groupData, db }) => {
    if (!fromGroup || !body) return;
    if (groupData.antilink !== true) return; // Solo funciona si está encendido
    if (isOwner || isAdmin) return; // Los admins pueden enviar links

    // Regex para detectar enlaces de invitación de grupos
    if (/chat\.whatsapp\.com\/[a-zA-Z0-9]+/i.test(body)) {
      const userJid = cleanJid(sender);
      
      // Eliminar el mensaje
      try {
        await sock.sendMessage(remoteJid, { delete: msg.key });
      } catch (e) {
        // Falla si el bot no es admin
      }

      // Sumar Warn
      if (!groupData.warns) groupData.warns = {};
      const current = (groupData.warns[userJid] || 0) + 1;
      groupData.warns[userJid] = current;
      if (groupData.save) await groupData.save(); else await db.setGroup(remoteJid, groupData);

      await sock.sendMessage(remoteJid, { 
        text: `⚠️ *ANTILINK DETECTADO*\n\n@${userJid.split('@')[0]}, no se permiten enlaces de otros grupos aquí.\n🚨 Warns: *${current}/${MAX_WARN}*`, 
        mentions: [sender] 
      });

      // Expulsar si llega al límite
      if (current >= MAX_WARN) {
        try {
          await sock.groupParticipantsUpdate(remoteJid, [sender], 'remove');
          delete groupData.warns[userJid];
          if (groupData.save) await groupData.save(); else await db.setGroup(remoteJid, groupData);
          await sock.sendMessage(remoteJid, { text: `🚫 @${userJid.split('@')[0]} fue expulsado por hacer spam de links.`, mentions: [sender] });
        } catch (e) {
          // El bot no es admin para expulsarlo
        }
      }
    }
  }
};
