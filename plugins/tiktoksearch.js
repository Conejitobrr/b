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
// 🛡️ MOTOR 1: APIs PREMIUM Y CONFIGURACIÓN EXACTA
// ==========================================
async function fetchAllSources(query) {
  // Fuente 1: TikWM (Método POST exacto con parámetros obligatorios)
  try {
    const res = await fetch('https://tikwm.com/api/feed/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `keywords=${encodeURIComponent(query)}&count=12&cursor=0`
    });
    const json = await res.json();
    if (json.data && json.data.videos && json.data.videos.length > 0) {
      return json.data.videos.map(v => ({
        url: v.play, author: v.author?.unique_id || 'Usuario', title: v.title || 'TikTok'
      }));
    }
  } catch (e) {}

  // Fuente 2: API Premium BK9
  try {
    const res = await fetch(`https://bk9.fun/search/tiktok?q=${encodeURIComponent(query)}`);
    const json = await res.json();
    if (json.BK9 && json.BK9.length > 0) {
      return json.BK9.map(v => ({
        url: v.play || v.video || v.url, author: v.author?.nickname || 'Usuario', title: v.title || 'TikTok'
      }));
    }
  } catch (e) {}

  // Fuente 3: Gifted Tech (Estabilidad Alta)
  try {
    const res = await fetch(`https://api.giftedtech.my.id/api/search/tiktoksearch?apikey=gifted&query=${encodeURIComponent(query)}`);
    const json = await res.json();
    if (json.results && json.results.length > 0) {
      return json.results.map(v => ({
        url: v.url || v.play, author: v.author || 'Usuario', title: v.title || 'TikTok'
      }));
    }
  } catch (e) {}

  return null;
}

// ==========================================
// 📥 MOTOR 2: DESCARGA LOCAL (EVITA EL ERROR 403 DE WHATSAPP)
// ==========================================
async function downloadLocal(url) {
  const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
  const file = path.join(TEMP_DIR, `tts_final_${id}.mp4`);
  
  // Intento 1: Descarga directa engañando al CDN
  try {
    const res = await fetch(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 
        'Referer': 'https://www.tiktok.com/' 
      } 
    });
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(file, Buffer.from(buffer));
    // Validar que no haya descargado un archivo corrupto o vacío
    if (fs.existsSync(file) && fs.statSync(file).size > 50000) return file;
  } catch (e) {}

  // Intento 2: yt-dlp como fuerza bruta
  try {
    await execFileAsync('yt-dlp', ['-f', 'mp4', '--no-playlist', '-o', file, url]);
    if (fs.existsSync(file)) return file;
  } catch (e) {}

  throw new Error('Fallo absoluto en descarga');
}

// ==========================================
// 🚀 PROCESADOR Y ENVIADOR
// ==========================================
async function sendTikTokResult(sock, remoteJid, videoData, msg) {
  const caption = `🎬 *RESULTADO DE TIKTOK*\n\n👤 *Autor:* @${videoData.author}\n📝 *Desc:* ${videoData.title}\n\n👉 _Responde a este mensaje con la palabra *siguiente* para ver otro._`;
  
  const file = await downloadLocal(videoData.url);
  const sentMsg = await sock.sendMessage(remoteJid, {
    video: fs.readFileSync(file),
    caption: caption,
    mimetype: 'video/mp4'
  }, { quoted: msg });
  
  try { fs.unlinkSync(file); } catch {}
  return sentMsg;
}

// ==========================================
// 🎮 COMANDO PRINCIPAL
// ==========================================
module.exports = {
  name: 'tiktoksearch',
  aliases: ['tts', 'buscartiktok'],
  category: 'multimedia',
  desc: 'Búsqueda absoluta de TikTok',

  execute: async ({ sock, remoteJid, args, msg, reply }) => {
    if (!args.length) return reply('❌ Ingresa qué deseas buscar.\n\nEjemplo:\n.tts te estoy correteando');

    const query = args.join(' ');
    await reply(`🔍 Ejecutando búsqueda compleja para *${query}*...`);

    const videos = await fetchAllSources(query);
    if (!videos || videos.length === 0) {
      return reply('❌ Error extremo: Servidores caídos o sin resultados. Intenta otra búsqueda.');
    }

    try {
      const sentMsg = await sendTikTokResult(sock, remoteJid, videos[0], msg);
      
      searchSessions.set(sentMsg.key.id, { videos, currentIndex: 0 });
      setTimeout(() => searchSessions.delete(sentMsg.key.id), 5 * 60 * 1000);
    } catch (e) {
      await reply('❌ Error al procesar el archivo del video. Intenta de nuevo.');
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
      const sentMsg = await sendTikTokResult(sock, remoteJid, session.videos[session.currentIndex], msg);
      
      searchSessions.delete(quotedMsgId);
      searchSessions.set(sentMsg.key.id, session);
      setTimeout(() => searchSessions.delete(sentMsg.key.id), 5 * 60 * 1000);
    } catch (e) {
      await reply('❌ Error al cargar el siguiente video.');
    }
  }
};
