'use strict';

const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

module.exports = {
  name: 'tts',
  aliases: ['decir', 'hablar', 'voz'],
  category: 'herramientas',
  desc: 'Convierte texto a una nota de voz real',

  execute: async ({ sock, msg, remoteJid, args, sender, db, reply }) => {
    let inputMp3 = null;
    let outputOgg = null;

    try {
      const text = args.join(' ').trim();
      
      if (!text) {
        return reply('❌ Escribe el texto que quieres que yo diga.\n\n📌 *Ejemplo:*\n*.tts Hola grupo, ¿cómo están?*');
      }

      // 🛡️ Límite de seguridad para no saturar la memoria ni la API
      if (text.length > 500) {
         return reply('❌ El texto es muy largo. Por favor, usa un máximo de 500 caracteres.');
      }

      // 🔥 Mostrar estado de "Grabando audio..." en la barra de WhatsApp (en vez de enviar un mensaje)
      await sock.sendPresenceUpdate('recording', remoteJid);

      // Generar IDs únicos para evitar que los audios se crucen si 2 personas lo usan a la vez
      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      inputMp3 = path.join(TEMP_DIR, `tts_in_${id}.mp3`);
      outputOgg = path.join(TEMP_DIR, `tts_out_${id}.ogg`);

      // 1️⃣ Generar audio MP3 con gTTS de forma asíncrona
      const tts = new gTTS(text, 'es');
      await new Promise((resolve, reject) => {
        tts.save(inputMp3, (err) => err ? reject(err) : resolve());
      });

      // 2️⃣ Convertir a OPUS (Formato exacto y ultra comprimido de Nota de Voz de WhatsApp)
      await execFileAsync('ffmpeg', [
        '-y', 
        '-i', inputMp3,
        '-vn', 
        '-c:a', 'libopus', 
        '-b:a', '48k', 
        '-application', 'voip', 
        '-ac', '1', 
        '-ar', '48000', 
        outputOgg
      ]);

      // 3️⃣ Enviar como nota de voz REAL directo al chat
      await sock.sendMessage(remoteJid, {
        audio: fs.readFileSync(outputOgg),
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true
      }, { quoted: msg });

      // ⭐ Bono de XP al usuario
      if (db && typeof db.getUser === 'function') {
        const userData = await db.getUser(sender);
        if (userData) {
          userData.xp = (userData.xp || 0) + Math.floor(Math.random() * 6) + 2;
          if (userData.save) await userData.save();
        }
      }

    } catch (err) {
      console.log('❌ Error en plugin tts:', err?.message || err);
      return reply('❌ Ocurrió un error al intentar generar la nota de voz. Verifica que FFmpeg esté funcionando correctamente.');
    } finally {
      // 🧹 Limpieza exhaustiva de archivos temporales
      [inputMp3, outputOgg].forEach(file => {
        try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
      });
    }
  }
};
