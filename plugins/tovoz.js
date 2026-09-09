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
  name: 'tovoz',
  aliases: ['toptt', 'tovn', 'nota'],
  category: 'multimedia',
  desc: 'Convierte un video o canción en una Nota de Voz simulada',

  execute: async ({ sock, msg, remoteJid, reply }) => {
    let inputMedia = null;
    let outputOgg = null;

    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      const isVideo = quoted?.videoMessage;
      const isAudio = quoted?.audioMessage;
      const isDocument = quoted?.documentMessage; // Por si mandan un MP3 como documento

      if (!isVideo && !isAudio && !isDocument) {
        return reply('❌ Debes responder a un *Video*, *Audio* o *Documento* con este comando para volverlo nota de voz.');
      }

      // 🎤 Muestra "Grabando audio..." en lugar de "Escribiendo..."
      await sock.sendPresenceUpdate('recording', remoteJid); 

      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      
      let ext = 'mp4';
      if (isAudio) ext = 'mp3';
      if (isDocument) ext = quoted.documentMessage.fileName?.split('.').pop() || 'mp3';

      inputMedia = path.join(TEMP_DIR, `in_${id}.${ext}`);
      outputOgg = path.join(TEMP_DIR, `out_${id}.ogg`);

      // 📥 Descargar la media (Audio, Video o Documento)
      let mediaType = 'video';
      let mediaContent = quoted.videoMessage;
      if (isAudio) { mediaType = 'audio'; mediaContent = quoted.audioMessage; }
      if (isDocument) { mediaType = 'document'; mediaContent = quoted.documentMessage; }
      
      const stream = await downloadContentFromMessage(mediaContent, mediaType);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
      fs.writeFileSync(inputMedia, buffer);

      // 🔄 Convertir a Nota de Voz (Usando los mismos parámetros de tu audios_pasivos)
      await execFileAsync('ffmpeg', [
        '-y', '-i', inputMedia,
        '-vn', '-map', '0:a:0', '-af', 'aresample=async=1:first_pts=0',
        '-c:a', 'libopus', '-application', 'voip', '-b:a', '48k',
        '-ar', '48000', '-ac', '1', '-frame_duration', '20', '-f', 'ogg',
        outputOgg
      ]);

      // 📤 Enviar como Nota de Voz PTT (Push-To-Talk)
      await sock.sendMessage(remoteJid, { 
        audio: fs.readFileSync(outputOgg), 
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true // 🔥 LA MAGIA: Esto hace que salga como si se grabara con el micrófono
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en tovoz:', err?.message || err);
      return reply('❌ Ocurrió un error al convertir el archivo a nota de voz.');
    } finally {
      // 🧹 Limpieza de temporales
      [inputMedia, outputOgg].forEach(file => {
        try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
      });
    }
  }
};
