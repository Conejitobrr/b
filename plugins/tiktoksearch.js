'use strict';

// Mapa para guardar las sesiones de búsqueda vinculadas al ID del mensaje enviado
const searchSessions = new Map();

module.exports = {
  name: 'tiktoksearch',
  aliases: ['tts', 'buscartiktok', 'buscarig'], // Agrega alias a gusto
  category: 'multimedia',
  desc: 'Busca videos en TikTok y permite navegar con "siguiente"',

  execute: async ({ sock, remoteJid, args, msg, sender, reply }) => {
    if (!args.length) {
      return reply('❌ Ingresa qué deseas buscar en TikTok.\n\nEjemplo:\n.tts gatitos graciosos');
    }

    const query = args.join(' ');
    await reply(`🔍 Buscando *${query}* en TikTok...`);

    try {
      // Usamos una API pública para búsquedas de TikTok
      const res = await fetch(`https://deliriussapi-oficial.vercel.app/search/tiktoksearch?query=${encodeURIComponent(query)}`);
      const json = await res.json();

      if (!json.status || !json.data || json.data.length === 0) {
        return reply('❌ No se encontraron resultados para esa búsqueda.');
      }

      const videos = json.data;
      const firstVideo = videos[0];

      const caption = `🎬 *RESULTADO DE TIKTOK*\n\n👤 *Autor:* ${firstVideo.author.nickname}\n📝 *Desc:* ${firstVideo.title}\n\n👉 _Responde a este mensaje con la palabra *siguiente* para ver otro video de esta búsqueda._`;

      // Enviamos el primer video
      const sentMsg = await sock.sendMessage(remoteJid, {
        video: { url: firstVideo.media[0] }, // La API suele devolver el link directo del video
        caption: caption,
        mimetype: 'video/mp4'
      }, { quoted: msg });

      // Guardamos la sesión vinculada al ID del mensaje que acaba de enviar el bot
      searchSessions.set(sentMsg.key.id, {
        query: query,
        videos: videos,
        currentIndex: 0, // Índice actual
        sender: sender // Opcional: para que solo el que buscó pueda dar siguiente
      });

      // Limpieza automática para no saturar memoria (Borra la sesión en 5 minutos)
      setTimeout(() => {
        searchSessions.delete(sentMsg.key.id);
      }, 5 * 60 * 1000);

    } catch (e) {
      console.log('❌ Error en TikTok Search:', e);
      await reply('❌ Ocurrió un error al conectar con el buscador de TikTok.');
    }
  },

  // Escuchador pasivo para detectar la respuesta "siguiente"
  onMessage: async ({ sock, msg, remoteJid, body, sender }) => {
    const text = String(body || '').toLowerCase().trim();
    
    // Si no dijo siguiente, ignoramos
    if (text !== 'siguiente' && text !== 'next') return;

    // Obtenemos el ID del mensaje al que está respondiendo
    const quotedMsgId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
    if (!quotedMsgId) return;

    // Verificamos si ese ID pertenece a una búsqueda activa
    if (searchSessions.has(quotedMsgId)) {
      const session = searchSessions.get(quotedMsgId);
      session.currentIndex++;

      if (session.currentIndex >= session.videos.length) {
        return sock.sendMessage(remoteJid, { text: '⚠️ Ya no hay más resultados para esta búsqueda.' }, { quoted: msg });
      }

      const nextVideo = session.videos[session.currentIndex];
      const caption = `🎬 *RESULTADO DE TIKTOK*\n\n👤 *Autor:* ${nextVideo.author.nickname}\n📝 *Desc:* ${nextVideo.title}\n\n👉 _Responde a este nuevo mensaje con *siguiente* para ver otro._`;

      // Enviamos el siguiente video
      const newSentMsg = await sock.sendMessage(remoteJid, {
        video: { url: nextVideo.media[0] },
        caption: caption,
        mimetype: 'video/mp4'
      }, { quoted: msg });

      // Borramos el ID viejo y vinculamos la sesión al ID del nuevo mensaje
      searchSessions.delete(quotedMsgId);
      searchSessions.set(newSentMsg.key.id, session);

      // Renovamos la limpieza automática
      setTimeout(() => {
        searchSessions.delete(newSentMsg.key.id);
      }, 5 * 60 * 1000);
    }
  }
};
