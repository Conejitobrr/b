'use strict';

const axios = require('axios');

module.exports = {
  name: 'letra',
  aliases: ['lyrics', 'cancionletra'],
  category: 'multimedia',
  desc: 'Busca la letra completa de cualquier canción',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    if (args.length === 0) {
      return reply('❌ Escribe el nombre de la canción.\n📌 *Ejemplo:* .letra baile inolvidable');
    }

    const query = args.join(' ');
    const loadMsg = await sock.sendMessage(remoteJid, { text: `🔍 _Buscando en los registros: *${query}*..._` }, { quoted: msg });

    try {
      // 1. Conectamos a la API de Popcat (Busca en Genius automáticamente)
      const res = await axios.get(`https://api.popcat.xyz/lyrics?song=${encodeURIComponent(query)}`);
      const data = res.data;

      // Si la API no encuentra la letra, envía un error 404 que cae en el catch
      if (!data.lyrics) {
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        return reply('❌ Encontré la canción, pero la letra aún no está disponible.');
      }

      // 2. Armamos el mensaje oficial
      const textoFinal = `🎤 *${data.title}*\n👤 *Artista:* ${data.artist}\n\n${data.lyrics}`;

      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      
      // 3. Enviamos la imagen del álbum con la letra en la descripción
      await sock.sendMessage(remoteJid, { 
        image: { url: data.image }, 
        caption: textoFinal 
      }, { quoted: msg });

    } catch (error) {
      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      console.error("❌ Error en comando letra:", error.message);
      
      // Si el error es 404, significa que la búsqueda no arrojó nada
      if (error.response && error.response.status === 404) {
         return reply('❌ No pude encontrar esa canción. Intenta escribir el nombre junto al del artista (Ej: .letra baile inolvidable bad bunny).');
      }
      
      return reply('❌ Ocurrió un error de conexión al intentar extraer la letra.');
    }
  }
};
