'use strict';

const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const execFileAsync = promisify(execFile);

const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const searchSessions = new Map();

// 1. SISTEMA MULTI-API (Las más recientes y estables)
async function searchWithApis(query) {
  const apis = [
    `https://aemt.me/tiktoksearch?text=${encodeURIComponent(query)}`,
    `https://api.tiklydown.eu.org/api/search?q=${encodeURIComponent(query)}`,
    `https://api.siputzx.my.id/api/tiktok/search?query=${encodeURIComponent(query)}`
  ];

  for (const url of apis) {
    try {
      const res = await fetch(url, { timeout: 10000 });
      const json = await res.json();
      
      const result = json.result || json.data || json;
      const videos = Array.isArray(result) ? result : (result.videos || result.data);

      if (videos && Array.isArray(videos) && videos.length > 0) {
        return videos.map(v => ({
          type: 'api',
          url: v.play || v.video || v.media?.[0] || v.no_watermark || v.url,
          author: v.author?.nickname || v.author?.name || v.author || 'Desconocido',
          title: v.title || v.desc || 'Sin descripción'
        })).filter(v => v.url); 
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

// 2. EL TRUCO DEL PATO MEJORADO (Disfrazado de Chrome)
async function searchDuckDuckGo(query) {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent('site:tiktok.com/video/ ' + query)}`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await res.text();
    
    // Cazar cualquier link de video de TikTok ignorando basura web
    const regex = /https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9_.-]+\/video\/\d+/g;
    const matches = html.match(regex) || [];
    const uniqueUrls = [...new Set(matches)];
    
    if (uniqueUrls.length > 0) {
      return uniqueUrls.map(url => ({
        type: 'duck',
        url: url,
        author: url.split('@')[1]?.split('/')[0] || 'Desconocido',
        title: '🎥 Video extraído por búsqueda web'
      }));
    }
  } catch (e) {}
  return null;
}

async function downloadWithYtDlp(url) {
  const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
  const file = path.join(TEMP_DIR, `tts_duck_${id}.mp4`);
  await execFileAsync('yt-dlp', [
    '-f', 'mp4',
    '--no-playlist',
    '--add-header', 'user-agent:Mozilla/5.0',
    '-o', file,
    url
  ]);
  return file;
}

async function sendTikTokResult(sock, remoteJid, videoData, msg, reply) {
  const caption = `🎬 *RESULTADO DE TIKTOK*\n\n👤 *Autor:* @${videoData.author}\n📝 *Desc:* ${videoData.title}\n\n👉 _Responde a este mensaje con la palabra *siguiente* para ver otro video._`;

  if (videoData.type === 'api') {
    return await sock.sendMessage(remoteJid, {
      video: { url: videoData.url },
      caption: caption,
      mimetype: 'video/mp4'
    }, { quoted: msg });
  } else {
    const downloadedFile = await downloadWithYtDlp(videoData.url);
    const sentMsg = await sock.sendMessage(remoteJid, {
      video: fs.readFileSync(downloadedFile),
      caption: caption,
      mimetype: 'video/mp4'
    }, { quoted: msg });
    
    try { fs.unlinkSync(downloadedFile); } catch {}
    return sentMsg;
  }
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

    let videos = await searchWithApis(query);
    if (!videos) {
      videos = await searchDuckDuckGo(query);
    }

    if (!videos || videos.length === 0) {
      return reply('❌ Los sistemas de TikTok bloquearon la búsqueda temporalmente. Intenta con otras palabras o más tarde.');
    }

    try {
      const sentMsg = await sendTikTokResult(sock, remoteJid, videos[0], msg, reply);

      searchSessions.set(sentMsg.key.id, {
        query: query,
        videos: videos,
        currentIndex: 0,
        sender: sender 
      });

      setTimeout(() => searchSessions.delete(sentMsg.key.id), 5 * 60 * 1000);
    } catch (e) {
      await reply('❌ Error al enviar el video. Es posible que el archivo sea demasiado pesado.');
    }
  },

  onMessage: async ({ sock, msg, remoteJid, body, sender, reply }) => {
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

      try {
        const nextVideoData = session.videos[session.currentIndex];
        const newSentMsg = await sendTikTokResult(sock, remoteJid, nextVideoData, msg, reply);

        searchSessions.delete(quotedMsgId);
        searchSessions.set(newSentMsg.key.id, session);

        setTimeout(() => searchSessions.delete(newSentMsg.key.id), 5 * 60 * 1000);
      } catch (e) {
        await sock.sendMessage(remoteJid, { text: '❌ Error al cargar el siguiente video.' }, { quoted: msg });
      }
    }
  }
};
