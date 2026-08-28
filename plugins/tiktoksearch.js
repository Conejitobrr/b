'use strict';

// Mapa para guardar las sesiones de búsqueda vinculadas al ID del mensaje enviado
const searchSessions = new Map();

module.exports = {
  name: 'tiktoksearch',
  aliases: ['tts', 'buscartiktok'],
  category: 'multimedia',
  desc: 'Busca videos en TikTok y permite navegar con "siguiente"',

  execute: async ({ sock, remoteJid, args, msg, sender, reply }) => {
    if (!args.length) {
      return reply('❌ Ingresa qué deseas buscar en TikTok.\n\nEjemplo:\n.tts gatitos graciosos');
    }

    const query = args.join(' ');
    await reply(`🔍 Buscando *${query}* en TikTok...`);

    try {
      // 🔥 Cambiamos a una API más estable
      const res = await fetch(`https://api.siputzx.my.id/api/tiktok/search?query=${encodeURIComponent(query)}`);
      const textRes = await res.text(); // Leemos como texto primero para evitar crasheos

      let json;
      try {
        json = JSON.parse(textRes);
      } catch (e) {
        return reply('❌ La API pública de búsqueda está saturada en este momento. Intenta de nuevo más tarde.');
      }

      // 🔥 Adaptador Universal: Busca el array de videos sin importar cómo lo devuelva la API
      const videos = json.data || json.result || json.BK9 || json.videos;

      if (!videos || !Array.isArray(videos) || videos.length === 0) {
        return reply('❌ No se encontraron resultados para esa búsqueda.');
      }

      const firstVideo = videos[0];
      
      // Adaptador para enlaces de video y nombres
      const videoUrl = firstVideo.play || firstVideo.media?.[0] || firstVideo.video || firstVideo.no_watermark;
      const authorName = firstVideo.author?.nickname || firstVideo.author?.name || firstVideo.author || 'Desconocido';
      const title = firstVideo.title || firstVideo.desc || 'Sin descripción';

      if (!videoUrl) {
        return reply('❌ Se encontraron resultados, pero la API no proporcionó el enlace del video.');
      }

      const caption = `🎬 *RESULTADO DE TIKTOK*\n\n👤 *Autor:* ${authorName}\n📝 *Desc:* ${title}\n\n👉 _Responde a este mensaje con la palabra *siguiente* para ver otro video de esta búsqueda._`;

      const sentMsg = await sock.sendMessage(remoteJid, {
        video: { url: videoUrl },
        caption: caption,
        mimetype: 'video/mp4'
      }, { quoted: msg });

      // Guardamos la sesión
      searchSessions.set(sentMsg.key.id, {
        query: query,
        videos: videos,
        currentIndex: 0,
        sender: sender 
      });

      // Limpieza automática en 5 minutos
      setTimeout(() => searchSessions.delete(sentMsg.key.id), 5 * 60 * 1000);

    } catch (e) {
      console.log('❌ Error en TikTok Search:', e);
      await reply('❌ Ocurrió un error interno al conectar con el buscador.');
    }
  },

  onMessage: async ({ sock, msg, remoteJid, body, sender }) => {
    const text = String(body || '').toLowerCase().trim();
    if (text !== 'siguiente' && text !== 'next') return;

    const quotedMsgId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
    if (!quotedMsgId) return;

    if (searchSessions.has(quotedMsgId)) {
      const session = searchSessions.get(quotedMsgId);
      session.currentIndex++;

      if (session.currentIndex >= session.videos.length) {
        return sock.sendMessage(remoteJid, { text: '⚠️ Ya no hay más resultados para esta búsqueda.' }, { quoted: msg });
      }

      const nextVideo = session.videos[session.currentIndex];
      const videoUrl = nextVideo.play || nextVideo.media?.[0] || nextVideo.video || nextVideo.no_watermark;
      const authorName = nextVideo.author?.nickname || nextVideo.author?.name || nextVideo.author || 'Desconocido';
      const title = nextVideo.title || nextVideo.desc || 'Sin descripción';

      const caption = `🎬 *RESULTADO DE TIKTOK*\n\n👤 *Autor:* ${authorName}\n📝 *Desc:* ${title}\n\n👉 _Responde a este nuevo mensaje con *siguiente* para ver otro._`;

      const newSentMsg = await sock.sendMessage(remoteJid, {
        video: { url: videoUrl },
        caption: caption,
        mimetype: 'video/mp4'
      }, { quoted: msg });

      searchSessions.delete(quotedMsgId);
      searchSessions.set(newSentMsg.key.id, session);

      setTimeout(() => searchSessions.delete(newSentMsg.key.id), 5 * 60 * 1000);
    }
  }
};
