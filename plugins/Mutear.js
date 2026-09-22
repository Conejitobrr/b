'use strict';

const fs = require('fs');
const path = require('path');

const MUTED_FILE = path.join(process.cwd(), 'database', 'muted.json');

// ==========================================
// 🧹 FUNCIONES EXACTAS DE TU PERFIL.JS
// ==========================================
function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

function cleanNumber(jid = '') {
  return cleanJid(jid).split('@')[0].replace(/\D/g, '');
}

// Adaptado de tu perfil.js para extraer el usuario a mutear sin errores
function getTarget(msg, args) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return cleanJid(quoted);

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return cleanJid(mentioned);

  // Si se escribe el número manualmente en el comando
  if (args && args.length > 0) {
    const num = args.join('').replace(/\D/g, '');
    if (num.length >= 6) return `${num}@s.whatsapp.net`;
  }

  return null;
}

// ==========================================
// 🔥 FUNCIÓN BLINDADA DE BORRADO (De tu del.js)
// ==========================================
async function tryDeleteMessage(sock, remoteJid, key) {
  const attempts = [
    key,
    { ...key, fromMe: true },
    { ...key, fromMe: false }
  ];

  let lastError = null;
  for (const deleteKey of attempts) {
    try {
      await sock.sendMessage(remoteJid, { delete: deleteKey });
      return true; 
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('No se pudo eliminar el mensaje.');
}

// ==========================================
// GESTIÓN DEL ARCHIVO DE SILENCIADOS
// ==========================================
function loadMutes() {
  try {
    const dir = path.dirname(MUTED_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(MUTED_FILE)) fs.writeFileSync(MUTED_FILE, JSON.stringify({}, null, 2));
    return JSON.parse(fs.readFileSync(MUTED_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveMutes(data) {
  try {
    fs.writeFileSync(MUTED_FILE, JSON.stringify(data, null, 2));
  } catch {}
}

function isUserMuted(groupId, userJid) {
  const data = loadMutes();
  return !!data?.[groupId]?.[cleanJid(userJid)];
}

module.exports = {
  name: 'mutear',
  aliases: ['unmutear', 'silenciar', 'desilenciar'],
  category: 'moderación',
  desc: 'Silencia a un usuario eliminando sus mensajes al instante',

  // 🔥 ESCÁNER DE MENSAJES PASIVO
  async onMessage(ctx) {
    const { sock, msg, remoteJid, sender, fromGroup } = ctx;

    if (!fromGroup || !sender || !msg?.key || !sock) return;

    const userJid = cleanJid(sender);

    if (isUserMuted(remoteJid, userJid)) {
      const targetKey = {
        remoteJid: remoteJid,
        id: msg.key.id,
        participant: sender,
        fromMe: false
      };

      try {
        await tryDeleteMessage(sock, remoteJid, targetKey);
      } catch (e) {
        // Silencioso para no hacer spam si no es admin
      }
    }
  },

  // 🛠️ COMANDOS MANUALES
  async execute({ sock, remoteJid, msg, sender, args, commandName, fromGroup, isOwner, isAdmin, reply, config }) {
    
    if (!fromGroup) {
      return reply('❌ Este comando solo se puede usar dentro de grupos.');
    }

    if (!isAdmin && !isOwner) {
      return reply('❌ Solo los administradores o el owner pueden usar este comando.');
    }

    // 🎯 Usamos la extracción exacta de tu perfil.js
    let target = getTarget(msg, args);
    
    if (!target) {
      return reply('❌ Debes responder a un mensaje, mencionar a alguien o escribir su número.\n\n*Ejemplo:*\n.mutear @usuario');
    }

    // Formateamos el JID estrictamente para que la mención sea azul real
    if (!target.includes('@s.whatsapp.net')) {
      target = `${target}@s.whatsapp.net`;
    }

    const targetNum = cleanNumber(target);
    const data = loadMutes();
    const cmd = String(commandName || '').toLowerCase();

    // ==========================================
    // 🔴 ACCIÓN: MUTEAR / SILENCIAR
    // ==========================================
    if (cmd === 'mutear' || cmd === 'silenciar') {
      const botRaw = cleanJid(sock.user?.id || sock.user?.jid || '');
      if (cleanJid(target) === botRaw) {
        return reply('🛡️ No puedes mutearme a mí. ¡Soy el bot!');
      }

      const ownerNumbers = Array.isArray(config?.owner) ? config.owner.map(n => String(n).replace(/\D/g, '')) : [];
      if (ownerNumbers.includes(targetNum)) {
        return sock.sendMessage(remoteJid, { 
          text: `🛡️ Inmunidad de sistema. No se puede silenciar al Owner @${targetNum}.`, 
          mentions: [target] 
        }, { quoted: msg });
      }

      if (!data[remoteJid]) data[remoteJid] = {};
      
      if (data[remoteJid][target]) {
        return sock.sendMessage(remoteJid, { 
          text: `⚠️ @${targetNum} ya se encuentra silenciado en este chat.`, 
          mentions: [target] 
        }, { quoted: msg });
      }

      data[remoteJid][target] = {
        mutedBy: cleanJid(sender),
        time: Date.now()
      };
      saveMutes(data);

      return sock.sendMessage(remoteJid, { 
        text: `🤐 *¡USUARIO SILENCIADO!* 🤐\n\nEl usuario @${targetNum} ha sido muteado.\n\n_Sus mensajes serán eliminados al instante._ 🚷\n\n⚠️ *Nota:* Asegúrate de que yo tenga rango de Administrador.`, 
        mentions: [target] 
      }, { quoted: msg });
    }

    // ==========================================
    // 🟢 ACCIÓN: UNMUTEAR / DESILENCIAR
    // ==========================================
    if (cmd === 'unmutear' || cmd === 'desilenciar') {
      if (!data[remoteJid] || !data[remoteJid][target]) {
        return sock.sendMessage(remoteJid, { 
          text: `⚠️ @${targetNum} no está silenciado en este grupo.`, 
          mentions: [target] 
        }, { quoted: msg });
      }

      delete data[remoteJid][target];
      if (Object.keys(data[remoteJid]).length === 0) delete data[remoteJid];
      saveMutes(data);

      return sock.sendMessage(remoteJid, { 
        text: `🔊 @${targetNum} ha sido desilenciado. Ya puede volver a escribir normalmente en el grupo.`, 
        mentions: [target] 
      }, { quoted: msg });
    }
  }
};
