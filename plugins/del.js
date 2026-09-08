'use strict';

function getPureJid(jid = '') {
  const str = String(jid);
  if (!str) return '';
  const num = str.split('@')[0].replace(/\D/g, '');
  return `${num}@s.whatsapp.net`;
}

// 🔥 Función blindada de intentos múltiples para asegurar el borrado
async function tryDeleteMessage(sock, remoteJid, key) {
  const attempts = [
    key,
    { ...key, fromMe: true },
    { ...key, fromMe: false }
  ];

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
  desc: 'Elimina primero el mensaje seleccionado y luego el comando',

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

      // 2. Obtener la ID del mensaje al que respondiste
      const quotedInfo = msg.message?.extendedTextMessage?.contextInfo;
      if (!quotedInfo?.stanzaId) {
        return reply('❌ Debes responder al mensaje que quieres eliminar.\n\n📌 Uso:\n*.del*');
      }

      const botJid = getPureJid(sock.user.id);
      const isFromMe = quotedInfo.fromMe === true;
      const quotedParticipant = quotedInfo.participant ? getPureJid(quotedInfo.participant) : (isFromMe ? botJid : remoteJid);
      const isOwnMessage = isFromMe || (quotedParticipant === botJid);

      if (!fromGroup && !isOwnMessage) {
        return reply('❌ En chats privados solo puedo eliminar los mensajes enviados por mí.');
      }

      // 3. Llave del mensaje objetivo a eliminar
      const targetKey = {
        remoteJid: remoteJid,
        id: quotedInfo.stanzaId,
        participant: quotedInfo.participant || (isOwnMessage ? botJid : undefined),
        fromMe: isFromMe
      };

      // 4. Llave del comando (.del)
      const commandKey = {
        remoteJid: msg.key.remoteJid,
        id: msg.key.id,
        participant: msg.key.participant,
        fromMe: !!msg.key.fromMe
      };

      // 💥 5. ELIMINAR PRIMERO EL MENSAJE SELECCIONADO (Con Await estricto)
      try {
        await tryDeleteMessage(sock, remoteJid, targetKey);
      } catch (deleteErr) {
        console.log('❌ Error al borrar el objetivo:', deleteErr?.message);
        return reply('❌ No pude eliminar el mensaje. Es posible que sea demasiado antiguo o que WhatsApp haya rechazado la acción.');
      }

      // Pequeña pausa de 300ms para mantener el orden secuencial en los servidores de WhatsApp
      await new Promise(resolve => setTimeout(resolve, 300));

      // 💥 6. ELIMINAR DESPUÉS EL MENSAJE DEL COMANDO (.del)
      try {
        await tryDeleteMessage(sock, remoteJid, commandKey);
      } catch (e) {
        console.log('⚠️ No se pudo borrar el comando:', e?.message || e);
      }

    } catch (err) {
      console.log('❌ Error en plugin del:', err?.message || err);
      return reply('❌ Ocurrió un error inesperado al procesar la solicitud.');
    }
  }
};
