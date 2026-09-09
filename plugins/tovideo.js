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
  name: 'tovideo',
  aliases: ['tomp4', 'mp4'],
  category: 'multimedia',
  desc: 'Convierte un sticker animado a video MP4',

  execute: async ({ sock, msg, remoteJid, reply }) => {
    let inputWebp = null;
    let outputGif = null;
    let outputMp4 = null;

    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quoted || !quoted.stickerMessage) {
        return reply('❌ Debes responder a un sticker animado con este comando.');
      }

      if (!quoted.stickerMessage.isAnimated) {
        return reply('⚠️ Este sticker NO tiene movimiento. Usa *.toimage* para volverlo foto.');
      }

      await sock.sendPresenceUpdate('composing', remoteJid);

      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      inputWebp = path.join(TEMP_DIR, `in_${id}.webp`);
      outputGif = path.join(TEMP_DIR, `mid_${id}.gif`); // Puente GIF
      outputMp4 = path.join(TEMP_DIR, `out_${id}.mp4`);

      // 📥 1. Descargar sticker de WhatsApp
      const stream = await downloadContentFromMessage(quoted.stickerMessage, 'sticker');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
      fs.writeFileSync(inputWebp, buffer);

      // 🔄 2. Convertir WEBP a GIF (Usando ImageMagick)
      await execFileAsync('convert', [inputWebp, outputGif]);

      // 🔄 3. Convertir GIF a MP4 (Usando FFmpeg)
      await execFileAsync('ffmpeg', [
        '-y',
        '-i', outputGif,
        '-movflags', 'faststart',
        '-pix_fmt', 'yuv420p',
        '-vf', 'scale=512:-2:flags=lanczos,fps=15',
        outputMp4
      ]);

      // 📤 4. Enviar video final
      await sock.sendMessage(remoteJid, { 
        video: fs.readFileSync(outputMp4),
        mimetype: 'video/mp4',
        caption: '🎬 *Sticker convertido a video*' 
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en tovideo:', err?.message || err);
      return reply('❌ Ocurrió un error al convertir el sticker.\n\n⚠️ *Asegúrate de instalar ImageMagick en tu Termux ejecutando:*\n\n`pkg install imagemagick ffmpeg -y`');
    } finally {
      // 🧹 5. Limpieza exhaustiva de los 3 archivos
      [inputWebp, outputGif, outputMp4].forEach(file => {
        try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
      });
    }
  }
};
