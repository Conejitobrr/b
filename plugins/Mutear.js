'use strict';

const fs = require('fs');
const path = require('path');

const MUTED_FILE = path.join(process.cwd(), 'database', 'muted.json');

// ==========================================
// 🔥 FUNCIÓN BLINDADA DE BORRADO (Basada en tu .del)
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
      return true; // Si funciona al primer o segundo intento, corta el ciclo
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('No se pudo eliminar el mensaje.');
}

// 🛡️ COLA DE SEGURIDAD EN RAM (Evita baneos de WhatsApp por spam)
const deleteQueue = [];
let isDeleting = false;

async function processDeleteQueue() {
  if (isDeleting) return;
  isDeleting = true;

  while (deleteQueue.length > 0) {
    const task = deleteQueue.shift();
    try {
      // Usamos tu función blindada para eliminar el mensaje de la cola
      await tryDeleteMessage(task.sock, task.remoteJid, task.key);
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (err) {
      // Si a pesar de los 3 intentos falla (ej. no es admin), no crashea
      console.log('⚠️ Error silenciando msj:', err?.message);
    }
  }
  isDeleting = false;
}

// ==========================================
// FUNCIONES DE CONTROL Y LIMPIEZA DE JID
// ==========================================
function getPureJid(jid = '') {
  const str = String(jid);
  if (!str) return '';
  const num = str.split('@')[0].replace(/\D/g, '');
  return `${num}@s.whatsapp.net`;
}

function getTarget(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return getPureJid(quoted);
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return getPureJid(mentioned);
  return null;
}

// ==========================================
// GESTIÓN DEL ARCHIVO DE SILENCIADOS (JSON)
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
  return !!data?.[groupId]?.[getPureJid(userJid)];
}

// ==========================================
// ESTRUCTURA PRINCIPAL DEL PLUGIN
// ==========================================
module.exports = {
  name: 'mutear',
  aliases: ['unmutear', 'silenciar', 'desilenciar'],
  category: 'moderación',
  desc: 'Silencia a un usuario del grupo eliminando sus mensajes automáticamente',

  // 🔥 MONITOR PASIVO
  async onMessage(ctx) {
    const { sock, msg, remoteJid, sender, fromGroup } = ctx;

    // Solo revisamos mensajes reales dentro de grupos
    if (!fromGroup || !sender || !msg?.key) return;

    const userJid = getPureJid(sender);

    if (isUserMuted(remoteJid, userJid)) {
      // Mandamos la llave pura a la cola de exterminio
      deleteQueue.push({ 
        sock: sock, 
        remoteJid: remoteJid, 
        key: msg.key 
      });
      processDeleteQueue();
    }
  },

  // 🛠️ EJECUCIÓN DE COMANDOS MANUALES
  async execute(ctx) {
    const { sock, remoteJid, msg, sender, args, commandName, fromGroup, isOwner, isAdmin, reply } = ctx;

    if (!fromGroup) {
      return reply('❌ Este comando solo se puede usar dentro de grupos.');
    }

    if (!isAdmin && !isOwner) {
      return reply('❌ Solo los administradores del grupo o el owner pueden usar este comando.');
    }

    let target = getTarget(msg);
    
    if (!target && args.length > 0) {
      const num = args.join('').replace(/\D/g, '');
      if (num.length >= 6) target = `${num}@s.whatsapp.net`;
    }

    if (!target) {
      return reply('❌ Debes responder a un mensaje, mencionar a alguien o escribir su número.\n\n*Ejemplo:*\n.mutear @usuario');
    }

    const targetJid = getPureJid(target);
    const targetNum = targetJid.split('@')[0];
    const data = loadMutes();
    const cmd = String(commandName || '').toLowerCase();

    // ==========================================
    // ACCIÓN: MUTEAR / SILENCIAR
    // ==========================================
    if (cmd === 'mutear' || cmd === 'silenciar') {
      const botRaw = sock.user?.id || sock.user?.jid || '';
      if (targetJid === getPureJid(botRaw)) {
        return reply('🛡️ No puedes mutearme a mí. ¡Soy el bot!');
      }

      // Protección de inmunidad para Owners
      const ownerNumbers = Array.isArray(ctx.config?.owner) ? ctx.config.owner.map(n => String(n).replace(/\D/g, '')) : [];
      if (ownerNumbers.includes(targetNum)) {
        return reply(`🛡️ No se puede mutear a @${targetNum} porque cuenta con inmunidad (es Owner).`, { mentions: [targetJid] });
      }

      if (!data[remoteJid]) data[remoteJid] = {};
      
      if (data[remoteJid][targetJid]) {
        return reply(`⚠️ @${targetNum} ya se encuentra silenciado en este chat.`, { mentions: [targetJid] });
      }

      data[remoteJid][targetJid] = {
        mutedBy: getPureJid(sender),
        time: Date.now()
      };
      saveMutes(data);

      return sock.sendMessage(remoteJid, { 
        text: `🤐 *¡USUARIO SILENCIADO!* 🤐\n\nEl usuario @${targetNum} ha sido muteado.\n\n_Sus mensajes serán eliminados automáticamente._ 🚷\n\n⚠️ *Nota:* Asegúrate de que yo sea Administrador del grupo.`, 
        mentions: [targetJid] 
      }, { quoted: msg });
    }

    // ==========================================
    // ACCIÓN: UNMUTEAR / DESILENCIAR
    // ==========================================
    if (cmd === 'unmutear' || cmd === 'desilenciar') {
      if (!data[remoteJid] || !data[remoteJid][targetJid]) {
        return reply(`⚠️ @${targetNum} no está silenciado en este grupo.`, { mentions: [targetJid] });
      }

      delete data[remoteJid][targetJid];
      if (Object.keys(data[remoteJid]).length === 0) delete data[remoteJid];
      saveMutes(data);

      return sock.sendMessage(remoteJid, { 
        text: `🔊 @${targetNum} ha sido desilenciado. Ya puede volver a escribir normalmente.`, 
        mentions: [targetJid] 
      }, { quoted: msg });
    }
  }
};
