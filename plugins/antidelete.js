'use strict';

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// 🗄️ CACHÉ EN MEMORIA RAM
const deletedCache = new Map();
const handledDeletes = new Set();

const MAX_CACHE = 1000;
const CACHE_TIME = 2 * 60 * 60 * 1000; // 2 horas
const MAX_MEDIA_BUFFER = 60 * 1024 * 1024; // 60 MB

// 🔥 FÓRMULA INFALIBLE PARA MENCIONES REALES
function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }
function formatMention(jid) { return `${cleanNumber(jid)}@s.whatsapp.net`; }

function getMsgKey(remoteJid, id) { return `${remoteJid}:${id}`; }
function getHandledKey(remoteJid, id) { return `${remoteJid}:${id}:handled`; }

// 🧠 DESEMPAQUETADOR ABSOLUTO (Rompe los mensajes temporales y de única visualización)
function unwrapMessage(message = {}) {
  if (!message) return {};
  if (message.ephemeralMessage?.message) return unwrapMessage(message.ephemeralMessage.message);
  if (message.viewOnceMessage?.message) return unwrapMessage(message.viewOnceMessage.message);
  if (message.viewOnceMessageV2?.message) return unwrapMessage(message.viewOnceMessageV2.message);
  if (message.viewOnceMessageV2Extension?.message) return unwrapMessage(message.viewOnceMessageV2Extension.message);
  if (message.documentWithCaptionMessage?.message) return unwrapMessage(message.documentWithCaptionMessage.message);
  return message;
}

// 👁️ DETECTOR DE BORRADO (Ahora sí lee a través de las capas invisibles)
function isDeleteMessage(msg) {
  const message = unwrapMessage(msg.message);
  const protocol = message?.protocolMessage;
  if (!protocol) return false;
  return protocol.type === 0 || protocol.type === 'REVOKE' || protocol.key?.id;
}

function getDeletedKey(msg) {
  const message = unwrapMessage(msg.message);
  return message?.protocolMessage?.key || null;
}

function getContextInfo(message = {}) {
  return message.extendedTextMessage?.contextInfo || message.imageMessage?.contextInfo ||
         message.videoMessage?.contextInfo || message.audioMessage?.contextInfo ||
         message.stickerMessage?.contextInfo || message.documentMessage?.contextInfo || null;
}

function getMessageMentions(message = {}) {
  const ctx = getContextInfo(message);
  return Array.isArray(ctx?.mentionedJid) ? ctx.mentionedJid.map(cleanJid).filter(Boolean) : [];
}

function getText(message = {}) {
  return message.conversation || message.extendedTextMessage?.text ||
         message.imageMessage?.caption || message.videoMessage?.caption ||
         message.documentMessage?.caption || '';
}

function getMediaInfo(message = {}) {
  if (message.imageMessage) return { type: 'image', mediaType: 'image', media: message.imageMessage, mimetype: message.imageMessage.mimetype || 'image/jpeg', caption: message.imageMessage.caption || '' };
  if (message.videoMessage) return { type: 'video', mediaType: 'video', media: message.videoMessage, mimetype: message.videoMessage.mimetype || 'video/mp4', caption: message.videoMessage.caption || '', gifPlayback: message.videoMessage.gifPlayback || false };
  if (message.audioMessage) return { type: 'audio', mediaType: 'audio', media: message.audioMessage, mimetype: message.audioMessage.mimetype || 'audio/mpeg', ptt: message.audioMessage.ptt || false, caption: '' };
  if (message.stickerMessage) return { type: 'sticker', mediaType: 'sticker', media: message.stickerMessage, mimetype: message.stickerMessage.mimetype || 'image/webp', caption: '' };
  if (message.documentMessage) return { type: 'document', mediaType: 'document', media: message.documentMessage, mimetype: message.documentMessage.mimetype || 'application/octet-stream', fileName: message.documentMessage.fileName || 'archivo', caption: message.documentMessage.caption || '' };
  return null;
}

async function streamToBuffer(stream) {
  let buffer = Buffer.from([]);
  for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
  return buffer;
}

async function downloadMediaBuffer(mediaInfo) {
  const stream = await downloadContentFromMessage(mediaInfo.media, mediaInfo.mediaType);
  const buffer = await streamToBuffer(stream);
  if (!buffer || !buffer.length || buffer.length > MAX_MEDIA_BUFFER) return null;
  return buffer;
}

async function saveMessage(msg, remoteJid, sender, pushName) {
  const id = msg.key?.id;
  if (!id || !msg.message || isDeleteMessage(msg)) return;

  const message = unwrapMessage(msg.message);
  const media = getMediaInfo(message);
  let mediaBuffer = null;

  if (media) {
    try { mediaBuffer = await downloadMediaBuffer(media); } catch {}
  }

  const key = getMsgKey(remoteJid, id);
  deletedCache.set(key, {
    remoteJid,
    sender: cleanJid(sender),
    pushName: pushName || 'Usuario',
    message,
    mentions: getMessageMentions(message),
    media,
    mediaBuffer,
    text: getText(message),
    time: Date.now()
  });

  if (deletedCache.size > MAX_CACHE) {
    const first = deletedCache.keys().next().value;
    deletedCache.delete(first);
  }
}

function cleanOldCache() {
  const now = Date.now();
  for (const [key, value] of deletedCache.entries()) {
    if (now - value.time > CACHE_TIME) deletedCache.delete(key);
  }
}

