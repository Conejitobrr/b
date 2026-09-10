'use strict';

const axios = require('axios');

// 📚 NUEVO DICCIONARIO (Adaptado a Nekos.best - Súper Estable)
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
  desc: 'Interactúa con los miembros del grupo con GIFs de anime',

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

    const loadMsg = await sock.sendMessage(remoteJid, { text: `${accion.emoji} _Buscando la escena perfecta..._` }, { quoted: msg });

    try {
      // 2️⃣ CONECTAR A LA NUEVA API (Nekos.best)
      const res = await axios.get(`https://nekos.best/api/v2/${accion.endpoint}`);
      const imageUrl = res.data.results[0].url;

      const textoFinal = `${accion.emoji} | *@${cleanJid(sender)}* ${accion.msg} *${targetName}*`;

      await sock.sendMessage(remoteJid, { delete: loadMsg.key });

      // 3️⃣ ENVIAR COMO GIF ANIMADO
      await sock.sendMessage(remoteJid, {
        video: { url: imageUrl }, // Lo mandamos como video
        caption: textoFinal,
        gifPlayback: true,        // Esto hace que WhatsApp lo reproduzca en bucle como un GIF
        mentions: mencionesParaEnviar
      }, { quoted: msg });

    } catch (err) {
      console.log(`❌ Error en Roleplay (${cmd}):`, err.message);
      return reply('❌ Ocurrió un error al contactar con la base de datos de anime. Intenta de nuevo.');
    }
  }
};
