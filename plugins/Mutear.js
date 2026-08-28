'use strict';

const fs = require('fs');
const path =
path.join(process.cwd(), 'lib', 'muted.json');

// ==========================================
// FUNCIONES DE CONTROL Y LIMPIEZA DE JID
// ==========================================
function cleanJid(jid = '') {
  const value = String(jid || '');
  if (!value) return '';
  if (value.includes('@')) {
    const [user, server] = value.split('@');
    return `${user.split(':')[0]}@${server}`;
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

  // 🔥 MONITOR PASIVO: Borra mensajes en tiempo real de usuarios silenciados
  async onMessage(ctx) {
    const { sock, msg, remoteJid, sender, fromGroup, isAdmin, isOwner } = ctx;

    if (!fromGroup || !sender) return;

    const userJid = cleanJid(sender);

    // Si está silenciado en este grupo
    if (isUserMuted(remoteJid, userJid)) {
      // Los admins o el owner no pueden ser silenciados de forma efectiva o sus mensajes se ignoran,
      // pero por seguridad si el bot es admin, procedemos a borrar el mensaje.
      try {
        await sock.sendMessage(remoteJid, { delete: msg.key });
      } catch (err) {
        console.log('❌ Error al intentar borrar mensaje de usuario muteado:', err?.message || err);
      }
    }
  },

  // 🛠️ EJECUCIÓN DE COMANDOS MANUALES (.mutear / .unmutear)
  async execute(ctx) {
    const { sock, remoteJid, msg, sender, args, commandName, fromGroup, isOwner, isAdmin, reply } = ctx;

    if (!fromGroup) {
      return reply('❌ Este comando solo se puede usar dentro de grupos.');
    }

    // 1. Permisos: Solo administradores o el owner
    if (!isAdmin && !isOwner) {
      return reply('❌ Solo los administradores del grupo o el owner pueden usar este comando.');
    }

    // 2. Resolver a quién se quiere mutear/unmutear
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
      // Validar inmunidad del Bot
      const botRaw = sock.user?.id || sock.user?.jid || '';
      if (targetJid === cleanJid(botRaw)) {
        return reply('🛡️ No puedes mutearme a mí. ¡Soy el bot!');
      }

      // Validar si el objetivo es Owner
      const ownerNumbers = Array.isArray(ctx.config?.owner) ? ctx.config.owner.map(n => String(n).replace(/\D/g, '')) : [];
      if (ownerNumbers.includes(targetNum)) {
        return reply(`🛡️ No se puede mutear a @${targetNum} porque cuenta con inmunidad (es Owner).`, { mentions: [targetJid] });
      }

      if (!data[remoteJid]) data[remoteJid] = {};
      
      if (data[remoteJid][targetJid]) {
        return reply(`⚠️ @${targetNum} ya se encuentra silenciado en este chat.`, { mentions: [targetJid] });
      }

      // Registrar el muteo
      data[remoteJid][targetJid] = {
        mutedBy: cleanJid(sender),
        time: Date.now()
      };
      saveMutes(data);

      return sock.sendMessage(remoteJid, { 
        text: `🤐 *¡USUARIO SILENCIADO!* 🤐\n\nEl usuario @${targetNum} ha sido muteado en el grupo.\n\n_Cada mensaje que intente enviar será eliminado automáticamente._ 🚷`, 
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

      // Remover del registro
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
