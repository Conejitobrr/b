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
  desc: 'Inicia una secuencia explosiva de broma',

  execute: async ({ sock, msg, remoteJid, reply }) => {
    try {
      // 1️⃣ ALERTA INICIAL
      await sock.sendMessage(remoteJid, { text: '⚠️ *ADVERTENCIA:* SECUENCIA DE AUTODESTRUCCIÓN INICIADA.' });
      await sleep(1500);

      // 2️⃣ TEXTO ÁRABE (Trolleo 100% Pacífico y Seguro)
      // Traducción real: "Este es un mensaje de paz y amor, los quiero mucho a todos, beban agua y coman verduras. ¡La amistad es mágica!"
      const arabText = 'هذه رسالة سلام ومحبة ، أحبكم جميعًا كثيرًا ، اشربوا الماء وتناولوا الخضار. الصداقة هي السحر!';
      await sock.sendMessage(remoteJid, { text: arabText });
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

      // 🌐 NUEVO ENLACE: Giphy nunca bloquea las descargas en Latinoamérica
      const gifUrl = 'https://media.giphy.com/media/HhTXt43pk1I1W/giphy.gif';
      
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
      return reply('💥 _La bomba era china y no explotó. (El GIF no cargó a tiempo)_');
    } finally {
      // 7️⃣ LIMPIEZA
      try {
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
