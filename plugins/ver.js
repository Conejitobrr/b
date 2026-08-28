'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const execFileAsync = promisify(execFile);

const COSTO_VER = 10000;
const PENDING_TIME = 60 * 1000;
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const pendingVer = new Map();

async function streamToBuffer(stream) {
  let buffer = Buffer.from([]);
  for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
  return buffer;
}

function cleanJid(jid = '') { return String(jid).split(':')[0]; }

function isPremiumUser(user = {}) {
  return (user?.premium === true || Number(user?.premiumUntil || 0) > Date.now());
}

function unwrapMessage(message = {}) {
  if (message.ephemeralMessage?.message) return unwrapMessage(message.ephemeralMessage.message);
  if (message.documentWithCaptionMessage?.message) return unwrapMessage(message.documentWithCaptionMessage.message);
  if (message.viewOnceMessageV2?.message) return unwrapMessage(message.viewOnceMessageV2.message);
  if (message.viewOnceMessageV2Extension?.message) return unwrapMessage(message.viewOnceMessageV2Extension.message);
  return message;
}

function getQuotedContext(msg) {
  return (msg.message?.extendedTextMessage?.contextInfo || msg.message?.imageMessage?.contextInfo || msg.message?.videoMessage?.contextInfo || msg.message?.audioMessage?.contextInfo || msg.message?.documentMessage?.contextInfo || null);
}

function getQuotedMessage(msg) {
  const ctx = getQuotedContext(msg);
  return ctx?.quotedMessage ? unwrapMessage(ctx.quotedMessage) : null;
}

function getQuotedWAMessage(msg, remoteJid) {
  const ctx = getQuotedContext(msg);
  if (!ctx?.quotedMessage || !ctx?.stanzaId) return msg;
  return { key: { remoteJid, id: ctx.stanzaId, participant: ctx.participant, fromMe: false }, message: ctx.quotedMessage };
}

function getMediaInfo(message = {}) {
  if (message.imageMessage) return { type: 'image', mediaType: 'image', media: message.imageMessage, mimetype: message.imageMessage.mimetype || 'image/jpeg', caption: message.imageMessage.caption || '' };
  if (message.videoMessage) return { type: message.videoMessage.gifPlayback ? 'gif' : 'video', mediaType: 'video', media: message.videoMessage, mimetype: message.videoMessage.mimetype || 'video/mp4', caption: message.videoMessage.caption || '', gifPlayback: message.videoMessage.gifPlayback };
  if (message.audioMessage) return { type: 'audio', mediaType: 'audio', media: message.audioMessage, mimetype: message.audioMessage.mimetype || 'audio/mpeg', ptt: message.audioMessage.ptt || false, caption: '' };
  return null;
}

async function sendMedia(sock, remoteJid, mediaInfo, quotedOriginal) {
  try {
    const stream = await downloadContentFromMessage(mediaInfo.media, mediaInfo.mediaType);
    const buffer = await streamToBuffer(stream);

    if (mediaInfo.type === 'image') return sock.sendMessage(remoteJid, { image: buffer, mimetype: mediaInfo.mimetype, caption: mediaInfo.caption || '' }, { quoted: quotedOriginal });
    if (mediaInfo.type === 'video') return sock.sendMessage(remoteJid, { video: buffer, mimetype: mediaInfo.mimetype, caption: mediaInfo.caption || '' }, { quoted: quotedOriginal });
    if (mediaInfo.type === 'gif') return sock.sendMessage(remoteJid, { video: buffer, mimetype: 'video/mp4', gifPlayback: true, caption: mediaInfo.caption || '' }, { quoted: quotedOriginal });
    if (mediaInfo.type === 'audio') return sock.sendMessage(remoteJid, { audio: buffer, mimetype: mediaInfo.mimetype, ptt: mediaInfo.ptt || false }, { quoted: quotedOriginal });
  } catch (err) {
    console.log('Error enviando media en .ver:', err);
  }
}

