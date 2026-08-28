'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const yts = require('yt-search');

const execFileAsync = promisify(execFile);
const TEMP_DIR = path.join(process.cwd(), 'temp');

// ⏳ COLA POR CHAT: 1 canción cada 2 minutos
const QUEUE_DELAY = 2 * 60 * 1000;
const queues = new Map();
const processingChats = new Set();
const warnedChats = new Map(); 

function ensureTemp() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function isYouTubeUrl(text = '') {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(text);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchYouTube(query) {
  const res = await yts(query);
  if (!res.videos?.length) return null;

  return (
    res.videos.find(v =>
      v.url &&
      !v.title?.toLowerCase().includes('mix') &&
      !v.title?.toLowerCase().includes('playlist')
    ) || res.videos[0]
  );
}

async function downloadAudio(url, output) {
  // 🔥 Optimizado a 128K para descarga y envío ultra rápidos
  await execFileAsync('yt-dlp', [
    '--extractor-args', 'youtube:player_client=android',
    '--geo-bypass',
    '--force-ipv4',
    '--no-playlist',
    '--ignore-errors',
    '--no-warnings',
    '-f', 'ba/b',
    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '128K', 
    '-o', output,
    url
  ]);
}

function sanitizeFileName(name = 'audio') {
  return String(name)
    .replace(/[\\/:*?"<>|]/g, '')
    .slice(0, 80)
    .trim() || 'audio';
}

async function processQueue(chatId) {
  if (processingChats.has(chatId)) return;

  processingChats.add(chatId);
  const queue = queues.get(chatId) || [];

  while (queue.length > 0) {
    const job = queue.shift();

    try {
      await handleDownload(job);
    } catch (err) {
      console.log('❌ Error en cola play:', err?.message || err);
      await job.sock.sendMessage(job.remoteJid, { text: '❌ Error al procesar esta canción.' }, { quoted: job.msg });
    }

    warnedChats.delete(chatId);

    if (queue.length > 0) {
      await sleep(QUEUE_DELAY);
    }
  }

  queues.delete(chatId);
  processingChats.delete(chatId);
  warnedChats.delete(chatId);
}

async function handleDownload(job) {
  const { sock, remoteJid, msg, query } = job;
  let file = null;
  let finalPath = null;

  try {
    ensureTemp();
    let url = query;
    let title = 'Audio de YouTube';
    let videoInfo = null;

    if (!isYouTubeUrl(query)) {
      videoInfo = await searchYouTube(query);
      if (!videoInfo) {
        return sock.sendMessage(remoteJid, { text: '❌ No se encontraron resultados.' }, { quoted: msg });
      }
      url = videoInfo.url;
      title = videoInfo.title || title;
    } else {
      // Si enviaron un link, extraemos info mínima para la miniatura
      videoInfo = await searchYouTube(query);
      if (videoInfo) title = videoInfo.title;
    }

    // 🔥 ENVIAR MINIATURA Y DATOS PREVIOS
    if (videoInfo && videoInfo.thumbnail) {
      const infoText = `🎧 *SIRIUS MUSIC* 🎧\n\n📌 *Título:* ${title}\n⏱️ *Duración:* ${videoInfo.timestamp || 'Desconocida'}\n👀 *Vistas:* ${videoInfo.views || 'Desconocidas'}\n\n⬇️ _Descargando audio optimizado, un momento..._`;
      await sock.sendMessage(remoteJid, { 
        image: { url: videoInfo.thumbnail }, 
        caption: infoText 
      }, { quoted: msg });
    }

    const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
    file = path.join(TEMP_DIR, `yt_audio_${id}.%(ext)s`);

    await downloadAudio(url, file);

    const files = fs.readdirSync(TEMP_DIR);
    const downloaded = files.find(f => f.startsWith(`yt_audio_${id}`) && f.endsWith('.mp3'));

    if (!downloaded) {
      return sock.sendMessage(remoteJid, { text: '❌ No se pudo descargar el audio.' }, { quoted: msg });
    }

    finalPath = path.join(TEMP_DIR, downloaded);
    const sizeMB = fs.statSync(finalPath).size / 1024 / 1024;

    if (sizeMB > 95) {
      return sock.sendMessage(remoteJid, { text: '❌ El audio pesa demasiado para enviarlo por WhatsApp.' }, { quoted: msg });
    }

    await sock.sendMessage(remoteJid, {
      audio: fs.readFileSync(finalPath),
      mimetype: 'audio/mpeg',
      fileName: `${sanitizeFileName(title)}.mp3`
    }, { quoted: msg });

  } finally {
    try {
      if (finalPath && fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
    } catch {}
  }
}

module.exports = {
  name: 'play',
  aliases: ['yt', 'youtube', 'musica', 'cancion'],
  category: 'multimedia',
  desc: 'Busca, muestra información y descarga música de YouTube',

  execute: async ({ sock, remoteJid, args, msg, sender, pushName }) => {
    try {
      if (!args.length) {
        return sock.sendMessage(remoteJid, {
          text: '❌ Envía un link o nombre de canción.\n\nEjemplo:\n.play bad bunny'
        }, { quoted: msg });
      }

      const query = args.join(' ').trim();

      if (!queues.has(remoteJid)) queues.set(remoteJid, []);
      
      const queue = queues.get(remoteJid);
      const isProcessing = processingChats.has(remoteJid);
      const activeCount = queue.length + (isProcessing ? 1 : 0);

      // 🔥 LÓGICA DE TOPE (MÁXIMO 2)
      if (activeCount >= 2) {
        if (!warnedChats.has(remoteJid)) warnedChats.set(remoteJid, new Set());
        const warnedUsers = warnedChats.get(remoteJid);

        if (warnedUsers.has(sender)) return; 

        warnedUsers.add(sender);
        return sock.sendMessage(remoteJid, {
          text: `⚠️ *COLA LLENA*\n\n@${sender.split('@')[0]}, ya hay 2 canciones procesándose o en espera en este chat. Por favor, espera un momento.`,
          mentions: [sender]
        }, { quoted: msg });
      }

      const position = queue.length + (isProcessing ? 1 : 0);
      const waitMin = position === 0 ? 0 : position * 2;

      queue.push({ sock, remoteJid, msg, sender, pushName, query });

      const queueText = position === 0
        ? `📥 *Añadido a la cola*\n\n👤 Por: @${sender.split('@')[0]}\n🎶 Búsqueda: *${query}*\n\n⏳ Procesando automáticamente.`
        : `📥 *Añadido a la cola*\n\n👤 Por: @${sender.split('@')[0]}\n🎶 Búsqueda: *${query}*\n📌 Posición: *#${position + 1}*\n\n⏳ Cargando en *${waitMin} min*.`;

      await sock.sendMessage(remoteJid, { text: queueText, mentions: [sender] }, { quoted: msg });

      processQueue(remoteJid);

    } catch (err) {
      console.log('❌ Error en comando play:', err?.message || err);
      await sock.sendMessage(remoteJid, { text: `❌ Error al iniciar la descarga.` }, { quoted: msg });
    }
  }
};
