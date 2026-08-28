'use strict';

function normalizeJid(jid = '') {
  if (!jid || typeof jid !== 'string') return '';
  if (jid.includes(':')) {
    const [user, domain] = jid.split('@');
    return user.split(':')[0] + '@' + domain;
  }
  return jid;
}

function cleanNumber(jid = '') {
  return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
}

function unwrapMessage(message = {}) {
  if (message.ephemeralMessage) return message.ephemeralMessage.message || {};
  if (message.viewOnceMessage) return message.viewOnceMessage.message || {};
  if (message.viewOnceMessageV2) return message.viewOnceMessageV2.message || {};
  if (message.documentWithCaptionMessage) return message.documentWithCaptionMessage.message || {};
  return message;
}

function getBody(msg = {}) {
  const m = unwrapMessage(msg.message || {});
  if (!m) return '';
  
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    m.templateButtonReplyMessage?.selectedId ||
    m.interactiveResponseMessage?.body?.text ||
    ''
  );
}

function detectPrefix(text = '', customPrefix = '.') {
  if (!text || typeof text !== 'string') return null;
  const prefixes = Array.isArray(customPrefix) ? customPrefix : [customPrefix];
  const prefix = prefixes.find(p => p && text.startsWith(p));
  
  if (!prefix) return null;
  
  return {
    prefix,
    body: text.slice(prefix.length).trim()
  };
}

async function getGroupAdmins(sock, jid = '') {
  try {
    const metadata = await sock.groupMetadata(jid);
    return metadata.participants
      .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
      .map(p => normalizeJid(p.id));
  } catch {
    return [];
  }
}

function getReadableType(msg = {}) {
  const m = unwrapMessage(msg.message || {});
  if (!m) return 'Desconocido';
  
  const keys = Object.keys(m);
  if (keys.includes('conversation') || keys.includes('extendedTextMessage')) return '📝 Texto';
  if (keys.includes('imageMessage')) return '📸 Imagen';
  if (keys.includes('videoMessage')) return '🎥 Video';
  if (keys.includes('audioMessage')) return '🎵 Audio / Nota de voz';
  if (keys.includes('stickerMessage')) return '🧩 Sticker';
  if (keys.includes('documentMessage')) return '📄 Documento';
  if (keys.includes('locationMessage') || keys.includes('liveLocationMessage')) return '📍 Ubicación';
  if (keys.includes('contactMessage') || keys.includes('contactsArrayMessage')) return '👤 Contacto(s)';
  if (keys.includes('reactionMessage')) return '❤️ Reacción';
  
  return '📦 Multimedia/Otro';
}

module.exports = {
  normalizeJid,
  cleanNumber,
  unwrapMessage,
  getBody,
  detectPrefix,
  getGroupAdmins,
  getReadableType
};
