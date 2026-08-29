'use strict';

const fs = require('fs');
const path = require('path');

const BANNED_PATH = path.join(process.cwd(), 'lib', 'banned.json');
if (!fs.existsSync(path.dirname(BANNED_PATH))) fs.mkdirSync(path.dirname(BANNED_PATH), { recursive: true });
if (!fs.existsSync(BANNED_PATH)) fs.writeFileSync(BANNED_PATH, '{}');

function getBanned() { try { return JSON.parse(fs.readFileSync(BANNED_PATH, 'utf8')); } catch { return {}; } }
function saveBanned(data) { fs.writeFileSync(BANNED_PATH, JSON.stringify(data, null, 2)); }

function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }

function getTarget(msg, args) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return cleanJid(quoted);
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return cleanJid(mentioned);
  if (args && args[0]) {
    const cleanArgs = args[0].replace(/\D/g, '');
    if (cleanArgs) return `${cleanArgs}@s.whatsapp.net`;
  }
  return null;
}

module.exports = {
  name: 'ban',
  aliases: ['banear', 'unban', 'desbanear'],
  category: 'owner',
  desc: 'Controla el acceso global de los usuarios al bot',

  execute: async ({ sock, msg, remoteJid, args, commandName, isOwner, db, reply }) => {
    try {
      if (!isOwner) return reply('❌ Comando de uso exclusivo para el Owner del bot.');

      const target = getTarget(msg, args);
      if (!target) return reply('❌ Debes mencionar o responder al mensaje del usuario.\n📌 Ejemplo: *.ban @usuario Spam*');
      
      const botJid = cleanJid(sock.user.id) + '@s.whatsapp.net';
      if (target === botJid) return reply('❌ No me puedo banear a mí mismo.');

      const targetNum = cleanNumber(target);
      const bannedDB = getBanned();
      const isBanning = ['ban', 'banear'].includes(commandName);

      const reason = args.join(' ').replace(/@\+?\d+/g, '').trim() || 'Uso indebido del bot';

      if (isBanning) {
        if (bannedDB[target]) {
          return sock.sendMessage(remoteJid, { text: `⚠️ @${targetNum} ya se encuentra baneado.`, mentions: [target] }, { quoted: msg });
        }

        bannedDB[target] = { reason, time: Date.now(), notified: false };
        saveBanned(bannedDB);

        if (db && typeof db.getUser === 'function') {
          const userData = await db.getUser(target);
          if (userData) {
            userData.banned = true;
            if (userData.save) await userData.save();
          }
        }

        return sock.sendMessage(remoteJid, {
          text: `🔨 *USUARIO BANEADO*\n\n@${targetNum} ha perdido el acceso al bot.\n📝 Razón: ${reason}`,
          mentions: [target]
        }, { quoted: msg });

      } else {
        if (!bannedDB[target]) {
          return sock.sendMessage(remoteJid, { text: `⚠️ @${targetNum} no estaba baneado.`, mentions: [target] }, { quoted: msg });
        }

        delete bannedDB[target];
        saveBanned(bannedDB);

        if (db && typeof db.getUser === 'function') {
          const userData = await db.getUser(target);
          if (userData) {
            userData.banned = false;
            if (userData.save) await userData.save();
          }
        }

        return sock.sendMessage(remoteJid, {
          text: `✅ *ACCESO RESTAURADO*\n\n@${targetNum} vuelve a tener permiso para usar el bot.`,
          mentions: [target]
        }, { quoted: msg });
      }

    } catch (err) {
      console.log('❌ Error en plugin ban:', err);
      return reply('❌ Ocurrió un error interno al intentar modificar el estado del usuario.');
    }
  }
};
