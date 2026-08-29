'use strict';

function cleanJid(jid = '') { return String(jid).split(':')[0]; }

module.exports = {
  name: 'antilink',
  category: 'moderación',
  desc: 'Elimina enlaces y expulsa a los usuarios al llegar a 3 advertencias',
  
  onMessage: async ({ sock, msg, remoteJid, body, sender, isOwner, db }) => {
    // Solo actuar en grupos y si hay texto
    if (!remoteJid.endsWith('@g.us') || !body) return;

    // Regex para detectar enlaces de grupos de WhatsApp
    const linkRegex = /chat\.whatsapp\.com\/[0-9A-Za-z]{10,}/i;
    if (!linkRegex.test(body)) return;

    const senderJid = cleanJid(sender);
    if (isOwner) return; // El Owner es inmune

    // Validar permisos del bot y del usuario
    let isBotAdmin = false;
    let isAdmin = false;
    try {
      const groupMetadata = await sock.groupMetadata(remoteJid);
      const botJid = cleanJid(sock.user.id);
      const participants = groupMetadata.participants || [];
      isBotAdmin = participants.some(p => p.id === botJid && (p.admin === 'admin' || p.admin === 'superadmin'));
      isAdmin = participants.some(p => p.id === senderJid && (p.admin === 'admin' || p.admin === 'superadmin'));
    } catch (e) {
      console.log('Error obteniendo metadata del grupo', e);
    }

    if (isAdmin) return; // Los admins pueden mandar links sin ser castigados
    if (!isBotAdmin) return; // El bot necesita ser admin para poder borrar y expulsar

    // 1. ELIMINAR EL MENSAJE
    try {
      await sock.sendMessage(remoteJid, { delete: msg.key });
    } catch (err) {
      console.log('Error eliminando link:', err);
    }

    // 2. LECTURA DIRECTA A MONGODB
    const userData = await db.getUser(senderJid);
    
    // 3. AUMENTAR LA ADVERTENCIA DE FORMA SEGURA
    userData.warn = (Number(userData.warn) || 0) + 1;

    if (userData.warn >= 3) {
      // Si llega a 3, resetear contador y GUARDAR
      userData.warn = 0; 
      if (userData.save) await userData.save();

      // Enviar mensaje de expulsión
      await sock.sendMessage(remoteJid, { 
        text: `🚫 *LÍMITE ALCANZADO*\n\n@${senderJid.split('@')[0]} ha sido expulsado por enviar enlaces de otros grupos (3/3 advertencias).`, 
        mentions: [senderJid] 
      });

      // Expulsar al participante
      try {
        await sock.groupParticipantsUpdate(remoteJid, [senderJid], 'remove');
      } catch (err) {
        console.log('Error al expulsar:', err);
      }
    } else {
      // Si no llega a 3, GUARDAR la nueva advertencia en MongoDB
      if (userData.save) await userData.save();

      // Enviar advertencia
      await sock.sendMessage(remoteJid, { 
        text: `⚠️ *ANTILINK DETECTADO*\n\n@${senderJid.split('@')[0]}, no se permiten enlaces de otros grupos aquí.\n🚨 Warns: *${userData.warn}/3*`, 
        mentions: [senderJid] 
      });
    }
  }
};
