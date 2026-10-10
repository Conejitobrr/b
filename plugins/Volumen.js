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

function getMediaInfo(message = {}) {
  if (message.audioMessage) return { type: 'audio', downloadType: 'audio', media: message.audioMessage };
  if (message.videoMessage) return { type: 'video', downloadType: 'video', media: message.videoMessage };
  if (message.documentMessage) {
    const mime = message.documentMessage.mimetype || '';
    if (mime.startsWith('audio/')) return { type: 'audio', downloadType: 'document', media: message.documentMessage };
    if (mime.startsWith('video/')) return { type: 'video', downloadType: 'document', media: message.documentMessage };
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

      if (isNaN(vol) || vol <= 0) return reply('❌ Ingresa un número válido mayor a 0.\nEjemplo: *.volumen 2*');
      if (vol > 20) return reply('❌ El máximo permitido es 20. Más que eso reventaría tus parlantes.');

      const quotedMsg = getQuotedMessage(msg);
      if (!quotedMsg) return reply('❌ Debes responder al mensaje del *Audio*, *Nota de Voz* o *Video* al que quieres cambiarle el volumen.');

      const info = getMediaInfo(quotedMsg);
      if (!info) return reply('❌ El mensaje que citaste no es compatible. Usa un video o un audio.');

      // 🔥 LÓGICA DE DESVÍO: Se extrae IDÉNTICO a audios_pasivos.js
      let targetQuote = msg; 
      
      const contextInfo = msg.message?.extendedTextMessage?.contextInfo 
                       || msg.message?.imageMessage?.contextInfo 
                       || msg.message?.videoMessage?.contextInfo;

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

      ensureTemp();
      const waitMsg = await sock.sendMessage(remoteJid, { text: `🎚️ Ajustando volumen al *${vol * 100}%*...` }, { quoted: msg });

      const stream = await downloadContentFromMessage(info.media, info.downloadType);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

      const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      
      let outExt = info.type === 'video' ? 'mp4' : 'ogg';
      input = path.join(TEMP_DIR, `vol_in_${id}.${outExt}`);
      output = path.join(TEMP_DIR, `vol_out_${id}.${outExt}`);

      fs.writeFileSync(input, buffer);

      let ffmpegArgs = ['-y', '-i', input];
      if (info.type === 'video') {
        ffmpegArgs.push('-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-af', `volume=${vol}`);
      } else {
        // 🎙️ Conversión EXACTA a Nota de Voz de WhatsApp (Igual que audios_pasivos)
        ffmpegArgs.push(
          '-vn', '-map', '0:a:0?', '-af', `volume=${vol},aresample=async=1:first_pts=0`,
          '-c:a', 'libopus', '-application', 'voip', '-b:a', '48k',
          '-ar', '48000', '-ac', '1', '-frame_duration', '20', '-f', 'ogg'
        );
      }
      ffmpegArgs.push(output);
      
      await execFileAsync('ffmpeg', ffmpegArgs);

      const resultBuffer = fs.readFileSync(output);
      let sendOptions = {};
      if (info.type === 'video') {
        sendOptions = { video: resultBuffer, mimetype: 'video/mp4', caption: `🔊 Volumen ajustado a *${vol}x*` };
      } else {
        // Se envía siempre como Nota de Voz (ptt: true)
        sendOptions = { audio: resultBuffer, mimetype: 'audio/ogg; codecs=opus', ptt: true };
      }

      // 📤 Enviamos apuntando al mensaje original (targetQuote)
      await sock.sendMessage(remoteJid, sendOptions, { quoted: targetQuote });
      
      // Borramos el mensaje de carga ("Ajustando volumen...")
      try { await sock.sendMessage(remoteJid, { delete: waitMsg.key }); } catch (e) {}

    } catch (error) {
      console.log('❌ Error en control de volumen:', error?.message || error);
      return reply('❌ Ocurrió un error al procesar el archivo.');
    } finally {
      // Limpieza para no llenar tu disco
      for (const file of [input, output]) {
        try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch (e) {}
      }
    }
  }
};
