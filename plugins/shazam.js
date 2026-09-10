'use strict';

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// 🔑 API TOKEN (Opcional pero recomendado si tu grupo es muy activo)
// AudD regala búsquedas gratis. Si se acaban, regístrate en audd.io y pon tu token aquí:
const AUDD_TOKEN = ''; 

module.exports = {
  name: 'shazam',
  aliases: ['cancion', 'quees', 'musica', 'buscarcancion'],
  category: 'multimedia',
  desc: 'Identifica qué canción está sonando en un video o audio',

  execute: async ({ sock, msg, remoteJid, reply }) => {
    try {
      // 1. Verificar que estén respondiendo a un archivo multimedia
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted) {
        return reply('❌ *Falta el archivo.*\n📌 Ejemplo: Responde a un video corto o nota de voz con *.shazam*');
      }

      const isVideo = quoted.videoMessage;
      const isAudio = quoted.audioMessage;

      if (!isVideo && !isAudio) {
        return reply('❌ *Formato inválido.* Solo puedo analizar audios o videos.');
      }

      const loadMsg = await sock.sendMessage(remoteJid, { text: '🎧 _Procesando frecuencias musicales..._' }, { quoted: msg });

      // 2. Descargar el archivo desde WhatsApp
      const messageType = isVideo ? 'videoMessage' : 'audioMessage';
      const stream = await downloadContentFromMessage(quoted[messageType], isVideo ? 'video' : 'audio');
      
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // 3. Crear archivos temporales seguros
      const tmpDir = path.join(process.cwd(), 'tmp');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      const randomName = crypto.randomBytes(6).toString('hex');
      const inPath = path.join(tmpDir, `${randomName}.${isVideo ? 'mp4' : 'ogg'}`);
      const outPath = path.join(tmpDir, `${randomName}.mp3`);

      fs.writeFileSync(inPath, buffer);

      // 4. Convertir y extraer solo el audio en MP3 usando FFmpeg
      await new Promise((resolve, reject) => {
        exec(`ffmpeg -i "${inPath}" -vn -acodec libmp3lame -ab 128k -ar 44100 "${outPath}" -y`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // 5. Enviar el audio MP3 a la API de AudD
      const form = new FormData();
      form.append('file', fs.createReadStream(outPath));
      if (AUDD_TOKEN) form.append('api_token', AUDD_TOKEN);
      form.append('return', 'spotify'); 

      const auddRes = await axios.post('https://api.audd.io/', form, {
        headers: form.getHeaders()
      });

      // 6. Eliminar la basura para no llenar la memoria del celular
      try {
        if (fs.existsSync(inPath)) fs.unlinkSync(inPath);
        if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
      } catch (e) {}

      const result = auddRes.data;

      // 7. Manejo de Errores y Resultados
      if (result.status === 'error') {
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        if (result.error.error_code === 901) {
          return reply('❌ *Límite global alcanzado.* El sistema se quedó sin búsquedas gratis por hoy.');
        }
        return reply('❌ No pude escuchar bien o la canción no existe en la base de datos.');
      }

      if (!result.result) {
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        return reply('🤔 Lo siento, escuché el audio pero no logré identificar ninguna canción conocida.');
      }

      const cancion = result.result;
      
      // 🎨 8. Diseño Visual del Reporte
      const textoShazam = `╭─── « 🎵 𝗦𝗜𝗥𝗜𝗨𝗦 𝗦𝗛𝗔𝗭𝗔𝗠 » ───
│
│ 👤 *Artista:* ${cancion.artist}
│ 💿 *Título:* ${cancion.title}
│ 📀 *Álbum:* ${cancion.album || 'Desconocido'}
│ 📅 *Lanzamiento:* ${cancion.release_date || 'Desconocido'}
│
╰──────────────────────────────
_🔗 Tip: Usa .play ${cancion.title} para descargarla_`;

      // Extraer la portada de Spotify si está disponible
      let imagenPortada = null;
      if (cancion.spotify?.album?.images?.[0]) {
        imagenPortada = cancion.spotify.album.images[0].url;
      }

      await sock.sendMessage(remoteJid, { delete: loadMsg.key });

      if (imagenPortada) {
        await sock.sendMessage(remoteJid, { image: { url: imagenPortada }, caption: textoShazam }, { quoted: msg });
      } else {
        await reply(textoShazam);
      }

    } catch (err) {
      console.log('❌ Error en shazam:', err);
      return reply('❌ Ocurrió un error interno. Asegúrate de que el audio no sea demasiado pesado (máx. 15 segundos recomendado).');
    }
  }
};
