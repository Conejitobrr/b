'use strict';

function cleanJid(jid = '') { return String(jid).split(':')[0]; }

module.exports = {
  name: 'del',
  aliases: ['delete', 'borrar', 'eliminar'],
  category: 'administración',
  desc: 'Elimina un mensaje (y borra el comando automáticamente)',

  execute: async ({ sock, msg, remoteJid, sender, fromGroup, isAdmin, isOwner, db, reply }) => {
    try {
      // 1. Verificación de permisos del usuario (Owner, Admin o Premium)
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

      // 3. Determinar IDs (bot y citado)
      const botJid = cleanJid(sock.user.id) + '@s.whatsapp.net';
      const quotedParticipant = quotedInfo.participant ? cleanJid(quotedInfo.participant) + '@s.whatsapp.net' : remoteJid;
      const isOwnMessage = (quotedParticipant === botJid);

      if (!fromGroup && !isOwnMessage) {
        return reply('❌ En chats privados solo puedo eliminar los mensajes enviados por mí.');
      }

      // 4. Llaves de eliminación
      const deleteKey = {
        remoteJid: remoteJid,
        fromMe: isOwnMessage,
        id: quotedInfo.stanzaId,
        participant: quotedParticipant
      };

      const commandDeleteKey = {
        remoteJid: msg.key.remoteJid,
        fromMe: !!msg.key.fromMe,
        id: msg.key.id,
        participant: msg.key.participant
      };

      // 🔥 FUERZA BRUTA: Ejecutar eliminación sin consultar metadata defectuosa
      try {
        await sock.sendMessage(remoteJid, { delete: deleteKey });
      } catch (deleteErr) {
        console.log('Error al intentar borrar el mensaje:', deleteErr?.message);
        return reply('❌ No pude eliminar el mensaje.\n\nPosibles causas:\n* No soy administrador.\n* El mensaje es demasiado antiguo.');
      }

      // 🔥 Borrar el comando .del (Retraso de medio segundo para fluidez)
      setTimeout(async () => {
        try {
          await sock.sendMessage(remoteJid, { delete: commandDeleteKey });
        } catch (e) {
          console.log('⚠️ No se pudo borrar el comando:', e?.message || e);
        }
      }, 500);

    } catch (err) {
      console.log('❌ Error en plugin del:', err?.message || err);
      return reply('❌ Ocurrió un error inesperado al procesar la solicitud.');
    }
  }
};
