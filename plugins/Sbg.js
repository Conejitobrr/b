'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const execFileAsync = promisify(execFile);
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const STICKER_PACK_NAME = '𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕';
const STICKER_AUTHOR = ''; 

function getQuotedMessage(msg) {
  const context = msg.message?.extendedTextMessage?.contextInfo ||
                  msg.message?.imageMessage?.contextInfo ||
                  msg.message?.videoMessage?.contextInfo ||
                  msg.message?.documentMessage?.contextInfo;
  return context?.quotedMessage || null;
}

function getMediaInfo(message) {
  if (!message) return null;
  const type = Object.keys(message).find(k => ['imageMessage', 'videoMessage', 'documentMessage'].includes(k));
  if (!type) return null;

  const media = message[type];
  const isImage = type === 'imageMessage' || (type === 'documentMessage' && media.mimetype?.startsWith('image/'));
  const isVideo = type === 'videoMessage' || (type === 'documentMessage' && media.mimetype?.startsWith('video/'));

  if (!isImage && !isVideo) return null;
  return { type, media, isImage, isVideo, downloadType: type === 'documentMessage' ? 'document' : isVideo ? 'video' : 'image' };
}

async function downloadMedia(media, downloadType) {
  const stream = await downloadContentFromMessage(media, downloadType);
  let buffer = Buffer.from([]);
  for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
  return buffer;
}

function createExif(packName = STICKER_PACK_NAME, author = STICKER_AUTHOR) {
  const json = { 'sticker-pack-id': 'com.siriusbot.sticker', 'sticker-pack-name': packName, 'sticker-pack-publisher': author, emojis: ['🤖'] };
  const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
  const exifHeader = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
  exifHeader.writeUIntLE(jsonBuffer.length, 14, 4);
  return Buffer.concat([exifHeader, jsonBuffer]);
}

// 🎨 COLORES SOPORTADOS PARA BORRAR
const COLORS = {
  verde: '0x00FF00',
  blanco: '0xFFFFFF',
  negro: '0x000000',
  azul: '0x0000FF',
  rojo: '0xFF0000'
};

module.exports = {
  name: 'sbg',
  aliases: ['schroma', 'chroma', 'sinfondo'],
  category: 'multimedia',
  desc: 'Crea un sticker borrando un color de fondo sin efecto de clones',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    let input = null, output = null, exif = null, finalOutput = null, tempGif = null;

    try {
      const colorName = (args[0] || 'verde').toLowerCase();
      const hexColor = COLORS[colorName];

      if (!hexColor) {
        return reply(`❌ Color no soportado. Usa uno de estos:\n*${Object.keys(COLORS).join(', ')}*`);
      }

      const message = getQuotedMessage(msg) || msg.message;
      const info = getMediaInfo(message);

      if (!info || (!info.media.url && !info.media.mediaKey)) {
        return reply('❌ Envía o responde a una imagen/video con fondo sólido.');
      }

      const buffer = await downloadMedia(info.media, info.downloadType);
      
      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      const ext = info.isImage ? 'jpg' : 'mp4';
      
      input = path.join(TEMP_DIR, `sbg_in_${id}.${ext}`);
      output = path.join(TEMP_DIR, `sbg_out_${id}.webp`);
      exif = path.join(TEMP_DIR, `sbg_exif_${id}.exif`);
      finalOutput = path.join(TEMP_DIR, `sbg_final_${id}.webp`);

      fs.writeFileSync(input, buffer);

      const chromaFilter = `format=rgba,colorkey=${hexColor}:0.3:0.1`;
      const baseScale = 'scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000';

      await sock.sendMessage(remoteJid, { text: `⏳ Borrando fondo *${colorName}*, un momento...` }, { quoted: msg });

      if (info.isImage) {
        // Para imágenes, WebP directo funciona perfecto
        const ffmpegArgs = ['-y', '-i', input, '-vf', `${chromaFilter},${baseScale}`, '-vcodec', 'libwebp', '-q:v', '60', '-preset', 'picture', '-loop', '0', output];
        await execFileAsync('ffmpeg', ffmpegArgs);
      } else {
        // 🔥 SOLUCIÓN A LOS CLONES: Video -> GIF -> WebP
        tempGif = path.join(TEMP_DIR, `sbg_temp_${id}.gif`);
        const ffmpegArgs = ['-y', '-i', input, '-t', '5', '-vf', `${chromaFilter},fps=10,${baseScale}`, '-loop', '0', tempGif];
        
        await execFileAsync('ffmpeg', ffmpegArgs);
        // Convierte el GIF limpio a WebP manteniendo las transparencias puras y con pérdida ligera para no superar el peso de WhatsApp
        await execFileAsync('gif2webp', [tempGif, '-lossy', '-q', '60', '-m', '4', '-o', output]);
      }

      // Aplicar metadatos EXIF
      fs.writeFileSync(exif, createExif());
      await execFileAsync('webpmux', ['-set', 'exif', exif, output, '-o', finalOutput]);

      // Enviar Sticker final
      await sock.sendMessage(remoteJid, { sticker: fs.readFileSync(finalOutput) }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en sbg:', err?.message || err);
      await reply('❌ Error al procesar el chroma. Verifica que el archivo no sea muy pesado.');
    } finally {
      // 🧹 Limpieza exhaustiva para cuidar tu almacenamiento
      [input, output, exif, finalOutput, tempGif].forEach(file => {
        try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
      });
    }
  }
};
