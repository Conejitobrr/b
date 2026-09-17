'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const FormData = require('form-data');

const execFileAsync = promisify(execFile);
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const STICKER_PACK_NAME = '𝑺𝒊𝒓𝒊𝒖𝒔𝑩𝒐𝒕';
const STICKER_AUTHOR = 'Magic AI ✨'; 

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
  if (!isImage) return null;
  return { type, media, isImage, downloadType: type === 'documentMessage' ? 'document' : 'image' };
}

async function downloadMedia(media, downloadType) {
  const stream = await downloadContentFromMessage(media, downloadType);
  let buffer = Buffer.from([]);
  for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
  return buffer;
}

function createExif(packName = STICKER_PACK_NAME, author = STICKER_AUTHOR) {
  const json = { 'sticker-pack-id': 'com.siriusbot.ai', 'sticker-pack-name': packName, 'sticker-pack-publisher': author, emojis: ['🪄', '✨'] };
  const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
  const exifHeader = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
  exifHeader.writeUIntLE(jsonBuffer.length, 14, 4);
  return Buffer.concat([exifHeader, jsonBuffer]);
}

module.exports = {
  name: 'sauto',
  aliases: ['smagic', 'sbgai', 'recortar'],
  category: 'multimedia',
  desc: 'Recorta el sujeto principal automáticamente con Inteligencia Artificial',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    let input = null, output = null, exif = null, finalOutput = null;
    let loadMsg = null;

    try {
      const message = getQuotedMessage(msg) || msg.message;
      const info = getMediaInfo(message);

      if (!info || !info.isImage) {
        return reply('❌ Responde a una *imagen* para recortarla automáticamente con IA.');
      }

      const buffer = await downloadMedia(info.media, info.downloadType);

      loadMsg = await sock.sendMessage(remoteJid, { text: '✨ _Subiendo imagen de forma segura..._' }, { quoted: msg });

      // 1️⃣ SUBIR A TELEGRA.PH (Host de altísima confianza, nunca bloqueado)
      const form = new FormData();
      form.append('file', buffer, 'imagen.jpg');

      const uploadRes = await axios.post('https://telegra.ph/upload', form, {
        headers: form.getHeaders(),
        timeout: 15000
      });
      
      const imageUrl = 'https://telegra.ph' + uploadRes.data[0].src;

      await sock.sendMessage(remoteJid, { text: '🪄 _La IA está recortando los bordes..._', edit: loadMsg.key });

      // 2️⃣ MÚLTIPLES MOTORES DE IA CON VERIFICACIÓN DE BUFFER
      let bgBuffer = null;
      const apis = [
        `https://api.siputzx.my.id/api/ai/removebg?url=${encodeURIComponent(imageUrl)}`,
        `https://api.ryzendesu.vip/api/ai/removebg?url=${encodeURIComponent(imageUrl)}`,
        `https://aemt.me/removebg?url=${encodeURIComponent(imageUrl)}`
      ];

      for (const api of apis) {
        try {
          const aiRes = await axios.get(api, { responseType: 'arraybuffer', timeout: 20000 });
          const tempBuffer = Buffer.from(aiRes.data);
          
          // ESCÁNER ANTI-ERRORES: Verificamos que NO empiece con "<!DOC" o "<html"
          const head = tempBuffer.toString('utf8', 0, 10).toUpperCase();
          if (!head.includes('<!DOC') && !head.includes('<HTML')) {
            bgBuffer = tempBuffer; // Es una imagen válida, nos la quedamos
            break;
          }
        } catch (e) {
          continue; // Si un motor falla, salta al siguiente
        }
      }

      if (!bgBuffer) {
        throw new Error('Todas las IAs fallaron o devolvieron páginas web.');
      }

      // 3️⃣ PROCESAR EL RESULTADO COMO STICKER
      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      
      input = path.join(TEMP_DIR, `sauto_in_${id}.png`); 
      output = path.join(TEMP_DIR, `sauto_out_${id}.webp`);
      exif = path.join(TEMP_DIR, `sauto_exif_${id}.exif`);
      finalOutput = path.join(TEMP_DIR, `sauto_final_${id}.webp`);

      fs.writeFileSync(input, bgBuffer);

      const baseScale = 'scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000';

      await execFileAsync('ffmpeg', [
        '-y', '-i', input,
        '-vf', baseScale,
        '-vcodec', 'libwebp', '-q:v', '70', '-preset', 'picture', '-loop', '0',
        output
      ]);

      fs.writeFileSync(exif, createExif());
      await execFileAsync('webpmux', ['-set', 'exif', exif, output, '-o', finalOutput]);

      if (loadMsg) {
        try { await sock.sendMessage(remoteJid, { delete: loadMsg.key }); } catch {}
      }

      await sock.sendMessage(remoteJid, { sticker: fs.readFileSync(finalOutput) }, { quoted: msg });

    } catch (err) {
      if (loadMsg) {
        try { await sock.sendMessage(remoteJid, { delete: loadMsg.key }); } catch {}
      }
      console.log('❌ Error en sauto:', err?.message || err);
      await reply('❌ Ocurrió un error. Los servidores de IA podrían estar saturados.');
    } finally {
      [input, output, exif, finalOutput].forEach(file => {
        try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
      });
    }
  }
};