module.exports = {
  name: 'ver',
  category: 'multimedia',
  desc: 'Revela mensajes de "Ver una sola vez"',

  execute: async ({ sock, remoteJid, msg, sender, args, db, isOwner, userData, reply }) => {
    let chargedXp = false;
    let usedTicket = false;

    try {
      const userKey = cleanJid(sender);
      const option = (args?.[0] || '').toLowerCase();

      const xp = Number(userData.xp || 0);
      const premium = isPremiumUser(userData);
      const verUses = userData.inventory?.verUses || 0;

      // CANCELAR
      if (['cancelar', 'cancel', 'no'].includes(option)) {
        pendingVer.delete(userKey);
        return reply('✅ Canje cancelado. No se descontó XP.');
      }

      // ACEPTAR
      if (['aceptar', 'confirmar', 'si', 'sí'].includes(option)) {
        const pending = pendingVer.get(userKey);
        if (!pending) return reply(`❌ No tienes ningún uso pendiente de *.ver*.\n\n🎟️ Usos comprados: *${verUses}*\n\nPara usarlo:\n1. Responde al archivo "ver una sola vez".\n2. Escribe *.ver*`);
        
        if (Date.now() > pending.expiresAt) {
          pendingVer.delete(userKey);
          return reply('⏳ El canje expiró. Vuelve a responder al archivo y usa *.ver*.');
        }

        if (xp < COSTO_VER) {
          pendingVer.delete(userKey);
          return reply(`❌ No tienes suficiente XP para canjear *.ver*.\n💰 Costo: *${COSTO_VER} XP*\n⭐ Tu XP actual: *${xp} XP*`);
        }

        // Cobro seguro de XP
        userData.xp -= COSTO_VER;
        if (userData.save) await userData.save(); else await db.setUser(sender, userData);
        chargedXp = true;

        await sendMedia(sock, pending.remoteJid, pending.mediaInfo, pending.quotedOriginal);
        pendingVer.delete(userKey);
        return;
      }

      // USO NORMAL
      const quoted = getQuotedMessage(msg);
      const quotedOriginal = getQuotedWAMessage(msg, remoteJid);

      if (!quoted) {
        if (isOwner || premium) return reply('❌ Responde a una imagen, video o audio enviado como "Ver una sola vez".\n👑 Para ti es gratis.');
        if (verUses > 0) return reply(`🎟️ Tienes *${verUses}* uso(s) comprado(s) de *.ver*.\n\nPara usar uno, responde a la imagen "ver una sola vez" con *.ver*`);
        if (xp < COSTO_VER) return reply(`❌ No tienes usos de *.ver* ni XP suficiente.\n💰 Necesitas *${COSTO_VER} XP*.\n⭐ Tienes: *${xp} XP*`);
        
        return reply(`ℹ️ Tienes XP suficiente para usar *.ver*.\n💰 Precio: *${COSTO_VER} XP*\n\nPara usarlo ahora:\n1. Responde a la imagen "ver una vez" con *.ver*\n2. Confirma con *.ver aceptar*`);
      }

      const mediaInfo = getMediaInfo(quoted);
      if (!mediaInfo) return reply('❌ El mensaje citado no es una imagen, video o audio compatible.');

      // Si es dueño o premium, lo saca directo
      if (isOwner || premium) return sendMedia(sock, remoteJid, mediaInfo, quotedOriginal);

      // Si tiene ticket de inventario
      if (verUses > 0) {
        userData.inventory.verUses -= 1;
        if (userData.save) await userData.save(); else await db.setUser(sender, userData);
        usedTicket = true;
        return sendMedia(sock, remoteJid, mediaInfo, quotedOriginal);
      }

      if (xp < COSTO_VER) return reply(`❌ No tienes suficiente XP para usar *.ver*.\n💰 Costo: *${COSTO_VER} XP*\n⭐ Tu XP actual: *${xp} XP*`);

      pendingVer.set(userKey, { remoteJid, mediaInfo, quotedOriginal, expiresAt: Date.now() + PENDING_TIME });

      return reply(`⚠️ *Confirmar canje*\n\nVas a gastar *${COSTO_VER} XP* para ver este archivo.\n\n⭐ Tu XP actual: *${xp} XP*\n⭐ Te quedaría: *${xp - COSTO_VER} XP*\n\nPara confirmar escribe:\n*.ver aceptar*\n\n⏳ Tienes 60 segundos.`);

    } catch (err) {
      console.log('❌ Error en ver:', err?.message || err);
      // Reembolso seguro
      if (chargedXp) {
        userData.xp += COSTO_VER;
        if (userData.save) await userData.save(); else await db.setUser(sender, userData);
      }
      if (usedTicket) {
        if (!userData.inventory) userData.inventory = {};
        userData.inventory.verUses = (userData.inventory.verUses || 0) + 1;
        if (userData.save) await userData.save(); else await db.setUser(sender, userData);
      }
      return reply('❌ Ocurrió un error al intentar revelar el archivo.');
    }
  }
};
