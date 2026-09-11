'use strict';

const axios = require('axios');

module.exports = {
  name: 'letra',
  aliases: ['lyrics', 'cancionletra'],
  category: 'multimedia',
  desc: 'Busca la letra oficial de una canción en su idioma original',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    if (!args.length) {
      return reply('❌ Escribe el nombre de la canción.\n📌 *Ejemplo:* .letra talisman rata blanca');
    }

    const query = args.join(' ');
    const loadMsg = await sock.sendMessage(remoteJid, { text: `🔍 _Extrayendo letras oficiales de: *${query}*..._` }, { quoted: msg });

    try {
      // 1️⃣ OBTENER LETRA (LRCLIB API - Idioma Original, Cero Bloqueos)
      const lrcRes = await axios.get(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
      const tracks = lrcRes.data;

      // Verificamos que exista la canción y que tenga letra en texto plano
      if (!tracks || tracks.length === 0 || !tracks[0].plainLyrics) {
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        return reply('❌ Encontré la canción, pero su letra no está disponible en la base de datos oficial.');
      }

      // Extraemos los metadatos más exactos (el primer resultado)
      const mejorLetra = tracks[0];
      const artist = mejorLetra.artistName;
      const title = mejorLetra.trackName;
      const lyrics = mejorLetra.plainLyrics;

      // 2️⃣ OBTENER PORTADA HD (Apple iTunes API - Libre y Segura)
      let cover = 'https://i.imgur.com/39aMpwD.png'; // Imagen por defecto en caso de emergencia
      try {
        const itunesRes = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(artist + ' ' + title)}&entity=song&limit=1`);
        if (itunesRes.data.results.length > 0) {
          // Reemplazamos la miniatura de 100px por la versión HD de 600px
          cover = itunesRes.data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
        }
      } catch (e) {
        console.log("⚠️ Falló la carga de portada de iTunes, usando imagen por defecto.");
      }

      const textoFinal = `🎤 *${title}*\n👤 *Artista:* ${artist}\n\n${lyrics}`;

      await sock.sendMessage(remoteJid, { delete: loadMsg.key });

      // 3️⃣ ENVIAR PORTADA Y LETRA
      await sock.sendMessage(remoteJid, { 
        image: { url: cover }, 
        caption: textoFinal 
      }, { quoted: msg });

    } catch (error) {
      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      console.error("❌ Error en comando letra:", error.message);
      return reply('❌ Ocurrió un error al intentar descargar la letra. Verifica tu conexión a internet.');
    }
  }
};
