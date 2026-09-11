'use strict';

const axios = require('axios');

module.exports = {
  name: 'tweet',
  aliases: ['tw', 'twitter'],
  category: 'diversión',
  desc: 'Crea un tweet falso con el nombre real de WhatsApp sin citar el comando',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    const isReply = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const isMention = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const sender = msg.key.participant || msg.key.remoteJid;
    
    const targetJid = isMention || isReply || sender;
    
    let rawText = args.join(' ').replace(/@\d+/g, '').trim();
    if (!rawText && isReply) {
      const quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
      rawText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '';
    }

    if (!rawText) {
      return reply('❌ Faltan datos.\n📌 *Uso:* .tweet @usuario [Texto]\n📌 *Con nick forzado:* .tweet @usuario [Nombre] | [Texto]');
    }

    try {
      // 1️⃣ EXTRACCIÓN DEL NOMBRE REAL DE WHATSAPP (Metadata de Grupo / Contacto)
      let displayName = 'Usuario';

      if (targetJid === sender && msg.pushName) {
        displayName = msg.pushName;
      } else {
        try {
          // Intentamos obtener el nombre si es un grupo
          const groupMetadata = await sock.groupMetadata(remoteJid).catch(() => null);
          if (groupMetadata) {
            const participant = groupMetadata.participants.find(p => p.id === targetJid);
            if (participant && participant.notify) displayName = participant.notify;
          }
          // Si no está en el grupo, buscamos en la agenda del bot
          if (displayName === 'Usuario') {
            const contact = await sock.onWhatsApp(targetJid);
            if (contact && contact[0]?.notify) displayName = contact[0].notify;
          }
        } catch (e) {}
      }

      let tweetText = rawText;
      
      // Permitir sobrescribir el nombre con el símbolo "|"
      if (rawText.includes('|')) {
        const partes = rawText.split('|');
        displayName = partes[0].trim();
        tweetText = partes[1].trim();
      }

      const shortName = displayName.split(' ')[0].replace(/[^a-zA-Z]/g, '') || 'user';
      const shortNum = targetJid.split('@')[0].slice(-3);
      const username = `${shortName.toLowerCase()}${shortNum}`;

      // 2️⃣ FOTO DE PERFIL Y MÉTRICAS
      let avatarUrl = 'https://i.imgur.com/39aMpwD.png';
      try { avatarUrl = await sock.profilePictureUrl(targetJid, 'image'); } catch (e) {}

      const likes = Math.floor(Math.random() * 80000) + 500;
      const retweets = Math.floor(Math.random() * 15000) + 100;
      const replies = Math.floor(Math.random() * 5000) + 50;

      const apiUrl = `https://some-random-api.com/canvas/misc/tweet?avatar=${encodeURIComponent(avatarUrl)}&username=${encodeURIComponent(username)}&displayname=${encodeURIComponent(displayName)}&comment=${encodeURIComponent(tweetText)}&likes=${likes}&retweets=${retweets}&replies=${replies}`;

      const imgRes = await axios.get(apiUrl, { 
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      // ENVIAR SIN CITAR (Eliminamos el { quoted: msg } para que la foto vaya limpia)
      await sock.sendMessage(remoteJid, { image: Buffer.from(imgRes.data) });

    } catch (err) {
      console.error('Error en tweet:', err);
      return reply('❌ Ocurrió un error al generar el tweet.');
    }
  }
};
