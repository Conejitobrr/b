'use strict';

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// 🗄️ CACHÉ EN MEMORIA RAM PARA MENSAJES (Rápido y volátil)
const deletedCache = new Map();
const handledDeletes = new Set();

const MAX_CACHE = 1000;
const CACHE_TIME = 2 * 60 * 60 * 1000; // 2 horas
const MAX_MEDIA_BUFFER = 60 * 1024 * 1024; // 60 MB máximo para evitar crasheos

// 🔥 FÓRMULA INFALIBLE PARA MENCIONES REALES
function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }
function formatMention(jid) { return `${cleanNumber(jid)}@s.whatsapp.net`; }

function getMsgKey(remoteJid, id) { return `${remoteJid}:${id}`; }
function getHandledKey(remoteJid, id) { return `${remoteJid}:${id}:handled`; }

function isDeleteMessage(msg) {
  const protocol = msg.message?.protocolMessage;
  if (!protocol) return false;
  return protocol.type === 0 || protocol.type === 'REVOKE' || protocol.key?.id;
}

function getDeletedKey(msg) {
  return msg.message?.protocolMessage?.key || null;
}

function unwrapMessage(message = {}) {
  if (message.ephemeralMessage?.message) return unwrapMessage(message.ephemeralMessage.message);
  if (message.documentWithCaptionMessage?.message) return unwrapMessage(message.documentWithCaptionMessage.message);
  return message;
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

  // 1. ESCUCHA ACTIVA (Atrapa todos los mensajes y detecta si borran uno)
  onMessage: async (ctx) => {
    const { sock, msg, remoteJid, sender, pushName, fromGroup, groupData } = ctx;

    try {
      cleanOldCache();

      // Si NO es un borrado, guarda el mensaje en el historial y termina
      if (!isDeleteMessage(msg)) {
        await saveMessage(msg, remoteJid, sender, pushName);
        return;
      }

      // Verifica si el antidelete está activado en el grupo
      const isEnabled = fromGroup ? (groupData && groupData.antidelete === true) : true;
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

      if (!saved) return; // Si era muy viejo o no se guardó

      // 🔥 Separación de IDs para la mención azul
      const targetJid = formatMention(saved.sender);
      const pureNumber = cleanNumber(saved.sender);
      
      // Mantiene también las menciones que la persona hizo originalmente
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

      // CASO B: Mensaje con multimedia
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

  // 2. COMANDO DE CONTROL (Encender / Apagar)
  execute: async ({ remoteJid, args, fromGroup, isAdmin, isOwner, db, groupData, reply }) => {
    try {
      if (!fromGroup) return reply('✅ En chats privados, *antidelete* siempre está activo.');
      if (!isOwner && !isAdmin) return reply('❌ Solo los administradores pueden usar este comando.');

      const option = (args[0] || '').toLowerCase();
      const currentStatus = groupData?.antidelete === true;

      if (!option) {
        return reply(`🕵️ *ANTIDELETE*\n\nEstado actual: *${currentStatus ? 'Activado ✅' : 'Desactivado ❌'}*\n\nUso:\n.antidelete on\n.antidelete off`);
      }

      if (!['on', 'off'].includes(option)) {
        return reply('❌ Formato incorrecto. Usa:\n.antidelete on\n.antidelete off');
      }

      const newState = option === 'on';

      // Actualizar en base de datos (Compatible con tu bot moderno)
      if (db && typeof db.updateGroup === 'function') {
        await db.updateGroup(remoteJid, { antidelete: newState });
      } else if (db && typeof db.setGroupSetting === 'function') {
        await db.setGroupSetting(remoteJid, 'antidelete', newState);
      } else {
        // Fallback en memoria por si las funciones de DB tienen otro nombre
        if (groupData) groupData.antidelete = newState;
      }

      return reply(newState ? '✅ Antidelete activado en este grupo.' : '✅ Antidelete desactivado en este grupo.');

    } catch (err) {
      console.log('❌ Error comando antidelete:', err?.message || err);
      return reply('❌ Ocurrió un error configurando el antidelete.');
    }
  }
};
