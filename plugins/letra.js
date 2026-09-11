'use strict';

const axios = require('axios');

// 🛡️ CAMUFLAJE: Falsificamos un navegador real para que Apple, Genius y LRCLIB no bloqueen tu Termux
const headers = { 
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' 
};

module.exports = {
  name: 'letra',
  aliases: ['lyrics', 'cancionletra'],
  category: 'multimedia',
  desc: 'Busca la letra con sistema blindado anti-bloqueos',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    if (!args.length) {
      return reply('❌ Escribe el nombre de la canción.\n📌 *Ejemplo:* .letra mujer amante rata blanca');
    }

    const query = args.join(' ');
    const loadMsg = await sock.sendMessage(remoteJid, { text: `🔍 _Analizando bases de datos: *${query}*..._` }, { quoted: msg });

    let lyrics = '';
    let title = '';
    let artist = '';
    let cover = '';

    try {
      // 🚀 MOTOR 1: LRCLIB (Prioridad: Idioma original, letras exactas)
      const lrcRes = await axios.get(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`, { headers });
      if (lrcRes.data && lrcRes.data.length > 0 && lrcRes.data[0].plainLyrics) {
        lyrics = lrcRes.data[0].plainLyrics;
        title = lrcRes.data[0].trackName;
        artist = lrcRes.data[0].artistName;
      }
    } catch (e) {
      console.log('⚠️ Motor 1 no respondió, pasando al Motor 2...');
    }

    // 🚀 MOTOR 2: RESPALDO (Si LRCLIB no tiene la letra o bloqueó la conexión)
    if (!lyrics) {
      try {
        const fallbackRes = await axios.get(`https://some-random-api.com/lyrics?title=${encodeURIComponent(query)}`, { headers });
        if (fallbackRes.data && fallbackRes.data.lyrics) {
          lyrics = fallbackRes.data.lyrics;
          title = fallbackRes.data.title;
          artist = fallbackRes.data.author;
          cover = fallbackRes.data.thumbnail?.genius; // Este motor ya nos da una portada
        }
      } catch (e) {
        console.log('⚠️ Motor 2 no respondió.');
      }
    }

    // Si ambos motores fallaron
    if (!lyrics) {
      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      return reply('❌ No pude encontrar la letra en ninguno de los servidores oficiales.');
    }

    // 🎨 BÚSQUEDA DE PORTADA (Si el Motor 1 no nos dio imagen)
    if (!cover) {
      try {
        const itunesRes = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(artist + ' ' + title)}&entity=song&limit=1`, { headers });
        if (itunesRes.data.results.length > 0) {
          cover = itunesRes.data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
        } else {
          cover = 'https://i.imgur.com/39aMpwD.png'; // Imagen por defecto
        }
      } catch (e) {
        cover = 'https://i.imgur.com/39aMpwD.png';
      }
    }

    // 📥 DESCARGA SEGURA EN RAM (Aquí prevenimos el Error 429 de Baileys)
    let imageBuffer = null;
    try {
      const imgDownload = await axios.get(cover, { responseType: 'arraybuffer', headers });
      imageBuffer = Buffer.from(imgDownload.data);
    } catch (e) {
      console.log('⚠️ Error al descargar la portada. Se enviará solo el texto.');
    }

    const textoFinal = `🎤 *${title}*\n👤 *Artista:* ${artist}\n\n${lyrics}`;
    await sock.sendMessage(remoteJid, { delete: loadMsg.key });

    // 📤 ENVÍO FINAL (A prueba de balas)
    try {
      if (imageBuffer) {
        // Si la imagen descargó bien, mandamos foto + texto
        await sock.sendMessage(remoteJid, { 
          image: imageBuffer, 
          caption: textoFinal 
        }, { quoted: msg });
      } else {
        // Si Apple bloqueó la imagen, mandamos solo el texto para no dejar al usuario en visto
        await sock.sendMessage(remoteJid, { 
          text: `[Sin Portada]\n\n${textoFinal}` 
        }, { quoted: msg });
      }
    } catch (sendError) {
      console.error("❌ Error interno de WhatsApp al enviar:", sendError.message);
      
      // PREVENCIÓN FINAL: Si la letra es demasiado larga y WhatsApp la rechaza
      if (sendError.message.includes('413') || sendError.message.includes('too large')) {
        const textoCorto = textoFinal.substring(0, 3500) + '...\n\n_[Letra cortada por límite de caracteres de WhatsApp]_';
        return sock.sendMessage(remoteJid, { text: textoCorto }, { quoted: msg });
      }
      
      return reply('❌ Ocurrió un error al procesar el mensaje en WhatsApp.');
    }
  }
};
