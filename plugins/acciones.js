'use strict';

const axios = require('axios'); // 🔥 Inyectamos Axios para máxima estabilidad de red

// 📚 DICCIONARIO DE ACCIONES ANIME (15 Acciones Diferentes)
const acciones = {
  'abrazar':   { endpoint: 'hug',      emoji: '🫂', msg: 'le dio un fuerte abrazo a' },
  'besar':     { endpoint: 'kiss',     emoji: '💋', msg: 'le dio un tierno beso a' },
  'pegar':     { endpoint: 'slap',     emoji: '👊', msg: 'le dio una tremenda bofetada a' },
  'matar':     { endpoint: 'kill',     emoji: '🔪', msg: 'acaba de asesinar a' },
  'acariciar': { endpoint: 'pat',      emoji: '🥰', msg: 'está acariciando tiernamente a' },
  'morder':    { endpoint: 'bite',     emoji: '🧛', msg: 'le dio una mordida a' },
  'fastidiar': { endpoint: 'poke',     emoji: '👉', msg: 'está fastidiando a' },
  'llorar':    { endpoint: 'cry',      emoji: '😭', msg: 'está llorando desconsoladamente con' },
  'bailar':    { endpoint: 'dance',    emoji: '🕺', msg: 'se puso a bailar épicamente con' },
  'patear':    { endpoint: 'kick',     emoji: '🦵', msg: 'le metió una patada voladora a' },
  'lanzar':    { endpoint: 'yeet',     emoji: '🚀', msg: 'mandó a volar por los aires a' },
  'acurrucar': { endpoint: 'cuddle',   emoji: '🛌', msg: 'se está acurrucando cómodamente con' },
  'chocala':   { endpoint: 'highfive', emoji: '✋', msg: 'chocó los cinco con' },
  'golpear':   { endpoint: 'bonk',     emoji: '🔨', msg: 'le dio un mazozo en la cabeza a' },
  'lamer':     { endpoint: 'lick',     emoji: '👅', msg: 'le dio una lamida a' }
};

function cleanJid(jid = '') { 
  return String(jid).split('@')[0].split(':')[0].replace(/\D/g, ''); 
}

module.exports = {
  name: 'roleplay',
  aliases: Object.keys(acciones), // Se activará automáticamente con cualquiera de las 15 palabras
  category: 'diversión',
  desc: 'Interactúa con los miembros del grupo al estilo anime',

  execute: async ({ sock, msg, remoteJid, sender, pushName, args, commandName, reply }) => {
    const cmd = commandName.toLowerCase();
    const accion = acciones[cmd];

    if (!accion) return;

    // 1️⃣ DETECTAR A QUIÉN SE DIRIGE LA ACCIÓN
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const mentioned = contextInfo?.mentionedJid?.[0]; // Si mencionó con @
    const quotedUser = contextInfo?.participant;      // Si respondió a un mensaje

    let targetId = mentioned || quotedUser || null;
    let targetName = '';
    let mencionesParaEnviar = [];

    const senderName = pushName || 'Un usuario';

    if (targetId) {
      targetName = `@${cleanJid(targetId)}`;
      mencionesParaEnviar.push(targetId);
      mencionesParaEnviar.push(sender); // Mencionamos a ambos para que se resalte bonito
    } else if (args.length > 0) {
      targetName = args.join(' ');
    } else {
      return reply(`❌ Tienes que mencionar o responder a alguien.\n📌 *Ejemplo:* .${cmd} @amigo`);
    }

    if (targetId === sender) {
      return reply(`😅 No puedes usar *.${cmd}* contigo mismo, consíguete amigos pe.`);
    }

    const loadMsg = await sock.sendMessage(remoteJid, { text: `${accion.emoji} _Generando escena..._` }, { quoted: msg });

    try {
      // 2️⃣ CONECTAR A LA API USANDO AXIOS (Sin lags, sin cortes de red)
      const res = await axios.get(`https://api.waifu.pics/sfw/${accion.endpoint}`);
      const imageUrl = res.data.url;

      // 3️⃣ DESCARGAR LA IMAGEN A LA MEMORIA RAM
      const imageDownload = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const bufferImagen = Buffer.from(imageDownload.data);

      const textoFinal = `${accion.emoji} | *@${cleanJid(sender)}* ${accion.msg} *${targetName}*`;

      await sock.sendMessage(remoteJid, { delete: loadMsg.key });

      // 4️⃣ ENVIAR DESDE EL BUFFER
      await sock.sendMessage(remoteJid, {
        image: bufferImagen, // Enviamos como imagen fotográfica directa
        caption: textoFinal,
        mentions: mencionesParaEnviar
      }, { quoted: msg });

    } catch (err) {
      console.log(`❌ Error en Roleplay (${cmd}):`, err.message);
      return reply('❌ Ocurrió un error al descargar la imagen de anime. Intenta de nuevo.');
    }
  }
};
