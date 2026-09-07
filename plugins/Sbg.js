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

// 🎨 COLORES Y FORMATOS PERMITIDOS
const COLORS = { verde: '0x00FF00', blanco: '0xFFFFFF', negro: '0x000000', azul: '0x0000FF', rojo: '0xFF0000' };
const FORMATS = ['sticker', 'gif', 'video', 'foto'];

module.exports = {
  name: 'sbg',
  aliases: ['schroma', 'chroma', 'sinfondo'],
  category: 'multimedia',
  desc: 'Borra el fondo. Formatos: sticker, gif, video, foto',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    let input = null, output = null, exif = null, finalOutput = null, tempGif = null;

    try {
      let format = 'sticker'; // Por defecto es sticker
      let colorName = 'verde'; // Por defecto verde

      // 🔍 Filtrar opciones que escribió el usuario
      for (const arg of args) {
        const a = arg.toLowerCase();
        if (FORMATS.includes(a)) format = a;
        else if (COLORS[a]) colorName = a;
      }

      const hexColor = COLORS[colorName];

      if (!hexColor) {
        return reply(`❌ Color no soportado. Usa:\n*${Object.keys(COLORS).join(', ')}*`);
      }

      const message = getQuotedMessage(msg) || msg.message;
      const info = getMediaInfo(message);

      if (!info || (!info.media.url && !info.media.mediaKey)) {
        return reply(`❌ Envía o responde a un archivo.\n\n📌 *Opciones:*\nFormatos: sticker, gif, video, foto\nColores: verde, blanco, negro, azul, rojo\n\n👉 Ejemplo: *.sbg gif blanco*`);
      }

      const buffer = await downloadMedia(info.media, info.downloadType);
      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      const ext = info.isImage ? 'jpg' : 'mp4';

      input = path.join(TEMP_DIR, `sbg_in_${id}.${ext}`);
      fs.writeFileSync(input, buffer);

      await sock.sendMessage(remoteJid, { text: `⏳ Procesando *${format}* sin fondo *${colorName}*...` }, { quoted: msg });

      // Filtro mágico que transparenta el color elegido
      const chromaFilter = `format=rgba,colorkey=${hexColor}:0.3:0.1`;

      if (format === 'foto') {
        output = path.join(TEMP_DIR, `sbg_out_${id}.png`);
        await execFileAsync('ffmpeg', ['-y', '-i', input, '-vf', chromaFilter, '-c:v', 'png', output]);
        
        await sock.sendMessage(remoteJid, {
          document: fs.readFileSync(output), // Como documento para que WhatsApp no le ponga fondo negro
          mimetype: 'image/png',
          fileName: 'SinFondo.png',
          caption: '🖼️ Imagen sin fondo (Transparente)'
        }, { quoted: msg });

      } else if (format === 'video') {
        output = path.join(TEMP_DIR, `sbg_out_${id}.mp4`);
        await execFileAsync('ffmpeg', ['-y', '-i', input, '-vf', chromaFilter, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', output]);
        
        await sock.sendMessage(remoteJid, {
          video: fs.readFileSync(output),
          mimetype: 'video/mp4',
          caption: '🎥 Video procesado (WhatsApp pone fondo negro a los videos transparentes)'
        }, { quoted: msg });

      } else if (format === 'gif') {
        output = path.join(TEMP_DIR, `sbg_out_${id}.gif`);
        // Paleta de colores para que el GIF sea de altísima calidad y sin fondo
        const filterGif = `${chromaFilter},fps=12,scale=512:-1:flags=lanczos,split[s0][s1];[s0]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[s1][p]paletteuse`;
        await execFileAsync('ffmpeg', ['-y', '-i', input, '-t', '5', '-vf', filterGif, output]);
        
        await sock.sendMessage(remoteJid, {
          document: fs.readFileSync(output), // Como documento para que mantenga transparencia
          mimetype: 'image/gif',
          fileName: 'Animacion.gif',
          caption: '🎞️ GIF 100% Transparente'
        }, { quoted: msg });

      } else { // Si pidió formato 'sticker' (o no puso formato y es por defecto)
        output = path.join(TEMP_DIR, `sbg_out_${id}.webp`);
        exif = path.join(TEMP_DIR, `sbg_exif_${id}.exif`);
        finalOutput = path.join(TEMP_DIR, `sbg_final_${id}.webp`);
        const baseScale = 'scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000';

        if (info.isImage) {
          await execFileAsync('ffmpeg', ['-y', '-i', input, '-vf', `${chromaFilter},${baseScale}`, '-vcodec', 'libwebp', '-q:v', '60', '-preset', 'picture', '-loop', '0', output]);
        } else {
          tempGif = path.join(TEMP_DIR, `sbg_temp_${id}.gif`);
          const filterGif = `${chromaFilter},fps=10,${baseScale},split[s0][s1];[s0]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[s1][p]paletteuse`;
          
          await execFileAsync('ffmpeg', ['-y', '-i', input, '-t', '5', '-vf', filterGif, '-loop', '0', tempGif]);

          // 🔥 INTERCEPTOR DE ERRORES: Si falta el paquete webp, el bot le avisa al dueño qué comando ejecutar
          try {
            await execFileAsync('gif2webp', [tempGif, '-lossy', '-q', '60', '-m', '4', '-o', output]);
          } catch (webPErr) {
            return reply('❌ *ERROR DE TERMUX*\nTe falta una herramienta para crear stickers animados sin fondo.\n\n👉 Ve a tu consola de Termux y escribe este comando:\n\n*pkg install webp -y*');
          }
        }

        fs.writeFileSync(exif, createExif());
        await execFileAsync('webpmux', ['-set', 'exif', exif, output, '-o', finalOutput]);
        await sock.sendMessage(remoteJid, { sticker: fs.readFileSync(finalOutput) }, { quoted: msg });
      }

    } catch (err) {
      console.log('❌ Error en sbg:', err?.message || err);
      await reply('❌ Ocurrió un error al procesar el archivo.');
    } finally {
      // 🧹 Limpieza masiva de archivos temporales
      [input, output, exif, finalOutput, tempGif].forEach(file => {
        try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
      });
    }
  }
};
