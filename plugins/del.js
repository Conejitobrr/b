'use strict';

// Funciones de purificación
function cleanJid(jid = '') { return String(jid).split(':')[0]; }

module.exports = {
  name: 'del',
  aliases: ['delete', 'borrar', 'eliminar'],
  category: 'administración',
  desc: 'Elimina un mensaje (y borra el comando automáticamente)',

  execute: async ({ sock, msg, remoteJid, sender, fromGroup, isAdmin, isOwner, db, reply }) => {
    try {
      // 1. Verificación de permisos (Owner, Admin o Premium)
      let isPremium = false;
      if (db && typeof db.getUser === 'function') {
        const user = await db.getUser(sender);
        isPremium = user?.premium === true || Number(user?.premiumUntil || 0) > Date.now();
      }

      if (!isOwner && !isAdmin && !isPremium) {
        return reply('❌ Solo los administradores, owner o usuarios premium pueden usar este comando.');
      }

      // 2. Extraer información del mensaje citado
      const quotedInfo = msg.message?.extendedTextMessage?.contextInfo;
      if (!quotedInfo?.stanzaId) {
        return reply('❌ Debes responder al mensaje que quieres eliminar.\n\nUso:\n.del\n.borrar\n.eliminar');
      }

      // 3. Determinar quién envió el mensaje a borrar y quién es el bot
      const botJid = cleanJid(sock.user.id) + '@s.whatsapp.net';
      const quotedParticipant = quotedInfo.participant ? cleanJid(quotedInfo.participant) + '@s.whatsapp.net' : remoteJid;
      const isOwnMessage = (quotedParticipant === botJid);

      // 4. Filtro de permisos del bot según el entorno
      if (fromGroup && !isOwnMessage) {
        // Consultar metadatos para saber si el bot es admin
        const groupMetadata = await sock.groupMetadata(remoteJid);
        const isBotAdmin = groupMetadata.participants.some(p => p.id === botJid && (p.admin === 'admin' || p.admin === 'superadmin'));

        if (!isBotAdmin) {
          return reply('❌ Para eliminar mensajes de otras personas, necesito ser administrador del grupo.');
        }
      }

      if (!fromGroup && !isOwnMessage) {
        return reply('❌ En chats privados solo puedo eliminar los mensajes enviados por mí.');
      }

      // 5. Crear la llave del mensaje a eliminar
      const deleteKey = {
        remoteJid: remoteJid,
        fromMe: isOwnMessage,
        id: quotedInfo.stanzaId,
        participant: quotedParticipant
      };

      // 6. Crear la llave de tu mensaje (el comando .del)
      const commandDeleteKey = {
        remoteJid: msg.key.remoteJid,
        fromMe: !!msg.key.fromMe,
        id: msg.key.id,
        participant: msg.key.participant
      };

      // 🔥 ACCIÓN: Borrar el mensaje objetivo
      await sock.sendMessage(remoteJid, { delete: deleteKey });

      // 🔥 ACCIÓN: Borrar el comando .del (con un ligero retraso para evitar bloqueos)
      setTimeout(async () => {
        try {
          await sock.sendMessage(remoteJid, { delete: commandDeleteKey });
        } catch (e) {
          console.log('⚠️ No se pudo borrar el comando:', e?.message || e);
        }
      }, 500);

    } catch (err) {
      console.log('❌ Error en plugin del:', err?.message || err);
      return reply('❌ Ocurrió un error y no se pudo eliminar el mensaje.');
    }
  }
};
