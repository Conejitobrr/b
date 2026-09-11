'use strict';

const axios = require('axios');

module.exports = {
  name: 'tweet',
  aliases: ['tw', 'twitter'],
  category: 'diversión',
  desc: 'Crea un tweet falso realista con métricas aleatorias',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    const isReply = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const isMention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const sender = msg.key.participant || msg.key.remoteJid;
    
    // Identificar a la víctima
    const targetJid = isMention || isReply || sender;
    
    // Limpiar menciones (@numero) del texto bruto
    let rawText = args.join(' ').replace(/@\d+/g, '').trim();
    if (!rawText && isReply) {
      const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
      rawText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '';
    }

    if (!rawText) {
      return reply('❌ Faltan datos.\n📌 *Uso normal:* .tweet @usuario Texto\n📌 *Con nombre falso:* .tweet @usuario ElNick | Texto');
    }

    const loadMsg = await sock.sendMessage(remoteJid, { text: '🐦 _Falsificando interacciones..._' }, { quoted: msg });

    try {
      // 1️⃣ GESTIÓN DE NOMBRES
      let displayName = 'Usuario';
      if (targetJid === sender) displayName = msg.pushName || 'Usuario';
      let tweetText = rawText;
      
      // Permitir forzar un nombre personalizado dividiendo con el símbolo "|"
      if (rawText.includes('|')) {
        const partes = rawText.split('|');
        displayName = partes[0].trim();
        tweetText = partes[1].trim();
      }

      // Crear un @username estético (Ej: jose965 en vez del número completo)
      const shortName = displayName.split(' ')[0].replace(/[^a-zA-Z]/g, '') || 'user';
      const shortNum = targetJid.split('@')[0].slice(-3);
      const username = `${shortName.toLowerCase()}${shortNum}`;

      // 2️⃣ OBTENER FOTO Y MÉTRICAS
      let avatarUrl = 'https://i.imgur.com/39aMpwD.png';
      try { avatarUrl = await sock.profilePictureUrl(targetJid, 'image'); } catch (e) {}

      // Generar números aleatorios para darle realismo viral
      const likes = Math.floor(Math.random() * 80000) + 500;
      const retweets = Math.floor(Math.random() * 15000) + 100;
      const replies = Math.floor(Math.random() * 5000) + 50;

      // 3️⃣ GENERAR IMAGEN
      const apiUrl = `https://some-random-api.com/canvas/misc/tweet?avatar=${encodeURIComponent(avatarUrl)}&username=${encodeURIComponent(username)}&displayname=${encodeURIComponent(displayName)}&comment=${encodeURIComponent(tweetText)}&likes=${likes}&retweets=${retweets}&replies=${replies}`;

      const imgRes = await axios.get(apiUrl, { 
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      await sock.sendMessage(remoteJid, { image: Buffer.from(imgRes.data) }, { quoted: msg });

    } catch (err) {
      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      return reply('❌ Ocurrió un error. Intenta con un texto más corto.');
    }
  }
};
