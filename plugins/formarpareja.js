'use strict';

module.exports = {
  name: 'formarpareja',
  aliases: ['pareja', 'ship', 'shippear', 'novios'],
  category: 'diversión',
  desc: 'Forma una pareja aleatoria entre los miembros del grupo',

  execute: async ({ sock, msg, remoteJid, sender, isGroup, db, reply }) => {
    try {
      // 🛡️ Validación estricta: Solo funciona en grupos
      if (!isGroup) {
        return reply('❌ Este comando es exclusivo para grupos.');
      }

      const metadata = await sock.groupMetadata(remoteJid);
      const participants = metadata.participants.map(p => p.id);

      if (participants.length < 2) {
        return reply('❌ No hay suficientes personas en el grupo para formar una pareja.');
      }

      // 🎲 Elegir 2 participantes distintos al azar
      const a = participants[Math.floor(Math.random() * participants.length)];
      let b;
      do {
        b = participants[Math.floor(Math.random() * participants.length)];
      } while (b === a);

      const userA = `@${a.split('@')[0]}`;
      const userB = `@${b.split('@')[0]}`;

      // 💬 DICCIONARIO DE FRASES
      const frases = [
        `💍 ${userA}, deberías casarte con ${userB}, hacen una buena pareja 💓`,
        `💘 ${userA} y ${userB} hacen una pareja perfecta 😍`,
        `🔥 Entre ${userA} y ${userB} hay una química innegable 👀`,
        `😏 ${userA}, no lo niegues… sabemos que ${userB} te gusta`,
        `💕 ${userA} + ${userB} = Amor confirmado 100% real no fake`,
        `🥰 ${userA} y ${userB} ya deberían estar juntos, el grupo lo pide`,
        `💓 Se siente la tensión romántica entre ${userA} y ${userB}`,
        `👀 Todos en el grupo sabemos que ${userA} y ${userB} hacen el match perfecto`,
        `💖 ${userA} por fin encontró a su media naranja: ${userB}`,
        `😳 ${userA} y ${userB}... esto ya es demasiado sospechoso`,
        `💒 ¡Paren todo! ${userA} y ${userB} nacieron el uno para el otro ✨`,
        `💞 El destino ha hablado: ${userA} y ${userB} son almas gemelas`,
        `🤭 ${userA} se pone nervioso/a cuando ${userB} escribe en el grupo`,
        `⚡ ${userA} y ${userB} harían la pareja más tóxica pero hermosa del grupo 😂`
      ];

      const mensaje = frases[Math.floor(Math.random() * frases.length)];

      await sock.sendMessage(remoteJid, {
        text: mensaje,
        mentions: [a, b]
      }, { quoted: msg });

      // ⭐ Bono de XP por interactuar
      if (db && typeof db.getUser === 'function') {
        const userData = await db.getUser(sender);
        if (userData) {
          userData.xp = (userData.xp || 0) + Math.floor(Math.random() * 11) + 5;
          if (userData.save) await userData.save();
        }
      }

    } catch (err) {
      console.log('❌ Error en plugin formarpareja:', err?.message || err);
      return reply('❌ Ocurrió un error al intentar formar la pareja. Asegúrate de que el bot sea administrador si el grupo tiene privacidad activada.');
    }
  }
};
