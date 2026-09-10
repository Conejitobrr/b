'use strict';

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

// 🗄️ CARPETA TEMPORAL PARA CONVERSIÓN
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// 📚 DICCIONARIO (Nekos.best - Súper Estable)
const acciones = {
  'abrazar':   { endpoint: 'hug',      emoji: '🫂', msg: 'le dio un fuerte abrazo a' },
  'besar':     { endpoint: 'kiss',     emoji: '💋', msg: 'le dio un tierno beso a' },
  'pegar':     { endpoint: 'slap',     emoji: '👊', msg: 'le dio una tremenda bofetada a' },
  'matar':     { endpoint: 'shoot',    emoji: '🔫', msg: 'acaba de acribillar a' },
  'acariciar': { endpoint: 'pat',      emoji: '🥰', msg: 'está acariciando tiernamente a' },
  'morder':    { endpoint: 'bite',     emoji: '🧛', msg: 'le dio una mordida a' },
  'fastidiar': { endpoint: 'poke',     emoji: '👉', msg: 'está fastidiando a' },
  'llorar':    { endpoint: 'cry',      emoji: '😭', msg: 'está llorando a mares con' },
  'bailar':    { endpoint: 'dance',    emoji: '🕺', msg: 'se puso a bailar épicamente con' },
  'patear':    { endpoint: 'kick',     emoji: '🦵', msg: 'le metió una patada voladora a' },
  'lanzar':    { endpoint: 'yeet',     emoji: '🚀', msg: 'mandó a volar por los aires a' },
  'acurrucar': { endpoint: 'cuddle',   emoji: '🛌', msg: 'se está acurrucando cómodamente con' },
  'chocala':   { endpoint: 'highfive', emoji: '✋', msg: 'chocó los cinco con' },
  'golpear':   { endpoint: 'punch',    emoji: '🥊', msg: 'le dio un tremendo puñetazo a' },
  'cosquillas':{ endpoint: 'tickle',   emoji: '🤣', msg: 'le está haciendo cosquillas a' }
};

function cleanJid(jid = '') { 
  return String(jid).split('@')[0].split(':')[0].replace(/\D/g, ''); 
}

module.exports = {
  name: 'roleplay',
  aliases: Object.keys(acciones),
  category: 'diversión',
  desc: 'Interactúa con los miembros del grupo con stickers animados',

  execute: async ({ sock, msg, remoteJid, sender, pushName, args, commandName, reply }) => {
    const cmd = commandName.toLowerCase();
    const accion = acciones[cmd];

    if (!accion) return;

    // 1️⃣ DETECTAR A QUIÉN SE DIRIGE LA ACCIÓN
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const mentioned = contextInfo?.mentionedJid?.[0]; 
    const quotedUser = contextInfo?.participant;      

    let targetId = mentioned || quotedUser || null;
    let targetName = '';
    let mencionesParaEnviar = [];

    if (targetId) {
      targetName = `@${cleanJid(targetId)}`;
      mencionesParaEnviar.push(targetId);
      mencionesParaEnviar.push(sender); 
    } else if (args.length > 0) {
      targetName = args.join(' ');
    } else {
      return reply(`❌ Tienes que mencionar o responder a alguien.\n📌 *Ejemplo:* .${cmd} @amigo`);
    }

    if (targetId === sender) {
      return reply(`😅 No puedes usar *.${cmd}* contigo mismo. Toca salir a socializar pe.`);
    }

    const loadMsg = await sock.sendMessage(remoteJid, { text: `${accion.emoji} _Generando sticker animado..._` }, { quoted: msg });

    // Nombres de archivos únicos para evitar colisiones si varios lo usan a la vez
    const id = Date.now();
    const inputGif = path.join(TEMP_DIR, `in_${id}.gif`);
    const outputWebp = path.join(TEMP_DIR, `out_${id}.webp`);

    try {
      // 2️⃣ OBTENER GIF DE LA API
      const res = await axios.get(`https://nekos.best/api/v2/${accion.endpoint}`);
      const imageUrl = res.data.results[0].url;

      // 3️⃣ DESCARGAR Y GUARDAR TEMPORALMENTE
      const imageDownload = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(inputGif, Buffer.from(imageDownload.data));

      // 4️⃣ CONVERTIR GIF A STICKER ANIMADO (WebP) CON FFMPEG
      await execFileAsync('ffmpeg', [
        '-y',
        '-i', inputGif,
        '-vf', 'scale=512:512:flags=lanczos:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000',
        '-vcodec', 'libwebp',
        '-lossless', '0',
        '-qscale', '40', // Calidad de compresión
        '-preset', 'default',
        '-loop', '0',
        '-an',
        '-vsync', '0',
        outputWebp
      ]);

      const textoFinal = `${accion.emoji} | *@${cleanJid(sender)}* ${accion.msg} *${targetName}*`;

      await sock.sendMessage(remoteJid, { delete: loadMsg.key });

      // 5️⃣ ENVIAR EL TEXTO PRIMERO (Con las menciones resaltadas)
      const textMsg = await sock.sendMessage(remoteJid, {
        text: textoFinal,
        mentions: mencionesParaEnviar
      }, { quoted: msg });

      // 6️⃣ ENVIAR EL STICKER RESPONDIENDO AL TEXTO
      await sock.sendMessage(remoteJid, {
        sticker: fs.readFileSync(outputWebp)
      }, { quoted: textMsg });

    } catch (err) {
      console.log(`❌ Error en Roleplay Sticker (${cmd}):`, err.message);
      return reply('❌ Ocurrió un error al generar el sticker. Intenta de nuevo.');
    } finally {
      // 7️⃣ LIMPIEZA DE MEMORIA (Vital para Termux)
      try { if (fs.existsSync(inputGif)) fs.unlinkSync(inputGif); } catch {}
      try { if (fs.existsSync(outputWebp)) fs.unlinkSync(outputWebp); } catch {}
    }
  }
};
