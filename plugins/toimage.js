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
  name: 'toimage',
  aliases: ['toimg', 'aimg'],
  category: 'multimedia',
  desc: 'Convierte un sticker estático en una imagen',

  execute: async ({ sock, msg, remoteJid, reply }) => {
    let inputWebp = null;
    let outputPng = null;

    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quoted || !quoted.stickerMessage) {
        return reply('❌ Debes responder a un sticker estático con este comando.\n\n📌 *Ejemplo:*\nResponde a un sticker y escribe *.toimage*');
      }

      if (quoted.stickerMessage.isAnimated) {
        return reply('⚠️ Este sticker es animado. Para stickers con movimiento, por favor usa el comando *.tovideo*');
      }

      await sock.sendPresenceUpdate('composing', remoteJid);

      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      inputWebp = path.join(TEMP_DIR, `in_${id}.webp`);
      outputPng = path.join(TEMP_DIR, `out_${id}.png`);

      // 📥 Descargar el sticker original
      const stream = await downloadContentFromMessage(quoted.stickerMessage, 'sticker');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
      fs.writeFileSync(inputWebp, buffer);

      // 🔄 Convertir usando FFmpeg
      await execFileAsync('ffmpeg', ['-y', '-i', inputWebp, outputPng]);

      // 📤 Enviar la imagen
      await sock.sendMessage(remoteJid, { 
        image: fs.readFileSync(outputPng), 
        caption: '🖼️ *Sticker convertido a imagen*' 
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en toimage:', err?.message || err);
      return reply('❌ Ocurrió un error al intentar convertir el sticker.');
    } finally {
      // 🧹 Limpieza exhaustiva
      [inputWebp, outputPng].forEach(file => {
        try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
      });
    }
  }
};
