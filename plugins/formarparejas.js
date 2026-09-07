'use strict';

module.exports = {
  name: 'formarparejas',
  aliases: ['parejas5', 'topparejas', 'parejas'],
  category: 'diversión',
  desc: 'Genera el Top 5 de parejas aleatorias del grupo',

  execute: async ({ sock, msg, remoteJid, sender, db, reply }) => {
    try {
      // 🛡️ Validación estricta para grupos
      if (!remoteJid.endsWith('@g.us')) {
        return reply('❌ Este comando es exclusivo para grupos.');
      }

      const metadata = await sock.groupMetadata(remoteJid);
      const participants = metadata.participants.map(p => p.id);

      if (participants.length < 10) {
        return reply('❌ Se necesitan al menos 10 personas en el grupo para generar el Top 5 de parejas.');
      }

      // 🎲 Selección de 10 participantes únicos sin repetir
      let usados = new Set();
      let seleccion = [];

      while (seleccion.length < 10) {
        let user = participants[Math.floor(Math.random() * participants.length)];
        if (!usados.has(user)) {
          usados.add(user);
          seleccion.push(user);
        }
      }

      const toM = (a) => `@${a.split('@')[0]}`;

      // 🔥 DICCIONARIO DE FRASES
      const frases = [
        '💙✨ Están destinados a estar juntos 🔥💙',
        '😍💕 Parecen sacados de una película 🎬😍',
        '🔥😏 Aquí hay química peligrosa 👀🔥',
        '💍👀 Se casaron en secreto 💍👀',
        '🥵❤️‍🔥 Andan en luna de miel 🥵❤️‍🔥',
        '😳💞 Esto ya no es coincidencia 😳💞',
        '💖🌹 Amor puro, conexión real 💖🌹',
        '👀💘 Todo el grupo lo ve venir 👀💘',
        '😏🔥 Se traen ganas pero lo disimulan 😏🔥',
        '💑✨ Pareja estable nivel matrimonio 💑✨',
        '🤭💕 Se escriben en secreto 🤭💕',
        '💓👀 Miradas sospechosas detectadas 💓👀',
        '🔥🥀 Amor intenso pero peligroso 🔥🥀',
        '💘😌 Encajan perfectamente 💘😌',
        '🥰🌟 Son el uno para el otro 🥰🌟',
        '😈❤️ Relación prohibida pero interesante 😈❤️',
        '💋🔥 Mucha tensión… esto va a explotar 💋🔥',
        '💖👫 Relación seria en proceso 💖👫',
        '🥵💞 Aquí hay más que amistad 🥵💞',
        '🌹💍 Futuro juntos confirmado 🌹💍'
      ];

      function getRandomFrase() {
        return frases[Math.floor(Math.random() * frases.length)];
      }

      const texto = `*_😍🔥 TOP 5 PAREJAS DEL GRUPO 🔥😍_*

💘 *_1.- ${toM(seleccion[0])} y ${toM(seleccion[1])}_*
➤ ${getRandomFrase()}

💞 *_2.- ${toM(seleccion[2])} y ${toM(seleccion[3])}_*
➤ ${getRandomFrase()}

🔥 *_3.- ${toM(seleccion[4])} y ${toM(seleccion[5])}_*
➤ ${getRandomFrase()}

💍 *_4.- ${toM(seleccion[6])} y ${toM(seleccion[7])}_*
➤ ${getRandomFrase()}

🥵 *_5.- ${toM(seleccion[8])} y ${toM(seleccion[9])}_*
➤ ${getRandomFrase()}

━━━━━━━━━━━━━━━
💬 *El destino habló...* 😏✨`;

      // 🚀 Envío del top con sus respectivas menciones azules
      await sock.sendMessage(remoteJid, {
        text: texto,
        mentions: seleccion
      }, { quoted: msg });

      // ⭐ Bono de XP para quien ejecute el comando
      if (db && typeof db.getUser === 'function') {
        const userData = await db.getUser(sender);
        if (userData) {
          userData.xp = (userData.xp || 0) + Math.floor(Math.random() * 11) + 5;
          if (userData.save) await userData.save();
        }
      }

    } catch (err) {
      console.log('❌ Error en plugin formarparejas:', err?.message || err);
      return reply('❌ Ocurrió un error al generar el top de parejas.');
    }
  }
};
