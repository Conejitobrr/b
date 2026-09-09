'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const execFileAsync = promisify(execFile);
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

module.exports = {
  name: 'tomp3',
  aliases: ['toaudio', 'mp3', 'audio'],
  category: 'multimedia',
  desc: 'Extrae el audio de un video o convierte una nota de voz a MP3',

  execute: async ({ sock, msg, remoteJid, reply }) => {
    let inputMedia = null;
    let outputMp3 = null;

    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      const isVideo = quoted?.videoMessage;
      const isAudio = quoted?.audioMessage;

      if (!isVideo && !isAudio) {
        return reply('❌ Debes responder a un *Video* o a un *Audio/Nota de voz* con este comando.');
      }

      await sock.sendPresenceUpdate('recording', remoteJid);

      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      const ext = isVideo ? 'mp4' : 'ogg';
      inputMedia = path.join(TEMP_DIR, `in_${id}.${ext}`);
      outputMp3 = path.join(TEMP_DIR, `out_${id}.mp3`);

      // 📥 Descargar la media (Audio o Video)
      const mediaType = isVideo ? 'video' : 'audio';
      const mediaContent = isVideo ? quoted.videoMessage : quoted.audioMessage;
      
      const stream = await downloadContentFromMessage(mediaContent, mediaType);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
      fs.writeFileSync(inputMedia, buffer);

      // 🔄 Extraer y convertir a MP3 (Calidad a 192k)
      await execFileAsync('ffmpeg', [
        '-y', 
        '-i', inputMedia, 
        '-vn', // Quitar video
        '-b:a', '192k', // Alta calidad
        outputMp3
      ]);

      // 📤 Enviar como audio MP3
      await sock.sendMessage(remoteJid, { 
        audio: fs.readFileSync(outputMp3), 
        mimetype: 'audio/mpeg',
        ptt: false // Ptt false para que se mande como canción y no como nota de voz
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en tomp3:', err?.message || err);
      return reply('❌ Ocurrió un error al extraer el audio.');
    } finally {
      [inputMedia, outputMp3].forEach(file => {
        try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
      });
    }
  }
};
