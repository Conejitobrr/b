'use strict';

// 🔥 Función blindada: Extrae solo los números y crea el ID perfecto sin duplicar terminaciones
function getPureJid(jid = '') {
  const str = String(jid);
  if (!str) return '';
  const num = str.split('@')[0].replace(/\D/g, '');
  return `${num}@s.whatsapp.net`;
}

// 🔥 Función agresiva de tu código original para forzar el borrado
async function tryDeleteMessage(sock, remoteJid, key, isOwnMessage) {
  const attempts = isOwnMessage
    ? [ { ...key, fromMe: true }, { ...key, fromMe: false } ]
    : [ { ...key, fromMe: false } ];

  let lastError = null;
  for (const deleteKey of attempts) {
    try {
      await sock.sendMessage(remoteJid, { delete: deleteKey });
      return true;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('No se pudo eliminar el mensaje.');
}

module.exports = {
  name: 'del',
  aliases: ['delete', 'borrar', 'eliminar'],
  category: 'administración',
  desc: 'Elimina un mensaje (y borra el comando automáticamente)',

  execute: async ({ sock, msg, remoteJid, sender, fromGroup, isAdmin, isOwner, db, reply }) => {
    try {
      // 1. Verificación de permisos
      let isPremium = false;
      if (db && typeof db.getUser === 'function') {
        const user = await db.getUser(sender);
        isPremium = user?.premium === true || Number(user?.premiumUntil || 0) > Date.now();
      }

      if (!isOwner && !isAdmin && !isPremium) {
        return reply('❌ Solo los administradores, owner o usuarios premium pueden usar este comando.');
      }

      // 2. Obtener la ID del mensaje al que respondiste
      const quotedInfo = msg.message?.extendedTextMessage?.contextInfo;
      if (!quotedInfo?.stanzaId) {
        return reply('❌ Debes responder al mensaje que quieres eliminar.\n\nUso:\n.del\n.borrar\n.eliminar');
      }

      // 3. Crear los JIDs matemáticamente perfectos
      const botJid = getPureJid(sock.user.id);
      const quotedParticipant = quotedInfo.participant ? getPureJid(quotedInfo.participant) : remoteJid;
      const isOwnMessage = (quotedParticipant === botJid);

      if (!fromGroup && !isOwnMessage) {
        return reply('❌ En chats privados solo puedo eliminar los mensajes enviados por mí.');
      }

      // 4. Llave del mensaje objetivo a eliminar
      const targetKey = {
        remoteJid: remoteJid,
        id: quotedInfo.stanzaId,
        participant: quotedParticipant
      };

      // 5. Llave de tu comando (.del)
      const commandKey = {
        remoteJid: msg.key.remoteJid,
        id: msg.key.id,
        participant: msg.key.participant
      };

      // 💥 6. Ejecutar borrado del mensaje citado usando fuerza bruta
      try {
        await tryDeleteMessage(sock, remoteJid, targetKey, isOwnMessage);
      } catch (deleteErr) {
        console.log('Error al borrar el objetivo:', deleteErr?.message);
        return reply('❌ No pude eliminar el mensaje. Es posible que sea demasiado antiguo o que WhatsApp haya rechazado la acción.');
      }

      // 💥 7. Auto-eliminar tu comando (.del)
      setTimeout(async () => {
        try {
          await tryDeleteMessage(sock, remoteJid, commandKey, !!msg.key.fromMe);
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
