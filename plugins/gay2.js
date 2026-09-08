'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// 🎯 Función para detectar a la víctima
function getTarget(msg, sender) {
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const quotedSender = msg.message?.extendedTextMessage?.contextInfo?.participant || null;
  
  if (mentioned[0]) return mentioned[0];
  if (quotedSender) return quotedSender;
  return sender; // Si no menciona ni responde a nadie, se aplica a sí mismo
}

module.exports = {
  name: 'gay2',
  aliases: ['gay', 'filtrogay'],
  category: 'diversión',
  desc: 'Aplica un filtro arcoíris a la foto de perfil y envía un audio',

  execute: async ({ sock, msg, remoteJid, sender, reply }) => {
    let outputAudio = null;

    try {
      // 1. Identificar al objetivo
      const target = getTarget(msg, sender);

      // 2. Obtener Foto de Perfil
      let avatar;
      try {
        avatar = await sock.profilePictureUrl(target, 'image');
      } catch {
        // Fallback si no tiene foto de perfil o es privada
        avatar = 'https://telegra.ph/file/24fa902ead26340f3df2c.png';
      }

      // 3. Generar Imagen con la API
      const url = `https://some-random-api.com/canvas/gay?avatar=${encodeURIComponent(avatar)}`;

      // 📸 Enviar Imagen
      await sock.sendMessage(remoteJid, {
        image: { url },
        caption: '🏳️‍🌈 *MIREN A ESTE GAY* 🏳️‍🌈',
        mentions: [target]
      }, { quoted: msg });

      // 4. Procesar y Enviar Audio (Sin congelar el bot)
      const inputAudio = path.join(process.cwd(), 'media', 'gay2.mp3');
      
      if (fs.existsSync(inputAudio)) {
        const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
        outputAudio = path.join(TEMP_DIR, `gay2_out_${id}.ogg`);

        // 🔥 Conversión asíncrona con parámetros oficiales de WhatsApp
        await execFileAsync('ffmpeg', [
          '-y', '-i', inputAudio,
          '-vn', '-c:a', 'libopus', 
          '-b:a', '48k', 
          '-application', 'voip', 
          '-ac', '1', 
          '-ar', '48000', 
          outputAudio
        ]);

        // 🎵 Enviar como Nota de Voz
        await sock.sendMessage(remoteJid, {
          audio: fs.readFileSync(outputAudio),
          mimetype: 'audio/ogg; codecs=opus',
          ptt: true
        }, { quoted: msg });
        
      } else {
        console.log('⚠️ ADVERTENCIA: El archivo gay2.mp3 no se encontró en la carpeta media.');
      }

    } catch (err) {
      console.log('❌ Error en plugin gay2:', err?.message || err);
      return reply('❌ Ocurrió un error al procesar el filtro.');
    } finally {
      // 🧹 Limpieza del archivo temporal para no ocupar espacio
      try {
        if (outputAudio && fs.existsSync(outputAudio)) {
          fs.unlinkSync(outputAudio);
        }
      } catch {}
    }
  }
};
