'use strict';

const axios = require('axios');

module.exports = {
  name: 'tweet',
  aliases: ['tw', 'twitter'],
  category: 'diversión',
  desc: 'Crea un tweet falso mencionando o respondiendo a un usuario',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    // 1️⃣ IDENTIFICAR OBJETIVO (Mención, Respuesta o Remitente)
    const isReply = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const isMention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const sender = msg.key.participant || msg.key.remoteJid;
    
    // Prioridad: 1° Mención, 2° Mensaje Respondido, 3° Quien envió el comando
    const targetJid = isMention || isReply || sender;

    // 2️⃣ EXTRAER EL TEXTO DEL TWEET
    // Limpiamos las menciones (@numero) del texto para que no salgan en el tweet
    let tweetText = args.join(' ').replace(/@\d+/g, '').trim();

    // Si respondió a un mensaje y no escribió texto extra, clonamos el texto del mensaje respondido
    if (!tweetText && isReply) {
      const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
      tweetText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '';
    }

    if (!tweetText) {
      return reply('❌ Debes escribir el texto del tweet.\n📌 *Ejemplo:* .tweet @amigo Me encanta el pan');
    }

    const loadMsg = await sock.sendMessage(remoteJid, { text: '🐦 _Generando tweet falso..._' }, { quoted: msg });

    try {
      // 3️⃣ OBTENER FOTO DE PERFIL
      let avatarUrl;
      try {
        avatarUrl = await sock.profilePictureUrl(targetJid, 'image');
      } catch (e) {
        // Fallback: Si el usuario ocultó su foto por privacidad, usamos una genérica
        avatarUrl = 'https://i.imgur.com/39aMpwD.png'; 
      }

      // 4️⃣ CREAR NOMBRE DE USUARIO (Extraemos el número de WhatsApp)
      const username = targetJid.split('@')[0];

      // 5️⃣ CONSTRUIR URL DE LA API
      const apiUrl = `https://some-random-api.com/canvas/misc/tweet?avatar=${encodeURIComponent(avatarUrl)}&username=${username}&displayname=${username}&comment=${encodeURIComponent(tweetText)}`;

      // 6️⃣ DESCARGAR Y ENVIAR DESDE RAM
      const imgRes = await axios.get(apiUrl, { 
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0' } // Evita bloqueos de seguridad
      });
      
      const bufferImagen = Buffer.from(imgRes.data);

      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      
      await sock.sendMessage(remoteJid, {
        image: bufferImagen
      }, { quoted: msg });

    } catch (err) {
      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      console.error('❌ Error en comando tweet:', err.message);
      return reply('❌ Ocurrió un error al generar la imagen. El servidor de canvas podría estar saturado.');
    }
  }
};
