'use strict';

const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const execFileAsync = promisify(execFile);

const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const searchSessions = new Map();

// ==========================================
// 🛡️ MOTOR 1: APIs MÚLTIPLES
// ==========================================
async function searchApis(query) {
  const apis = [
    `https://deliriussapi-oficial.vercel.app/search/tiktoksearch?query=${encodeURIComponent(query)}`,
    `https://api.siputzx.my.id/api/tiktok/search?query=${encodeURIComponent(query)}`,
    `https://aemt.me/tiktoksearch?text=${encodeURIComponent(query)}`
  ];

  for (const url of apis) {
    try {
      const res = await fetch(url, { timeout: 7000 });
      const json = await res.json();
      
      let data = json.data || json.result || json.BK9 || json;
      let arr = Array.isArray(data) ? data : (data.videos || data.data);

      if (Array.isArray(arr) && arr.length > 0) {
        const mapped = arr.map(v => {
          const videoUrl = v.play || v.video || v.media?.[0] || v.no_watermark || v.url;
          if (!videoUrl) return null;
          return {
            type: 'api',
            sourceUrl: videoUrl,
            author: v.author?.nickname || v.author?.name || v.author || 'Usuario',
            title: v.title || v.desc || 'Video encontrado vía API'
          };
        }).filter(Boolean);
        if (mapped.length > 0) return mapped;
      }
    } catch (e) { continue; }
  }
  return null;
}

// ==========================================
// 🛡️ MOTOR 2: DECODIFICADOR DUCKDUCKGO
// ==========================================
async function scrapeDuckDuckGo(query) {
  try {
    const res = await fetch('https://lite.duckduckgo.com/lite/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: `q=${encodeURIComponent('site:tiktok.com/video/ ' + query)}`
    });
    const html = await res.text();
    
    const links = [];
    // 🔓 Capturamos los enlaces encriptados por DuckDuckGo
    const regex = /uddg=([^&]+)/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      try {
        // 🔓 Los desencriptamos a texto plano
        const decoded = decodeURIComponent(match[1]);
        if (/tiktok\.com\/@[A-Za-z0-9_.-]+\/video\/\d+/.test(decoded)) {
          links.push(decoded.split('?')[0]); // Limpiamos la URL
        }
      } catch (e) {}
    }
    
    const unique = [...new Set(links)];
    if (unique.length > 0) {
      return unique.map(url => ({
        type: 'scraper',
        sourceUrl: url,
        author: url.split('@')[1]?.split('/')[0] || 'Desconocido',
        title: '🎥 Búsqueda Web (DuckDuckGo)'
      }));
    }
  } catch (e) {}
  return null;
}

// ==========================================
// 🛡️ MOTOR 3: SCRAPER DE YAHOO
// ==========================================
async function scrapeYahoo(query) {
  try {
    const res = await fetch(`https://search.yahoo.com/search?p=${encodeURIComponent('site:tiktok.com/video/ ' + query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const html = await res.text();
    const regex = /https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9_.-]+\/video\/\d+/g;
    const matches = html.match(regex) || [];
    const unique = [...new Set(matches)];
    
    if (unique.length > 0) {
      return unique.map(url => ({
        type: 'scraper',
        sourceUrl: url,
        author: url.split('@')[1]?.split('/')[0] || 'Desconocido',
        title: '🎥 Búsqueda Web (Yahoo)'
      }));
    }
  } catch(e) {}
  return null;
}

// ==========================================
// 📥 MOTOR DE DESCARGA INFALIBLE
// ==========================================
async function forceDownload(url) {
  const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
  const file = path.join(TEMP_DIR, `tts_force_${id}.mp4`);
  
  await execFileAsync('yt-dlp', [
    '-f', 'mp4',
    '--no-playlist',
    '--add-header', 'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    '--ignore-errors',
    '--no-warnings',
    '-o', file,
    url
  ]);
  
  if (!fs.existsSync(file)) throw new Error('yt-dlp falló');
  return file;
}

// ==========================================
// 🚀 PROCESADOR Y ENVIADOR
// ==========================================
async function processAndSend(sock, remoteJid, videoData, msg, reply) {
  const caption = `🎬 *RESULTADO DE TIKTOK*\n\n👤 *Autor:* @${videoData.author}\n📝 *Desc:* ${videoData.title}\n\n👉 _Responde a este mensaje con la palabra *siguiente* para ver otro._`;

  if (videoData.type === 'api') {
    try {
      return await sock.sendMessage(remoteJid, {
        video: { url: videoData.sourceUrl },
        caption: caption,
        mimetype: 'video/mp4'
      }, { quoted: msg });
    } catch (err) {}
  }

  // Descarga forzada para los scrapers o si la API falla al enviar
  const downloadedFile = await forceDownload(videoData.sourceUrl);
  const sentMsg = await sock.sendMessage(remoteJid, {
    video: fs.readFileSync(downloadedFile),
    caption: caption,
    mimetype: 'video/mp4'
  }, { quoted: msg });
  
  try { fs.unlinkSync(downloadedFile); } catch {}
  return sentMsg;
}

// ==========================================
// 🎮 COMANDO PRINCIPAL
// ==========================================
module.exports = {
  name: 'tiktoksearch',
  aliases: ['tts', 'buscartiktok'],
  category: 'multimedia',
  desc: 'Búsqueda extrema y decodificada de TikToks',

  execute: async ({ sock, remoteJid, args, msg, sender, reply }) => {
    if (!args.length) return reply('❌ Ingresa qué deseas buscar.\n\nEjemplo:\n.tts te estoy correteando');

    const query = args.join(' ');
    await reply(`🔍 Ejecutando búsqueda extrema para *${query}*...`);

    let videos = await searchApis(query);
    if (!videos) {
      await reply('🦆 _APIs bloqueadas. Activando decodificación del navegador..._');
      videos = await scrapeDuckDuckGo(query);
    }
    if (!videos) {
      videos = await scrapeYahoo(query);
    }

    if (!videos || videos.length === 0) {
      return reply('❌ TikTok ha bloqueado todas las conexiones. Intenta con otra palabra.');
    }

    try {
      const sentMsg = await processAndSend(sock, remoteJid, videos[0], msg, reply);

      searchSessions.set(sentMsg.key.id, {
        videos: videos,
        currentIndex: 0
      });

      setTimeout(() => searchSessions.delete(sentMsg.key.id), 5 * 60 * 1000);
    } catch (e) {
      await reply('❌ Error al enviar el archivo. Puede ser demasiado pesado.');
    }
  },

  onMessage: async ({ sock, msg, remoteJid, body, reply }) => {
    const text = String(body || '').toLowerCase().trim();
    if (text !== 'siguiente' && text !== 'next') return;

    const quotedMsgId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
    if (!quotedMsgId || !searchSessions.has(quotedMsgId)) return;

    const session = searchSessions.get(quotedMsgId);
    session.currentIndex++;

    if (session.currentIndex >= session.videos.length) {
      return reply('⚠️ Se agotaron los resultados de esta búsqueda.');
    }

    try {
      const sentMsg = await processAndSend(sock, remoteJid, session.videos[session.currentIndex], msg, reply);
      
      searchSessions.delete(quotedMsgId);
      searchSessions.set(sentMsg.key.id, session);
      
      setTimeout(() => searchSessions.delete(sentMsg.key.id), 5 * 60 * 1000);
    } catch (e) {
      await reply('❌ Error al forzar el siguiente video.');
    }
  }
};
