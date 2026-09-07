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

const COLORS = { verde: 'green', blanco: 'white', negro: 'black', azul: 'blue', rojo: 'red' };
const FORMATS = ['sticker', 'gif', 'video', 'foto'];

module.exports = {
  name: 'sbg',
  aliases: ['schroma', 'chroma', 'sinfondo'],
  category: 'multimedia',
  desc: 'Borra el fondo. Formatos: sticker, gif, video, foto',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    let input = null, output = null, exif = null, finalOutput = null;
    let frames = []; 

    try {
      let format = 'sticker'; 
      let colorName = 'verde'; 

      for (const arg of args) {
        const a = arg.toLowerCase();
        if (FORMATS.includes(a)) format = a;
        else if (COLORS[a]) colorName = a;
      }

      const ffmpegColor = COLORS[colorName];

      if (!ffmpegColor) {
        return reply(`❌ Color no soportado. Usa:\n*${Object.keys(COLORS).join(', ')}*`);
      }

      const message = getQuotedMessage(msg) || msg.message;
      const info = getMediaInfo(message);

      if (!info || (!info.media.url && !info.media.mediaKey)) {
        return reply(`❌ Envía o responde a un archivo.\n\n📌 *Opciones:*\nFormatos: sticker, gif, video, foto\nColores: verde, blanco, negro, azul, rojo\n\n👉 Ejemplo: *.sbg verde*`);
      }

      const buffer = await downloadMedia(info.media, info.downloadType);
      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      const ext = info.isImage ? 'jpg' : 'mp4';

      input = path.join(TEMP_DIR, `sbg_in_${id}.${ext}`);
      fs.writeFileSync(input, buffer);

      await sock.sendMessage(remoteJid, { text: `⏳ Procesando *${format}* sin fondo *${colorName}*...\n_Optimizando para WhatsApp_ 🚀` }, { quoted: msg });

      const chromaFilter = `chromakey=${ffmpegColor}:0.3:0.1`;

      if (format === 'foto') {
        output = path.join(TEMP_DIR, `sbg_out_${id}.png`);
        await execFileAsync('ffmpeg', ['-y', '-i', input, '-vf', chromaFilter, '-c:v', 'png', output]);
        
        await sock.sendMessage(remoteJid, {
          document: fs.readFileSync(output), 
          mimetype: 'image/png',
          fileName: 'SinFondo.png',
          caption: '🖼️ Imagen sin fondo'
        }, { quoted: msg });

      } else if (format === 'video') {
        output = path.join(TEMP_DIR, `sbg_out_${id}.mp4`);
        await execFileAsync('ffmpeg', ['-y', '-i', input, '-vf', chromaFilter, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', output]);
        
        await sock.sendMessage(remoteJid, {
          video: fs.readFileSync(output),
          mimetype: 'video/mp4',
          caption: '🎥 Video procesado'
        }, { quoted: msg });

      } else if (format === 'gif') {
        output = path.join(TEMP_DIR, `sbg_out_${id}.gif`);
        // GIF cortado a 3 segundos para que no pese tanto
        const filterGif = `${chromaFilter},fps=10,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen=reserve_transparent=on:transparency_color=black[p];[s1][p]paletteuse=alpha_threshold=128`;
        await execFileAsync('ffmpeg', ['-y', '-i', input, '-t', '3', '-vf', filterGif, output]);
        
        await sock.sendMessage(remoteJid, {
          document: fs.readFileSync(output), 
          mimetype: 'image/gif',
          fileName: 'Animacion.gif',
          caption: '🎞️ GIF Transparente'
        }, { quoted: msg });

      } else { 
        // 💎 FORMATO STICKER
        output = path.join(TEMP_DIR, `sbg_out_${id}.webp`);
        exif = path.join(TEMP_DIR, `sbg_exif_${id}.exif`);
        finalOutput = path.join(TEMP_DIR, `sbg_final_${id}.webp`);
        
        if (info.isImage) {
          const scaleImg = 'scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000';
          await execFileAsync('ffmpeg', ['-y', '-i', input, '-vf', `${chromaFilter},${scaleImg}`, '-c:v', 'libwebp', '-q:v', '60', '-preset', 'picture', '-loop', '0', output]);
        } else {
          // 🔥 SUGERENCIA APLICADA: Bajamos la resolución a 256x256 y cortamos a 3 segundos máximos
          const scaleVid = 'scale=256:256:force_original_aspect_ratio=decrease:flags=lanczos,pad=256:256:(ow-iw)/2:(oh-ih)/2:color=0x00000000';
          const framePattern = path.join(TEMP_DIR, `sbg_frame_${id}_%03d.png`);
          
          await execFileAsync('ffmpeg', [
            '-y', '-i', input, '-t', '4', 
            '-vf', `${chromaFilter},fps=10,${scaleVid}`, 
            framePattern
          ]);

          frames = fs.readdirSync(TEMP_DIR)
            .filter(f => f.startsWith(`sbg_frame_${id}_`) && f.endsWith('.png'))
            .sort()
            .map(f => path.join(TEMP_DIR, f));

          if (frames.length === 0) throw new Error("No frames generated");

          // 🔥 Eliminamos el parámetro que hacía crashear a Termux
          const img2webpArgs = [
            '-o', output,
            '-loop', '0',
            '-lossy',
            '-q', '40', 
            '-m', '4',
            '-d', '100', // (100ms = 10fps, sincronización perfecta)
            ...frames
          ];

          await execFileAsync('img2webp', img2webpArgs);
        }

        fs.writeFileSync(exif, createExif());
        await execFileAsync('webpmux', ['-set', 'exif', exif, output, '-o', finalOutput]);
        await sock.sendMessage(remoteJid, { sticker: fs.readFileSync(finalOutput) }, { quoted: msg });
      }

    } catch (err) {
      console.log('❌ Error en sbg:', err?.message || err);
      await reply('❌ Ocurrió un error al procesar el archivo. Intenta nuevamente.');
    } finally {
      // 🧹 Limpieza exhaustiva
      [input, output, exif, finalOutput, ...frames].forEach(file => {
        try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
      });
    }
  }
};
