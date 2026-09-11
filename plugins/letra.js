'use strict';

const { Client } = require("genius-lyrics");
const genius = new Client();

module.exports = {
  name: 'letra',
  aliases: ['lyrics', 'cancionletra'],
  category: 'multimedia',
  desc: 'Busca la letra completa de una canción en Genius',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    if (args.length === 0) {
      return reply('❌ Escribe el nombre de la canción.\n📌 *Ejemplo:* .letra Ojitos Lindos');
    }

    const query = args.join(' ');
    const loadMsg = await sock.sendMessage(remoteJid, { text: `🔍 _Buscando en Genius: *${query}*..._` }, { quoted: msg });

    try {
      // 1. Buscamos en la base de datos masiva
      const searches = await genius.songs.search(query);
      
      if (!searches || searches.length === 0) {
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        return reply('❌ No pude encontrar esa canción en los registros de Genius.');
      }

      // 2. Tomamos el resultado más exacto
      const mejorResultado = searches[0];
      const lyrics = await mejorResultado.lyrics();
      
      if (!lyrics) {
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        return reply('❌ Encontré la canción, pero la letra aún no ha sido transcrita.');
      }

      // 3. Armamos el mensaje oficial
      const textoFinal = `🎤 *${mejorResultado.title}*\n👤 *Artista:* ${mejorResultado.artist.name}\n\n${lyrics}`;

      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      
      // 4. Enviamos la imagen del álbum con la letra
      await sock.sendMessage(remoteJid, { 
        image: { url: mejorResultado.image }, 
        caption: textoFinal 
      }, { quoted: msg });

    } catch (error) {
      console.error("❌ Error en plugin de Genius:", error.message);
      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      return reply('❌ Ocurrió un error al intentar extraer la letra.');
    }
  }
};
