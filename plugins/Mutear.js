'use strict';

const fs = require('fs');
const path = require('path');

// Movemos el archivo a la carpeta database para mantener el orden de tus otros plugins
const MUTED_FILE = path.join(process.cwd(), 'database', 'muted.json'); 

// 🛡️ COLA DE SEGURIDAD REESCRITA (Anti-errores y Anti-Spam)
const deleteQueue = [];
let isDeleting = false;

async function processDeleteQueue(sock) {
  if (isDeleting) return;
  isDeleting = true;

  while (deleteQueue.length > 0) {
    const task = deleteQueue.shift();
    try {
      // 🛠️ RECONSTRUCCIÓN EXACTA DE LA LLAVE PARA BAILEYS
      const keyToDelete = {
        remoteJid: task.remoteJid,
        fromMe: false,
        id: task.id,
        participant: task.participant
      };
      
      await sock.sendMessage(task.remoteJid, { delete: keyToDelete });
      
      // Pequeña pausa de 300ms para no saturar los sockets de WhatsApp y evitar baneos
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (err) {
      // Si falla (ej: el bot no es admin), lo registramos sin crashear el bot
      console.log('⚠️ Error al borrar msj de silenciado:', err.message);
    }
  }
  isDeleting = false;
}

// ==========================================
// FUNCIONES DE CONTROL Y LIMPIEZA DE JID
// ==========================================
function cleanJid(jid = '') {
  const value = String(jid || '');
  if (!value) return '';
  if (value.includes('@')) {
    const [user, server] = value.split('@');
    return `${user.split(':')[0]}@${server}`; // Remueve el ID de sesión del dispositivo
  }
  return value.split(':')[0];
}

function number(jid = '') {
  return cleanJid(jid).split('@')[0].replace(/\D/g, '');
}

function getTarget(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return cleanJid(quoted);
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return cleanJid(mentioned);
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
  return !!data?.[groupId]?.[cleanJid(userJid)];
}

// ==========================================
// ESTRUCTURA PRINCIPAL DEL PLUGIN
// ==========================================
module.exports = {
  name: 'mutear',
  aliases: ['unmutear', 'silenciar', 'desilenciar'],
  category: 'moderación',
  desc: 'Silencia a un usuario del grupo eliminando sus mensajes automáticamente',

  // 🔥 MONITOR PASIVO CORREGIDO
  async onMessage(ctx) {
    const { sock, msg, remoteJid, sender, fromGroup } = ctx;

    if (!fromGroup || !sender || !msg?.key) return;

    const userJid = cleanJid(sender);

    if (isUserMuted(remoteJid, userJid)) {
      // Empujamos a la cola las variables exactas desglosadas
      deleteQueue.push({ 
        sock: sock, 
        remoteJid: remoteJid, 
        id: msg.key.id, 
        participant: msg.key.participant || userJid 
      });
      
      processDeleteQueue(sock);
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

    const targetJid = cleanJid(target);
    const targetNum = number(targetJid);
    const data = loadMutes();

    const cmd = String(commandName || '').toLowerCase();

    // ==========================================
    // ACCIÓN: MUTEAR / SILENCIAR
    // ==========================================
    if (cmd === 'mutear' || cmd === 'silenciar') {
      const botRaw = sock.user?.id || sock.user?.jid || '';
      if (targetJid === cleanJid(botRaw)) {
        return reply('🛡️ No puedes mutearme a mí. ¡Soy el bot!');
      }

      // Protección para los Owners
      const ownerNumbers = Array.isArray(ctx.config?.owner) ? ctx.config.owner.map(n => String(n).replace(/\D/g, '')) : [];
      if (ownerNumbers.includes(targetNum)) {
        return reply(`🛡️ No se puede mutear a @${targetNum} porque cuenta con inmunidad (es Owner).`, { mentions: [targetJid] });
      }

      if (!data[remoteJid]) data[remoteJid] = {};
      
      if (data[remoteJid][targetJid]) {
        return reply(`⚠️ @${targetNum} ya se encuentra silenciado en este chat.`, { mentions: [targetJid] });
      }

      data[remoteJid][targetJid] = {
        mutedBy: cleanJid(sender),
        time: Date.now()
      };
      saveMutes(data);

      return sock.sendMessage(remoteJid, { 
        text: `🤐 *¡USUARIO SILENCIADO!* 🤐\n\nEl usuario @${targetNum} ha sido muteado.\n\n_Sus mensajes serán eliminados automáticamente._ 🚷\n\n⚠️ *Nota:* Asegúrate de que el bot sea Administrador para que esto funcione.`, 
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
