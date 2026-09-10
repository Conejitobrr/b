'use strict';

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// 🔑 API TOKEN (Opcional)
// AudD te regala algunas búsquedas gratis. Si tu grupo lo usa demasiado y se acaba el límite,
// puedes ir a https://audd.io/, registrarte gratis en 1 minuto y poner tu token aquí:
const AUDD_TOKEN = ''; 

module.exports = {
  name: 'shazam',
  aliases: ['cancion', 'quees', 'musica', 'buscarcancion'],
  category: 'multimedia',
  desc: 'Identifica qué canción está sonando en un video o audio',

  execute: async ({ sock, msg, remoteJid, reply }) => {
    try {
      // 1. VERIFICAR QUE SE ESTÉ RESPONDIENDO A UN AUDIO O VIDEO
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted) {
        return reply('❌ *Debes responder a un audio o video corto.*\n📌 Ejemplo: Responde a un video de TikTok con el comando *.shazam*');
      }

      const isVideo = quoted.videoMessage;
      const isAudio = quoted.audioMessage;

      if (!isVideo && !isAudio) {
        return reply('❌ *Formato inválido.* Solo puedo escuchar audios o videos.');
      }

      // ⏳ Mostrar que el bot está "escuchando"
      const loadMsg = await sock.sendMessage(remoteJid, { text: '🎧 _Escuchando el audio... procesando frecuencias..._' }, { quoted: msg });

      // 2. DESCARGAR EL ARCHIVO DE WHATSAPP
      const messageType = isVideo ? 'videoMessage' : 'audioMessage';
      const stream = await downloadContentFromMessage(quoted[messageType], isVideo ? 'video' : 'audio');
      
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // 3. RUTAS TEMPORALES EN TERMUX
      const tmpDir = path.join(process.cwd(), 'tmp');
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

      const randomName = crypto.randomBytes(6).toString('hex');
      const inPath = path.join(tmpDir, `${randomName}.${isVideo ? 'mp4' : 'ogg'}`);
      const outPath = path.join(tmpDir, `${randomName}.mp3`);

      fs.writeFileSync(inPath, buffer);

      // 4. CONVERTIR / EXTRAER AUDIO A MP3 CON FFMPEG
      await new Promise((resolve, reject) => {
        // Extraemos solo el audio (-vn), lo pasamos a mp3 con calidad decente
        exec(`ffmpeg -i "${inPath}" -vn -acodec libmp3lame -ab 128k -ar 44100 "${outPath}" -y`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // 5. ENVIAR A LA API DE RECONOCIMIENTO (AudD)
      const form = new FormData();
      form.append('file', fs.createReadStream(outPath));
      if (AUDD_TOKEN) form.append('api_token', AUDD_TOKEN);
      form.append('return', 'spotify'); // Para obtener portada si es posible

      const auddRes = await axios.post('https://api.audd.io/', form, {
        headers: form.getHeaders()
      });

      // 6. LIMPIAR BASURA TEMPORAL (¡Súper importante para no llenar tu celular!)
      try {
        if (fs.existsSync(inPath)) fs.unlinkSync(inPath);
        if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
      } catch (e) {}

      // 7. LEER RESULTADOS Y ENVIAR AL GRUPO
      const result = auddRes.data;

      if (result.status === 'error') {
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        if (result.error.error_code === 901) {
          return reply('❌ *Límite alcanzado.* El sistema se quedó sin búsquedas gratis por hoy. El Owner debe poner un Token de AudD en el código.');
        }
        return reply('❌ No pude escuchar bien o la canción no existe en la base de datos mundial.');
      }

      if (!result.result) {
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        return reply('🤔 Lo siento, escuché el audio pero no logré identificar ninguna canción conocida.');
      }

      const cancion = result.result;
      
      // 🎨 8. DISEÑO DEL REPORTE MUSICAL
      const textoShazam = `╭─── « 🎵 𝗦𝗜𝗥𝗜𝗨𝗦 𝗦𝗛𝗔𝗭𝗔𝗠 » ───
│
│ 👤 *Artista:* ${cancion.artist}
│ 💿 *Título:* ${cancion.title}
│ 📀 *Álbum:* ${cancion.album || 'Desconocido'}
│ 📅 *Lanzamiento:* ${cancion.release_date || 'Desconocido'}
│
╰──────────────────────────────
_🔗 Tip: Usa .play ${cancion.title} para descargarla_`;

      // Si la API nos devuelve portada de Spotify, la mandamos con imagen
      let imagenPortada = null;
      if (cancion.spotify && cancion.spotify.album && cancion.spotify.album.images && cancion.spotify.album.images[0]) {
        imagenPortada = cancion.spotify.album.images[0].url;
      }

      await sock.sendMessage(remoteJid, { delete: loadMsg.key });

      if (imagenPortada) {
        await sock.sendMessage(remoteJid, { image: { url: imagenPortada }, caption: textoShazam }, { quoted: msg });
      } else {
        await reply(textoShazam);
      }

    } catch (err) {
      console.log('❌ Error en plugin shazam:', err);
      return reply('❌ Ocurrió un error al intentar procesar el audio. Asegúrate de que el video o audio no sea demasiado pesado.');
    }
  }
};