module.exports = {
  name: 'antidelete',
  aliases: ['antiborrar'],
  category: 'administración',
  desc: 'Recupera mensajes eliminados',

  // 1. ESCUCHA ACTIVA (Atrapa todos los mensajes)
  onMessage: async (ctx) => {
    const { sock, msg, remoteJid, sender, pushName, fromGroup, groupData } = ctx;

    try {
      cleanOldCache();

      // Si NO es un borrado, guarda el mensaje en la memoria RAM y termina
      if (!isDeleteMessage(msg)) {
        await saveMessage(msg, remoteJid, sender, pushName);
        return;
      }

      // 🔥 Por defecto está activado (true) a menos que lo hayan apagado explícitamente (false)
      const isEnabled = fromGroup ? (groupData?.antidelete !== false) : true;
      if (!isEnabled) return;

      const deletedKey = getDeletedKey(msg);
      const deletedId = deletedKey?.id;
      if (!deletedId) return;

      const handledKey = getHandledKey(remoteJid, deletedId);
      if (handledDeletes.has(handledKey)) return;

      handledDeletes.add(handledKey);
      setTimeout(() => handledDeletes.delete(handledKey), 30 * 1000);

      const cacheKey = getMsgKey(remoteJid, deletedId);
      const saved = deletedCache.get(cacheKey);

      if (!saved) return; // Si era muy viejo o se borró antes de encender el bot

      // 🔥 Separación de IDs para la mención azul
      const targetJid = formatMention(saved.sender);
      const pureNumber = cleanNumber(saved.sender);
      
      const originalMentions = (saved.mentions || []).map(formatMention);
      const finalMentions = [...new Set([targetJid, ...originalMentions])];

      const text = saved.text || getText(saved.message);
      const media = saved.media || getMediaInfo(saved.message);

      // CASO A: Mensaje solo texto
      if (!media) {
        if (!text) { deletedCache.delete(cacheKey); return; }
        await sock.sendMessage(remoteJid, {
          text: `🕵️ *MENSAJE ELIMINADO*\n\n👤 Usuario: @${pureNumber}\n\n💬 Mensaje:\n${text}`,
          mentions: finalMentions
        });
        deletedCache.delete(cacheKey);
        return;
      }

      // CASO B: Mensaje multimedia
      let buffer = saved.mediaBuffer;
      if (!buffer || !buffer.length) {
        try { buffer = await downloadMediaBuffer(media); } catch {}
      }

      if (!buffer || !buffer.length) {
        await sock.sendMessage(remoteJid, {
          text: `🕵️ *MENSAJE ELIMINADO*\n\n👤 Usuario: @${pureNumber}\n\n⚠️ Archivo perdido o muy pesado.${text ? `\n\n💬 Texto:\n${text}` : ''}`,
          mentions: finalMentions
        });
        deletedCache.delete(cacheKey);
        return;
      }

      const captionText = `🕵️ *MENSAJE ELIMINADO*\n\n👤 Usuario: @${pureNumber}${media.caption || text ? `\n\n💬 Descripción:\n${media.caption || text}` : ''}`;

      if (media.type === 'image') await sock.sendMessage(remoteJid, { image: buffer, mimetype: media.mimetype, caption: captionText, mentions: finalMentions });
      else if (media.type === 'video') await sock.sendMessage(remoteJid, { video: buffer, mimetype: media.mimetype, caption: captionText, gifPlayback: media.gifPlayback || false, mentions: finalMentions });
      else if (media.type === 'audio') {
        await sock.sendMessage(remoteJid, { audio: buffer, mimetype: media.mimetype, ptt: media.ptt || false });
        await sock.sendMessage(remoteJid, { text: captionText, mentions: finalMentions });
      }
      else if (media.type === 'sticker') {
        await sock.sendMessage(remoteJid, { sticker: buffer });
        await sock.sendMessage(remoteJid, { text: captionText, mentions: finalMentions });
      }
      else if (media.type === 'document') await sock.sendMessage(remoteJid, { document: buffer, mimetype: media.mimetype, fileName: media.fileName || 'archivo', caption: captionText, mentions: finalMentions });

      deletedCache.delete(cacheKey);

    } catch (err) {
      console.log('❌ Error en antidelete pasivo:', err?.message || err);
    }
  },

  // 2. COMANDO DE CONTROL
  execute: async ({ remoteJid, args, fromGroup, isAdmin, isOwner, db, groupData, reply }) => {
    try {
      if (!fromGroup) return reply('✅ En chats privados, *antidelete* siempre está activo.');
      if (!isOwner && !isAdmin) return reply('❌ Solo los administradores pueden usar este comando.');

      const option = (args[0] || '').toLowerCase();
      // Verificamos estado (Por defecto asume true)
      const currentStatus = groupData?.antidelete !== false;

      if (!option) {
        return reply(`🕵️ *ANTIDELETE*\n\nEstado actual: *${currentStatus ? 'Activado ✅' : 'Desactivado ❌'}*\n\nUso:\n.antidelete on\n.antidelete off`);
      }

      if (!['on', 'off'].includes(option)) {
        return reply('❌ Formato incorrecto. Usa:\n.antidelete on\n.antidelete off');
      }

      const newState = option === 'on';

      if (db && typeof db.updateGroup === 'function') {
        await db.updateGroup(remoteJid, { antidelete: newState });
      } else if (db && typeof db.setGroupSetting === 'function') {
        await db.setGroupSetting(remoteJid, 'antidelete', newState);
      } else {
        if (groupData) groupData.antidelete = newState;
      }

      return reply(newState ? '✅ Antidelete activado en este grupo.' : '✅ Antidelete desactivado en este grupo.');

    } catch (err) {
      console.log('❌ Error comando antidelete:', err?.message || err);
      return reply('❌ Ocurrió un error configurando el antidelete.');
    }
  }
};
