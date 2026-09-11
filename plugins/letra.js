'use strict';

const axios = require('axios');

module.exports = {
  name: 'letra',
  aliases: ['lyrics', 'cancionletra'],
  category: 'multimedia',
  desc: 'Busca la letra completa usando un servidor Proxy en EE.UU.',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    if (args.length === 0) {
      return reply('❌ Escribe el nombre de la canción.\n📌 *Ejemplo:* .letra nunca me olvides');
    }

    const query = args.join(' ');
    const loadMsg = await sock.sendMessage(remoteJid, { text: `🔍 _Conectando a servidores externos: *${query}*..._` }, { quoted: msg });

    try {
      // 🌐 EL PUENTE: Esta API de USA hace la búsqueda por nosotros, saltándose el bloqueo de región.
      const res = await axios.get(`https://some-random-api.com/lyrics?title=${encodeURIComponent(query)}`);
      const data = res.data;

      if (!data || !data.lyrics) {
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        return reply('❌ No se encontró la letra.');
      }

      // Armamos la estructura de la respuesta
      const textoFinal = `🎤 *${data.title}*\n👤 *Artista:* ${data.author}\n\n${data.lyrics}`;

      // Extraemos la portada oficial del álbum desde Genius a través del puente
      const imagenAlbum = data.thumbnail?.genius || 'https://i.imgur.com/39aMpwD.png';

      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      
      // Enviamos la imagen junto con la letra
      await sock.sendMessage(remoteJid, { 
        image: { url: imagenAlbum }, 
        caption: textoFinal 
      }, { quoted: msg });

    } catch (error) {
      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      console.error("❌ Error en comando letra:", error.message);
      
      // Si el servidor puente no encuentra nada, avisa al usuario
      return reply('❌ No pude encontrar esa canción. Intenta escribir el nombre junto al del artista (Ej: .letra nunca me olvides yandel).');
    }
  }
};
