'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const execFileAsync = promisify(execFile);
const TEMP_DIR = path.join(process.cwd(), 'temp');

function ensureTemp() {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function cleanJid(jid = '') { return String(jid).split(':')[0]; }

// 🧠 EXTRACTORES DE MENSAJE CITADO
function getQuotedContext(msg) {
  return msg.message?.extendedTextMessage?.contextInfo ||
         msg.message?.audioMessage?.contextInfo ||
         msg.message?.documentMessage?.contextInfo ||
         msg.message?.videoMessage?.contextInfo || null;
}

function unwrapMessage(message = {}) {
  if (message.ephemeralMessage?.message) return unwrapMessage(message.ephemeralMessage.message);
  if (message.documentWithCaptionMessage?.message) return unwrapMessage(message.documentWithCaptionMessage.message);
  return message;
}

function getQuotedMessage(msg) {
  const ctx = getQuotedContext(msg);
  const quoted = ctx?.quotedMessage || null;
  return quoted ? unwrapMessage(quoted) : null;
}

function getMessageContent(msg) {
  return getQuotedMessage(msg) || unwrapMessage(msg.message || {});
}

// 🎵 IDENTIFICADOR DE AUDIOS
function isAudioFileName(name = '') {
  const lower = String(name || '').toLowerCase();
  return ['.mp3', '.m4a', '.ogg', '.opus', '.wav', '.aac', '.flac', '.mpeg'].some(ext => lower.endsWith(ext));
}

function getAudioInfo(message = {}) {
  if (message.audioMessage) {
    return {
      type: 'audio',
      downloadType: 'audio',
      media: message.audioMessage,
      mimetype: message.audioMessage.mimetype || 'audio/mpeg',
      fileName: message.audioMessage.ptt ? 'nota_voz.ogg' : 'audio.mp3',
      ptt: message.audioMessage.ptt || false
    };
  }

  if (message.documentMessage) {
    const mimetype = message.documentMessage.mimetype || '';
    const fileName = message.documentMessage.fileName || 'audio';
    if (mimetype.startsWith('audio/') || isAudioFileName(fileName)) {
      return { type: 'document', downloadType: 'document', media: message.documentMessage, mimetype, fileName, ptt: false };
    }
  }
  return null;
}

async function downloadMedia(media, downloadType) {
  const stream = await downloadContentFromMessage(media, downloadType);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function getExtension(info = {}) {
  const name = String(info.fileName || '').toLowerCase();
  if (name.includes('.m4a') || name.includes('.mp4')) return 'm4a';
  if (name.includes('.ogg') || name.includes('.opus')) return 'ogg';
  return 'mp3'; // Default para procesado general
}

// 🎛️ DICCIONARIO DE FILTROS FFMPEG
const FILTERS = {
  normal: { name: 'Normal', filter: 'volume=1' },
  grave: { name: 'Voz grave', filter: 'asetrate=44100*0.78,aresample=44100,atempo=1.10,bass=g=5:f=120' },
  supergrave: { name: 'Voz súper grave', filter: 'asetrate=44100*0.62,aresample=44100,atempo=1.18,bass=g=8:f=100' },
  ultragrave: { name: 'Voz ultra grave', filter: 'asetrate=44100*0.55,aresample=44100,atempo=1.25,bass=g=10:f=90' },
  lentograve: { name: 'Lento y grave', filter: 'asetrate=44100*0.72,aresample=44100,atempo=0.85,bass=g=7:f=100' },
  monstruo: { name: 'Monstruo', filter: 'asetrate=44100*0.60,aresample=44100,atempo=0.95,bass=g=12:f=80,acompressor=threshold=-18dB:ratio=4' },
  oscuro: { name: 'Voz oscura', filter: 'asetrate=44100*0.68,aresample=44100,atempo=1.05,lowpass=f=2800,bass=g=9:f=100' },
  demonio: { name: 'Demonio', filter: 'asetrate=44100*0.66,aresample=44100,atempo=1.08,bass=g=10:f=90,acompressor=threshold=-20dB:ratio=4' },
  demonioeco: { name: 'Demonio con eco', filter: 'asetrate=44100*0.66,aresample=44100,atempo=1.08,bass=g=10:f=90,aecho=0.7:0.7:650:0.25' },
  agudo: { name: 'Voz aguda', filter: 'asetrate=44100*1.35,aresample=44100,atempo=0.90' },
  ardilla: { name: 'Ardilla', filter: 'asetrate=44100*1.60,aresample=44100,atempo=0.85' },
  bebe: { name: 'Voz de bebé', filter: 'asetrate=44100*1.75,aresample=44100,atempo=0.95' },
  robot: { name: 'Robot', filter: 'tremolo=f=35:d=0.8,aresample=16000' },
  alien: { name: 'Alien', filter: 'asetrate=44100*1.20,aresample=44100,atempo=0.95,tremolo=f=18:d=0.7' },
  vibrato: { name: 'Vibrato', filter: 'vibrato=f=7:d=0.8' },
  eco: { name: 'Eco', filter: 'aecho=0.8:0.9:900:0.30' },
  cueva: { name: 'Cueva', filter: 'aecho=0.8:0.88:80|160|320:0.35|0.25|0.18' },
  radio: { name: 'Radio', filter: 'highpass=f=300,lowpass=f=3000,acompressor=threshold=-18dB:ratio=3:attack=20:release=250' },
  telefono: { name: 'Teléfono', filter: 'highpass=f=500,lowpass=f=2500,volume=1.4' },
  megafono: { name: 'Megáfono', filter: 'highpass=f=800,lowpass=f=2800,equalizer=f=1400:t=q:w=0.8:g=13,equalizer=f=2200:t=q:w=1:g=9,acompressor=threshold=-26dB:ratio=12:attack=2:release=60,volume=2.8,acrusher=bits=7:mix=0.50:mode=log,alimiter=limit=0.85' },
  bajo: { name: 'Bajos fuertes', filter: 'bass=g=12:f=110,acompressor=threshold=-16dB:ratio=3' },
  rapido: { name: 'Rápido', filter: 'atempo=1.35' },
  lento: { name: 'Lento', filter: 'atempo=0.75' },
  muylento: { name: 'Muy lento', filter: 'atempo=0.60' },
  reverse: { name: 'Reversa', filter: 'areverse' }
};

const ALIASES = {
  chipmunk: 'ardilla', diablo: 'demonio', demon: 'demonio', gravecito: 'grave', masgrave: 'supergrave',
  másgrave: 'supergrave', super_grave: 'supergrave', ultra: 'ultragrave', ultra_grave: 'ultragrave',
  lento_grave: 'lentograve', lentoygrave: 'lentograve', lento_y_grave: 'lentograve', monstruoso: 'monstruo',
  oscuroo: 'oscuro', aguda: 'agudo', baby: 'bebe', bebé: 'bebe', robotico: 'robot', robótico: 'robot',
  extraterrestre: 'alien', vibrar: 'vibrato', teléfono: 'telefono', phone: 'telefono', mega: 'megafono',
  megáfono: 'megafono', bass: 'bajo', reversa: 'reverse', reves: 'reverse', revés: 'reverse', rápido: 'rapido',
  muy_lento: 'muylento'
};

function getFilterKey(input = '') {
  const key = String(input || '').toLowerCase().trim();
  return ALIASES[key] || key;
}

function filterMenu(prefix = '.') {
  return `🎛️ *FILTROS DE AUDIO* 🎛️\n\nResponde a un audio o nota de voz usando:\n\n` +
         Object.keys(FILTERS).map(f => `▪️ ${prefix}filtro *${f}*`).join('\n') +
         `\n\n📌 *Ejemplo:*\n${prefix}filtro demonio\n\n✅ _El resultado siempre se enviará como nota de voz._`;
}

// 🔥 Conversión a Opus perfecta para WhatsApp
async function applyAudioFilter(input, output, filter) {
  const args = ['-y', '-i', input, '-vn'];
  if (filter) args.push('-af', filter);

  args.push(
    '-c:a', 'libopus',
    '-application', 'voip',
    '-b:a', '48k',
    '-ar', '48000',
    '-ac', '1',
    '-frame_duration', '20',
    output
  );
  await execFileAsync('ffmpeg', args);
}

module.exports = {
  name: 'filtro',
  aliases: ['filtros', 'audiofx', 'vozfx'],
  category: 'multimedia',
  desc: 'Aplica divertidos efectos de voz a los audios',

  execute: async ({ sock, msg, remoteJid, sender, args, commandName, config, db, reply }) => {
    let input = null;
    let output = null;

    try {
      const p = config?.prefix || '.';

      // 1. Mostrar menú si no hay argumentos
      if (['filtros', 'audiofx', 'vozfx'].includes(commandName) || !args.length) {
        return reply(filterMenu(p));
      }

      // 2. Validar filtro seleccionado
      const filterKey = getFilterKey(args[0]);
      const selected = FILTERS[filterKey];

      if (!selected) {
        return reply(`❌ Filtro no disponible: *${args[0]}*\n\nUsa *${p}filtros* para ver la lista.`);
      }

      // 3. Validar que se haya citado un audio
      const message = getMessageContent(msg);
      const info = getAudioInfo(message);

      if (!info) {
        return reply(`❌ Debes responder a un audio o nota de voz.\n\n📌 Ejemplo:\n*${p}filtro robot*`);
      }

      if (!info.media.url && !info.media.mediaKey) {
        return reply('❌ No se pudo procesar el audio citado (intenta descargarlo primero).');
      }

      ensureTemp();
      await sock.sendMessage(remoteJid, { text: `🎧 Aplicando filtro: *${selected.name}*, un momento...` }, { quoted: msg });

      // 4. Descargar audio original
      const buffer = await downloadMedia(info.media, info.downloadType);
      if (!buffer || !buffer.length) return reply('❌ Error al descargar el audio citado.');

      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      const ext = getExtension(info);

      input = path.join(TEMP_DIR, `audiofx_input_${id}.${ext}`);
      output = path.join(TEMP_DIR, `audiofx_output_${id}.ogg`);

      fs.writeFileSync(input, buffer);

      // 5. Aplicar FFmpeg
      await applyAudioFilter(input, output, selected.filter);

      // 6. Enviar resultado como nota de voz
      await sock.sendMessage(remoteJid, {
        audio: fs.readFileSync(output),
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true
      }, { quoted: msg });

      // ⭐ Bono de XP
      if (db && typeof db.getUser === 'function') {
        const userData = await db.getUser(sender);
        if (userData) {
          userData.xp = (userData.xp || 0) + Math.floor(Math.random() * 16) + 10;
          if (userData.save) await userData.save();
        }
      }

    } catch (err) {
      console.log('❌ Error en filtro audio:', err?.message || err);
      return reply('❌ Error aplicando el filtro. Asegúrate de tener ffmpeg instalado.');

    } finally {
      // 🧹 Limpieza de archivos temporales
      for (const file of [input, output]) {
        try {
          if (file && fs.existsSync(file)) fs.unlinkSync(file);
        } catch {}
      }
    }
  }
};
