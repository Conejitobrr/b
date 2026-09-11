'use strict';

const axios = require('axios');

module.exports = {
  name: 'letra',
  aliases: ['lyrics', 'cancionletra'],
  category: 'multimedia',
  desc: 'Busca la letra de cualquier canción usando un motor anti-bloqueos (OVH)',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    if (!args.length) {
      return reply('❌ Escribe el nombre de la canción.\n📌 *Ejemplo:* .letra mujer amante rata blanca');
    }

    const query = args.join(' ');
    const loadMsg = await sock.sendMessage(remoteJid, { text: `🔍 _Buscando en bases de datos abiertas: *${query}*..._` }, { quoted: msg });

    try {
      // 1️⃣ BÚSQUEDA INICIAL (Obtiene el nombre oficial, artista y portada)
      const searchRes = await axios.get(`https://api.lyrics.ovh/suggest/${encodeURIComponent(query)}`);
      const results = searchRes.data.data;

      if (!results || results.length === 0) {
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        return reply('❌ No se encontró ninguna canción con ese nombre en los registros globales.');
      }

      // Tomamos el resultado más exacto
      const mejorResultado = results[0];
      const artist = mejorResultado.artist.name;
      const title = mejorResultado.title;
      const cover = mejorResultado.album.cover_xl || mejorResultado.album.cover_medium || 'https://i.imgur.com/39aMpwD.png';

      // 2️⃣ EXTRACCIÓN DE LA LETRA (Ruta directa anti-bloqueos)
      const lyricsRes = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
      let lyrics = lyricsRes.data.lyrics;

      if (!lyrics) {
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        return reply('❌ Encontré la canción, pero la letra aún no está transcrita.');
      }

      // Limpieza de texto promocional que a veces incluye la API
      lyrics = lyrics.replace(/Paroles de la chanson.*?\r?\n/i, '').trim();

      const textoFinal = `🎤 *${title}*\n👤 *Artista:* ${artist}\n\n${lyrics}`;

      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      
      // 3️⃣ ENVÍO DEL RESULTADO
      await sock.sendMessage(remoteJid, { 
        image: { url: cover }, 
        caption: textoFinal 
      }, { quoted: msg });

    } catch (error) {
      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      
      // Si la API devuelve 404 en el segundo paso, la canción existe pero no hay letra
      if (error.response && error.response.status === 404) {
         return reply('❌ Encontré la canción, pero no hay registros de su letra en la base de datos.');
      }
      
      console.error("❌ Error en comando letra:", error.message);
      return reply('❌ Ocurrió un error de red al intentar descargar la letra. Intenta nuevamente.');
    }
  }
};
