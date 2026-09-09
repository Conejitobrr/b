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
      outputMp4 = path.join(TEMP_DIR, `out_${id}.mp4`);

      // 📥 Descargar sticker
      const stream = await downloadContentFromMessage(quoted.stickerMessage, 'sticker');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
      fs.writeFileSync(inputWebp, buffer);

      // 🔄 Convertir a MP4 (Escalado par para que MP4 no de error)
      await execFileAsync('ffmpeg', [
        '-y', 
        '-i', inputWebp, 
        '-c:v', 'libx264', 
        '-pix_fmt', 'yuv420p', 
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', 
        outputMp4
      ]);

      // 📤 Enviar video
      await sock.sendMessage(remoteJid, { 
        video: fs.readFileSync(outputMp4), 
        caption: '🎬 *Sticker convertido a video*' 
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en tovideo:', err?.message || err);
      return reply('❌ Ocurrió un error al convertir el sticker animado.');
    } finally {
      [inputWebp, outputMp4].forEach(file => {
        try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
      });
    }
  }
};
