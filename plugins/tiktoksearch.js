'use strict';

const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const execFileAsync = promisify(execFile);

const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const searchSessions = new Map();

// 1. API NATIVA (TikWM - Muy estable)
async function searchTikWM(query) {
  try {
    const formData = new URLSearchParams();
    formData.append('keywords', query);
    const res = await fetch('https://tikwm.com/api/feed/search', {
      method: 'POST',
      body: formData
    });
    const json = await res.json();
    
    if (json.data && json.data.videos && json.data.videos.length > 0) {
      return json.data.videos.map(v => ({
        type: 'api',
        url: v.play,
        author: v.author?.nickname || 'Desconocido',
        title: v.title || 'Sin descripción'
      }));
    }
  } catch (e) {}
  return null;
}

// 2. EL TRUCO DEL PATO (Scraping de DuckDuckGo + yt-dlp)
async function searchDuckDuckGo(query) {
  try {
    const res = await fetch('https://lite.duckduckgo.com/lite/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      body: `q=site:tiktok.com/video/ ${encodeURIComponent(query)}`
    });
    const html = await res.text();
    
    // Extraer enlaces puros de TikTok del código fuente del navegador
    const regex = /https?:\/\/(?:www\.)?tiktok\.com\/@[^\/]+\/video\/\d+/g;
    const matches = html.match(regex) || [];
    const uniqueUrls = [...new Set(matches)];
    
    if (uniqueUrls.length > 0) {
      return uniqueUrls.map(url => ({
        type: 'duck',
        url: url,
        author: url.split('@')[1].split('/')[0], // Saca el @usuario del enlace
        title: 'Video extraído usando búsqueda web'
      }));
    }
  } catch (e) {}
  return null;
}

// Bajar video usando tu motor nativo para los resultados del pato
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

// Función maestra para enviar el video
async function sendTikTokResult(sock, remoteJid, videoData, msg, reply) {
  const caption = `🎬 *RESULTADO DE TIKTOK*\n\n👤 *Autor:* ${videoData.author}\n📝 *Desc:* ${videoData.title}\n\n👉 _Responde a este mensaje con la palabra *siguiente* para ver otro video._`;

  if (videoData.type === 'api') {
    // Si la API funcionó, lo manda instantáneo por URL
    return await sock.sendMessage(remoteJid, {
      video: { url: videoData.url },
      caption: caption,
      mimetype: 'video/mp4'
    }, { quoted: msg });
  } else {
    // Si la API falló, activa el truco del pato
    await reply('🦆 _Bypasseando bloqueos con el navegador del pato... descargando video._');
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

    // Intento 1: API. Intento 2: Truco del Pato.
    let videos = await searchTikWM(query);
    if (!videos) {
      videos = await searchDuckDuckGo(query);
    }

    if (!videos || videos.length === 0) {
      return reply('❌ Las APIs están saturadas y el navegador no arrojó resultados. Intenta de nuevo.');
    }

    try {
      const sentMsg = await sendTikTokResult(sock, remoteJid, videos[0], msg, reply);

      searchSessions.set(sentMsg.key.id, {
        query: query,
        videos: videos,
        currentIndex: 0,
        sender: sender 
      });

      // Limpia la sesión tras 5 minutos
      setTimeout(() => searchSessions.delete(sentMsg.key.id), 5 * 60 * 1000);
    } catch (e) {
      console.log('❌ Error enviando video:', e);
      await reply('❌ Error al enviar el video. Puede que sea demasiado pesado.');
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
