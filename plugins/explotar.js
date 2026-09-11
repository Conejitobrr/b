'use strict';

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

// 🗄️ CARPETA TEMPORAL
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// ⏱️ FUNCIÓN PARA PAUSAS (El suspenso es clave)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  name: 'explotar',
  aliases: ['bomba', 'autodestruccion', 'boom', 'explota'],
  category: 'diversión',
  desc: 'Inicia una secuencia de autodestrucción en el chat',

  execute: async ({ sock, msg, remoteJid, reply }) => {
    try {
      // 1️⃣ ALERTA INICIAL
      await sock.sendMessage(remoteJid, { text: '⚠️ *ADVERTENCIA:* SECUENCIA DE AUTODESTRUCCIÓN INICIADA.' });
      await sleep(1500);

      // 2️⃣ TEXTO GLITCH / ALIEN (El "idioma raro")
      const alienText = 'S̶i̵s̷t̷e̵m̷a̶ ̷C̴o̴r̷r̸u̴p̶t̶o̴.̷ ̷ ̸A̸n̸u̴l̷a̵c̵i̸ó̵n̷ ̷d̷e̴n̸e̷g̶a̵d̶a̴.̶ ̴ ̴P̸u̶r̵g̸a̷n̴d̵o̷ ̸a̷r̸c̸h̷i̷v̶o̷s̷.̴.̶.';
      await sock.sendMessage(remoteJid, { text: alienText });
      await sleep(2000);

      // 3️⃣ CONTEO REGRESIVO DEL TERROR
      await sock.sendMessage(remoteJid, { text: '⏳ *3...*' });
      await sleep(1000);
      await sock.sendMessage(remoteJid, { text: '⏳ *2...*' });
      await sleep(1000);
      await sock.sendMessage(remoteJid, { text: '⏳ *1...*' });
      await sleep(1000);

      // 4️⃣ PREPARAR EL STICKER MIENTRAS CUENTA
      const id = Date.now();
      const inputGif = path.join(TEMP_DIR, `bomb_${id}.gif`);
      const outputWebp = path.join(TEMP_DIR, `boom_${id}.webp`);

      // Enlace directo a un GIF de explosión clásico
      const gifUrl = 'https://media1.tenor.com/m/Z-2kU7_fH2cAAAAC/explosion-boom.gif';
      
      const gifDownload = await axios.get(gifUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(inputGif, Buffer.from(gifDownload.data));

      // 5️⃣ CONVERTIR A STICKER ANIMADO
      await execFileAsync('ffmpeg', [
        '-y',
        '-i', inputGif,
        '-vf', 'scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000',
        '-vcodec', 'libwebp',
        '-lossless', '0',
        '-qscale', '40',
        '-preset', 'default',
        '-loop', '0',
        '-an',
        '-vsync', '0',
        outputWebp
      ]);

      // 6️⃣ ¡BUM! ENVIAR STICKER
      await sock.sendMessage(remoteJid, {
        sticker: fs.readFileSync(outputWebp)
      });

    } catch (err) {
      console.log('❌ Error en comando explotar:', err.message);
      return reply('💥 _La bomba era china y no explotó. (Hubo un error de red)_');
    } finally {
      // 7️⃣ LIMPIEZA
      try {
        const id = Date.now(); // Usar comodín de limpieza si falla el ID local
        const files = fs.readdirSync(TEMP_DIR);
        for (const file of files) {
          if (file.includes('bomb_') || file.includes('boom_')) {
            fs.unlinkSync(path.join(TEMP_DIR, file));
          }
        }
      } catch (e) {}
    }
  }
};
