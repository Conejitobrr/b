'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

function isInstagramUrl(url = '') {
  return /instagram\.com/i.test(url);
}

module.exports = {
  name: 'instagram',
  aliases: ['ig', 'igdl'],
  category: 'multimedia',
  desc: 'Descarga videos, reels o carruseles de Instagram',

  execute: async ({ sock, remoteJid, args, msg, reply }) => {
    let downloaded = [];

    try {
      if (!args.length) return reply('❌ Envía un link de Instagram.\n\nEjemplo:\n.ig https://www.instagram.com/reel/...');
      
      const url = args[0];
      if (!isInstagramUrl(url)) return reply('❌ Link inválido de Instagram.');

      await reply('⏳ Descargando contenido de Instagram... (Si es un carrusel puede tardar un poco)');

      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      const outputTemplate = path.join(TEMP_DIR, `ig_${id}_%(id)s.%(ext)s`);

      await execFileAsync('yt-dlp', [
        '--no-playlist',
        '--add-header', 'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        '-o', outputTemplate,
        url
      ]);

      const files = fs.readdirSync(TEMP_DIR).filter(file => file.startsWith(`ig_${id}_`));

      if (!files.length) {
        return reply('❌ No se encontró contenido. La publicación es privada o el enlace no es válido.');
      }

      for (const file of files) {
        const filePath = path.join(TEMP_DIR, file);
        downloaded.push(filePath);
        
        const sizeMB = fs.statSync(filePath).size / 1024 / 1024;
        if (sizeMB > 45) {
          await reply(`⚠️ Archivo muy pesado omitido (${sizeMB.toFixed(1)} MB)`);
          continue;
        }

        const buffer = fs.readFileSync(filePath);
        const lower = file.toLowerCase();

        if (lower.endsWith('.mp4') || lower.endsWith('.mkv') || lower.endsWith('.webm')) {
          await sock.sendMessage(remoteJid, { video: buffer, mimetype: 'video/mp4', caption: '📸 *SIRIUS IG*' }, { quoted: msg });
        } else if (lower.match(/\.(jpg|jpeg|png|webp)$/)) {
          await sock.sendMessage(remoteJid, { image: buffer, caption: '📸 *SIRIUS IG*' }, { quoted: msg });
        }
      }
    } catch (err) {
      console.log('❌ Error en instagram:', err?.message || err);
      await reply('❌ No se pudo descargar. Puede ser privado o requerir inicio de sesión.');
    } finally {
      downloaded.forEach(file => {
        try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch {}
      });
    }
  }
};
