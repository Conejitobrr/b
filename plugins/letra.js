'use strict';

const axios = require('axios');

// Camuflaje para evitar bloqueos
const headers = { 
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' 
};

module.exports = {
  name: 'letra',
  aliases: ['lyrics', 'cancionletra'],
  category: 'multimedia',
  desc: 'Busca la letra completa evadiendo el límite de caracteres de WhatsApp',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    if (!args.length) {
      return reply('❌ Escribe el nombre de la canción.\n📌 *Ejemplo:* .letra baile inolvidable');
    }

    const query = args.join(' ');
    const loadMsg = await sock.sendMessage(remoteJid, { text: `🔍 _Analizando bases de datos: *${query}*..._` }, { quoted: msg });

    let lyrics = '';
    let title = '';
    let artist = '';
    let cover = '';

    try {
      // MOTOR 1: LRCLIB (Letras originales exactas)
      const lrcRes = await axios.get(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`, { headers });
      if (lrcRes.data && lrcRes.data.length > 0 && lrcRes.data[0].plainLyrics) {
        lyrics = lrcRes.data[0].plainLyrics;
        title = lrcRes.data[0].trackName;
        artist = lrcRes.data[0].artistName;
      }
    } catch (e) {
      console.log('⚠️ Falló Motor 1');
    }

    // MOTOR 2: RESPALDO
    if (!lyrics) {
      try {
        const fallbackRes = await axios.get(`https://some-random-api.com/lyrics?title=${encodeURIComponent(query)}`, { headers });
        if (fallbackRes.data && fallbackRes.data.lyrics) {
          lyrics = fallbackRes.data.lyrics;
          title = fallbackRes.data.title;
          artist = fallbackRes.data.author;
          cover = fallbackRes.data.thumbnail?.genius; 
        }
      } catch (e) {
        console.log('⚠️ Falló Motor 2');
      }
    }

    if (!lyrics) {
      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      return reply('❌ No pude encontrar la letra en los servidores.');
    }

    // BÚSQUEDA DE PORTADA 
    if (!cover) {
      try {
        const itunesRes = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(artist + ' ' + title)}&entity=song&limit=1`, { headers });
        if (itunesRes.data.results.length > 0) {
          cover = itunesRes.data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
        } else {
          cover = 'https://i.imgur.com/39aMpwD.png'; 
        }
      } catch (e) {
        cover = 'https://i.imgur.com/39aMpwD.png';
      }
    }

    // DESCARGA DE IMAGEN
    let imageBuffer = null;
    try {
      const imgDownload = await axios.get(cover, { responseType: 'arraybuffer', headers });
      imageBuffer = Buffer.from(imgDownload.data);
    } catch (e) {
      console.log('⚠️ Error al descargar portada.');
    }

    await sock.sendMessage(remoteJid, { delete: loadMsg.key });

    const infoCortada = `🎤 *${title}*\n👤 *Artista:* ${artist}`;

    try {
      // PASO 1: Enviar solo la portada con el nombre de la canción
      let msgImagen;
      if (imageBuffer) {
        msgImagen = await sock.sendMessage(remoteJid, { 
          image: imageBuffer, 
          caption: infoCortada 
        }, { quoted: msg });
      } else {
        msgImagen = await sock.sendMessage(remoteJid, { 
          text: infoCortada 
        }, { quoted: msg });
      }

      // PASO 2: Enviar la letra completa como mensaje de texto independiente respondiendo a la foto
      await sock.sendMessage(remoteJid, { 
        text: lyrics 
      }, { quoted: msgImagen });

    } catch (sendError) {
      console.error("❌ Error de envío:", sendError.message);
      return reply('❌ Ocurrió un error al enviar la letra.');
    }
  }
};
