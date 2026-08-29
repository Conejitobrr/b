'use strict';

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

    if (isOwner) return; // El Owner es inmune

    // 🔥 ESTANDARIZACIÓN DE JIDs PARA BAILEYS (Evita el fallo de admin)
    const senderJid = sender.includes(':') ? sender.split(':')[0] + '@s.whatsapp.net' : sender;
    const botJid = sock.user.id.includes(':') ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : sock.user.id;

    let isBotAdmin = false;
    let isAdmin = false;

    try {
      const groupMetadata = await sock.groupMetadata(remoteJid);
      const participants = groupMetadata.participants || [];
      
      // Verifica si el bot y el usuario son admins
      isBotAdmin = participants.some(p => p.id === botJid && (p.admin === 'admin' || p.admin === 'superadmin'));
      isAdmin = participants.some(p => p.id === senderJid && (p.admin === 'admin' || p.admin === 'superadmin'));
    } catch (e) {
      console.log('Error obteniendo metadata del grupo para antilink', e);
    }

    if (isAdmin) return; // Los admins del grupo pueden mandar links
    if (!isBotAdmin) return; // Si el bot no es admin, aborta silenciosamente

    // 1. ELIMINAR EL MENSAJE
    try {
      await sock.sendMessage(remoteJid, { delete: msg.key });
    } catch (err) {
      console.log('Error eliminando link:', err);
    }

    // 2. LECTURA Y AUMENTO DE WARN EN MONGODB
    let userData;
    try {
      userData = await db.getUser(senderJid);
    } catch (e) {
      return;
    }
    
    userData.warn = (Number(userData.warn) || 0) + 1;

    // 3. EJECUCIÓN DE CASTIGOS
    if (userData.warn >= 3) {
      userData.warn = 0; 
      if (userData.save) await userData.save();

      await sock.sendMessage(remoteJid, { 
        text: `🚫 *LÍMITE ALCANZADO*\n\n@${senderJid.split('@')[0]} ha sido expulsado por enviar enlaces de otros grupos (3/3 advertencias).`, 
        mentions: [senderJid] 
      });

      try {
        await sock.groupParticipantsUpdate(remoteJid, [senderJid], 'remove');
      } catch (err) {
        console.log('Error al expulsar:', err);
      }
    } else {
      if (userData.save) await userData.save();

      await sock.sendMessage(remoteJid, { 
        text: `⚠️ *ANTILINK DETECTADO*\n\n@${senderJid.split('@')[0]}, no se permiten enlaces de otros grupos aquí.\n🚨 Warns: *${userData.warn}/3*`, 
        mentions: [senderJid] 
      });
    }
  }
};
