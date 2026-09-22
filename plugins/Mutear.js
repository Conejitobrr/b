'use strict';

const fs = require('fs');
const path = require('path');

const MUTED_FILE = path.join(process.cwd(), 'database', 'muted.json');

// ==========================================
// 🧹 FUNCIONES DE LIMPIEZA (Extraídas de tu insulto.js)
// ==========================================
function cleanJid(jid = '') { 
  return String(jid).split(':')[0]; 
}

function cleanNumber(jid = '') { 
  return cleanJid(jid).split('@')[0].replace(/\D/g, ''); 
}

function getTarget(msg, args) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return cleanJid(quoted);
  
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return cleanJid(mentioned);
  
  if (args && args[0]) {
    const cleanArgs = args.join('').replace(/\D/g, '');
    if (cleanArgs) return `${cleanArgs}@s.whatsapp.net`;
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
  throw lastError || new Error('No se pudo eliminar.');
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

  // 🔥 ESCÁNER DE MENSAJES PASIVO (Para borrar en tiempo real)
  async onMessage({ sock, msg, remoteJid, sender, fromGroup }) {
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
        // Silencioso para no hacer spam si no es administrador
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

    // 🎯 Usamos el getTarget infalible de tu insulto.js
    const target = getTarget(msg, args);
    
    if (!target) {
      return reply('❌ Debes responder a un mensaje, mencionar a alguien o escribir su número.\n\n*Ejemplo:*\n.mutear @usuario');
    }

    // Aseguramos formato estricto JID para que funcione la mención azul
    const targetJid = target.includes('@s.whatsapp.net') ? target : `${cleanNumber(target)}@s.whatsapp.net`;
    const targetNum = cleanNumber(targetJid);
    
    const data = loadMutes();
    const cmd = String(commandName || '').toLowerCase();

    // ==========================================
    // 🔴 ACCIÓN: MUTEAR / SILENCIAR
    // ==========================================
    if (cmd === 'mutear' || cmd === 'silenciar') {
      const botRaw = sock.user?.id || sock.user?.jid || '';
      if (targetJid === cleanJid(botRaw)) {
        return reply('🛡️ No puedes mutearme a mí. ¡Soy el bot!');
      }

      // Inmunidad al Owner
      const ownerNumbers = Array.isArray(config?.owner) ? config.owner.map(n => String(n).replace(/\D/g, '')) : [];
      if (ownerNumbers.includes(targetNum)) {
        return sock.sendMessage(remoteJid, { 
          text: `🛡️ Inmunidad de sistema. No se puede silenciar al Owner @${targetNum}.`, 
          mentions: [targetJid] 
        }, { quoted: msg });
      }

      if (!data[remoteJid]) data[remoteJid] = {};
      
      if (data[remoteJid][targetJid]) {
        return sock.sendMessage(remoteJid, { 
          text: `⚠️ @${targetNum} ya se encuentra silenciado en este chat.`, 
          mentions: [targetJid] 
        }, { quoted: msg });
      }

      data[remoteJid][targetJid] = {
        mutedBy: cleanJid(sender),
        time: Date.now()
      };
      saveMutes(data);

      return sock.sendMessage(remoteJid, { 
        text: `🤐 *¡USUARIO SILENCIADO!* 🤐\n\nEl usuario @${targetNum} ha sido muteado.\n\n_Sus mensajes serán eliminados al instante._ 🚷\n\n⚠️ *Nota:* Asegúrate de que yo tenga rango de Administrador.`, 
        mentions: [targetJid] 
      }, { quoted: msg });
    }

    // ==========================================
    // 🟢 ACCIÓN: UNMUTEAR / DESILENCIAR
    // ==========================================
    if (cmd === 'unmutear' || cmd === 'desilenciar') {
      if (!data[remoteJid] || !data[remoteJid][targetJid]) {
        return sock.sendMessage(remoteJid, { 
          text: `⚠️ @${targetNum} no está silenciado en este grupo.`, 
          mentions: [targetJid] 
        }, { quoted: msg });
      }

      delete data[remoteJid][targetJid];
      if (Object.keys(data[remoteJid]).length === 0) delete data[remoteJid];
      saveMutes(data);

      return sock.sendMessage(remoteJid, { 
        text: `🔊 @${targetNum} ha sido desilenciado. Ya puede volver a escribir normalmente en el grupo.`, 
        mentions: [targetJid] 
      }, { quoted: msg });
    }
  }
};
