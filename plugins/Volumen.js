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

// 🧠 EXTRACTORES DE MENSAJE CITADO
function getQuotedContext(msg) {
  return msg.message?.extendedTextMessage?.contextInfo || null;
}

function unwrapMessage(message = {}) {
  if (message.ephemeralMessage?.message) return unwrapMessage(message.ephemeralMessage.message);
  if (message.documentWithCaptionMessage?.message) return unwrapMessage(message.documentWithCaptionMessage.message);
  if (message.viewOnceMessage?.message) return unwrapMessage(message.viewOnceMessage.message);
  if (message.viewOnceMessageV2?.message) return unwrapMessage(message.viewOnceMessageV2.message);
  return message;
}

function getQuotedMessage(msg) {
  const ctx = getQuotedContext(msg);
  const quoted = ctx?.quotedMessage || null;
  return quoted ? unwrapMessage(quoted) : null;
}

// 🎵 IDENTIFICADOR DE TIPO DE ARCHIVO
function getMediaInfo(message = {}) {
  if (message.audioMessage) {
    return {
      type: 'audio',
      downloadType: 'audio',
      media: message.audioMessage,
      isPtt: message.audioMessage.ptt || false,
      ext: 'ogg'
    };
  }
  if (message.videoMessage) {
    return {
      type: 'video',
      downloadType: 'video',
      media: message.videoMessage,
      isPtt: false,
      ext: 'mp4'
    };
  }
  if (message.documentMessage) {
    const mime = message.documentMessage.mimetype || '';
    if (mime.startsWith('audio/')) return { type: 'audio', downloadType: 'document', media: message.documentMessage, isPtt: false, ext: 'mp3' };
    if (mime.startsWith('video/')) return { type: 'video', downloadType: 'document', media: message.documentMessage, isPtt: false, ext: 'mp4' };
  }
  return null;
}

module.exports = {
  name: 'volumen',
  aliases: ['vol', 'subirvolumen', 'bajarvolumen'],
  category: 'multimedia',
  desc: 'Controla manualmente el volumen de audios y videos',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    let input = null;
    let output = null;

    try {
      if (!args.length) {
        return reply(`🎚️ *CONTROL DE VOLUMEN* 🎚️\n\nResponde a un *Audio* o *Video* usando:\n*.volumen [número]*\n\n📌 *Ejemplos:*\n.volumen 2 _(Doble de fuerte)_\n.volumen 5 _(Súper fuerte)_\n.volumen 0.5 _(Mitad de volumen)_`);
      }

      let volString = args[0].replace(',', '.');
      let vol = parseFloat(volString);

      if (isNaN(vol) || vol <= 0) {
        return reply('❌ Ingresa un número válido mayor a 0.\nEjemplo: *.volumen 2*');
      }
      if (vol > 20) {
        return reply('❌ El máximo permitido es 20. Más que eso reventaría tus parlantes.');
      }

      const quotedMsg = getQuotedMessage(msg);
      if (!quotedMsg) {
         return reply('❌ Debes responder al mensaje del *Audio*, *Nota de Voz* o *Video* al que quieres cambiarle el volumen.');
      }

      const info = getMediaInfo(quotedMsg);
      if (!info) {
         return reply('❌ El mensaje que citaste no es compatible. Usa un video o un audio.');
      }

      ensureTemp();
      
      const waitMsg = await sock.sendMessage(remoteJid, { text: `🎚️ Ajustando volumen al *${vol * 100}%*...` }, { quoted: msg });

      const stream = await downloadContentFromMessage(info.media, info.downloadType);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      input = path.join(TEMP_DIR, `vol_in_${id}.${info.ext}`);
      let outExt = info.type === 'video' ? 'mp4' : (info.isPtt ? 'ogg' : 'mp3');
      output = path.join(TEMP_DIR, `vol_out_${id}.${outExt}`);

      fs.writeFileSync(input, buffer);

      let ffmpegArgs = ['-y', '-i', input];

      if (info.type === 'video') {
        ffmpegArgs.push('-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-af', `volume=${vol}`);
      } else if (info.isPtt) {
        ffmpegArgs.push('-c:a', 'libopus', '-application', 'voip', '-b:a', '48k', '-ar', '48000', '-ac', '1', '-af', `volume=${vol}`);
      } else {
        ffmpegArgs.push('-c:a', 'libmp3lame', '-b:a', '128k', '-af', `volume=${vol}`);
      }
      
      ffmpegArgs.push(output);
      await execFileAsync('ffmpeg', ffmpegArgs);

      const resultBuffer = fs.readFileSync(output);
      let sendOptions = {};

      if (info.type === 'video') {
        sendOptions = { video: resultBuffer, mimetype: 'video/mp4', caption: `🔊 Volumen ajustado a *${vol}x*` };
      } else if (info.isPtt) {
        sendOptions = { audio: resultBuffer, mimetype: 'audio/ogg; codecs=opus', ptt: true };
      } else {
        sendOptions = { audio: resultBuffer, mimetype: 'audio/mpeg' };
      }

      // 🔥 LÓGICA DE DESVÍO: Buscar el mensaje original para responderle
      let targetQuote = msg;
      const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
      
      if (contextInfo && contextInfo.stanzaId && contextInfo.participant) {
        targetQuote = {
          key: {
            remoteJid: msg.key.remoteJid,
            id: contextInfo.stanzaId,
            participant: contextInfo.participant
          },
          message: contextInfo.quotedMessage || {}
        };
      }

      // Manda el resultado respondiendo al audio/video original
      await sock.sendMessage(remoteJid, sendOptions, { quoted: targetQuote });
      
      try { await sock.sendMessage(remoteJid, { delete: waitMsg.key }); } catch (e) {}

    } catch (error) {
      console.log('❌ Error en control de volumen:', error?.message || error);
      return reply('❌ Ocurrió un error al procesar el archivo. Puede que sea muy pesado o que hubo una falla interna.');
    } finally {
      for (const file of [input, output]) {
        try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch (e) {}
      }
    }
  }
};
