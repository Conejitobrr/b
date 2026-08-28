'use strict';

const searchSessions = new Map();

// 🔥 Sistema Multi-API para garantizar que siempre encuentre resultados
async function fetchTikTokSearch(query) {
  const apis = [
    `https://api.siputzx.my.id/api/tiktok/search?query=${encodeURIComponent(query)}`,
    `https://api.vreden.my.id/api/tiktoksearch?query=${encodeURIComponent(query)}`,
    `https://api.agatz.xyz/api/tiktoksearch?text=${encodeURIComponent(query)}`,
    `https://deliriussapi-oficial.vercel.app/search/tiktoksearch?query=${encodeURIComponent(query)}`
  ];

  for (const url of apis) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      let json;
      
      try { json = JSON.parse(text); } catch (e) { continue; }

      const videos = json.data || json.result || json.BK9 || json.videos;
      
      if (videos && Array.isArray(videos) && videos.length > 0) {
        return videos; // Retorna la primera API que funcione correctamente
      }
    } catch (e) {
      continue; // Si una falla, salta a la siguiente
    }
  }
  return null; // Si todas fallan
}

// Normalizador de datos (cada API devuelve los nombres de variables diferentes)
function extractVideoData(videoObj) {
  const videoUrl = videoObj.play || videoObj.media?.[0] || videoObj.video || videoObj.no_watermark || videoObj.url;
  const authorName = videoObj.author?.nickname || videoObj.author?.name || videoObj.author || 'Desconocido';
  const title = videoObj.title || videoObj.desc || 'Sin descripción';
  return { videoUrl, authorName, title };
}

module.exports = {
  name: 'tiktoksearch',
  aliases: ['tts', 'buscartiktok'],
  category: 'multimedia',
  desc: 'Busca videos en TikTok y permite navegar con "siguiente"',

  execute: async ({ sock, remoteJid, args, msg, sender, reply }) => {
    if (!args.length) {
      return reply('❌ Ingresa qué deseas buscar en TikTok.\n\nEjemplo:\n.tts te estoy correteando');
    }

    const query = args.join(' ');
    await reply(`🔍 Buscando *${query}* en TikTok...`);

    const videos = await fetchTikTokSearch(query);

    if (!videos) {
      return reply('❌ Las APIs de búsqueda están saturadas o no se encontraron resultados. Intenta de nuevo.');
    }

    const { videoUrl, authorName, title } = extractVideoData(videos[0]);

    if (!videoUrl) {
      return reply('❌ Se encontraron resultados, pero no se pudo extraer el enlace del video.');
    }

    const caption = `🎬 *RESULTADO DE TIKTOK*\n\n👤 *Autor:* ${authorName}\n📝 *Desc:* ${title}\n\n👉 _Responde a este mensaje con la palabra *siguiente* para ver otro video de esta búsqueda._`;

    try {
      const sentMsg = await sock.sendMessage(remoteJid, {
        video: { url: videoUrl },
        caption: caption,
        mimetype: 'video/mp4'
      }, { quoted: msg });

      searchSessions.set(sentMsg.key.id, {
        query: query,
        videos: videos,
        currentIndex: 0,
        sender: sender 
      });

      // Limpieza automática en 5 minutos
      setTimeout(() => searchSessions.delete(sentMsg.key.id), 5 * 60 * 1000);
    } catch (e) {
      await reply('❌ Error al enviar el video al chat. Es posible que el archivo sea demasiado pesado o el enlace haya caducado.');
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

      const { videoUrl, authorName, title } = extractVideoData(session.videos[session.currentIndex]);
      const caption = `🎬 *RESULTADO DE TIKTOK*\n\n👤 *Autor:* ${authorName}\n📝 *Desc:* ${title}\n\n👉 _Responde a este nuevo mensaje con *siguiente* para ver otro._`;

      try {
        const newSentMsg = await sock.sendMessage(remoteJid, {
          video: { url: videoUrl },
          caption: caption,
          mimetype: 'video/mp4'
        }, { quoted: msg });

        searchSessions.delete(quotedMsgId);
        searchSessions.set(newSentMsg.key.id, session);

        setTimeout(() => searchSessions.delete(newSentMsg.key.id), 5 * 60 * 1000);
      } catch (e) {
        await sock.sendMessage(remoteJid, { text: '❌ Error al cargar el siguiente video.' }, { quoted: msg });
      }
    }
  }
};
