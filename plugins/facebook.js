'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const TEMP_DIR = path.join(process.cwd(), 'temp');

function ensureTemp() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function isFacebookUrl(url = '') {
  return /(facebook\.com|fb\.watch|fb\.gg)/i.test(url);
}

// 🔥 Usa un User-Agent de PC para evadir los bloqueos de privacidad de FB
async function downloadFacebook(url, output) {
  await execFileAsync('yt-dlp', [
    '-f', 'mp4/best',
    '--no-playlist',
    '--add-header', 'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    '-o', output,
    url
  ]);
}

// 🎬 Convierte a un formato 100% compatible con WhatsApp
async function convertVideo(input, output) {
  await execFileAsync('ffmpeg', [
    '-y',
    '-i', input,
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-preset', 'veryfast',
    '-crf', '28',
    output
  ]);
}

module.exports = {
  name: 'facebook',
  aliases: ['fb', 'fbdl'],
  category: 'descargas',
  desc: 'Descarga videos de Facebook a partir de un link',

  execute: async ({ sock, remoteJid, args, sender, msg, db, reply }) => {
    let rawFile = null;
    let finalFile = null;

    try {
      if (!args.length) {
        return reply('❌ Envía un link de Facebook.\n\n📌 Ejemplo:\n*.fb https://www.facebook.com/...*');
      }

      const url = args[0];

      if (!isFacebookUrl(url)) {
        return reply('❌ Link inválido. Asegúrate de que sea un enlace válido de Facebook.');
      }

      ensureTemp();

      await sock.sendMessage(remoteJid, {
        text: '⏳ Descargando video de Facebook, un momento...'
      }, { quoted: msg });

      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      rawFile = path.join(TEMP_DIR, `fb_raw_${id}.mp4`);
      finalFile = path.join(TEMP_DIR, `fb_final_${id}.mp4`);

      // 📥 Descarga y conversión
      await downloadFacebook(url, rawFile);
      await convertVideo(rawFile, finalFile);

      if (!fs.existsSync(finalFile)) {
        return reply('❌ No se pudo procesar el video. Es posible que sea un video privado.');
      }

      // ⚖️ Verifica el tamaño (Límite aumentado a 50 MB para mayor flexibilidad)
      const sizeMB = fs.statSync(finalFile).size / 1024 / 1024;
      if (sizeMB > 50) {
        return reply(`⚠️ El video pesa demasiado (${sizeMB.toFixed(1)} MB). El límite de envío es de 50 MB.`);
      }

      // 🚀 Envío del archivo final
      await sock.sendMessage(remoteJid, {
        video: fs.readFileSync(finalFile),
        mimetype: 'video/mp4',
        caption: '📘 *SIRIUS BOT | Descarga Completa*'
      }, { quoted: msg });

      // ⭐ Bono de XP al usuario
      if (db && typeof db.getUser === 'function') {
        const userData = await db.getUser(sender);
        if (userData) {
          const xp = Math.floor(Math.random() * 15) + 5;
          userData.xp = (userData.xp || 0) + xp;
          if (userData.save) await userData.save();
        }
      }

    } catch (err) {
      console.log('❌ Error en plugin facebook:', err?.message || err);
      return reply('❌ Ocurrió un error al intentar descargar el video.\nAsegúrate de que el enlace sea público.');
    } finally {
      // 🧹 Limpieza agresiva de archivos temporales para ahorrar espacio en Termux
      for (const file of [rawFile, finalFile]) {
        try {
          if (file && fs.existsSync(file)) fs.unlinkSync(file);
        } catch {}
      }
    }
  }
};
