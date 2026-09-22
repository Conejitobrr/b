'use strict';

const fs = require('fs');
const path = require('path');

const MUTED_FILE = path.join(process.cwd(), 'database', 'muted.json');

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

module.exports = {
  name: 'mutear',
  aliases: ['unmutear', 'silenciar', 'desilenciar'],
  category: 'moderación',
  desc: 'Silencia a un usuario eliminando sus mensajes al instante (Fuerza Bruta)',

  // 🔥 MONITOR PASIVO (Sin colas lentas, borrado instantáneo)
  async onMessage(ctx) {
    // Extraemos las variables previniendo cualquier fallo del framework
    const sock = ctx.sock || ctx.conn || ctx.client;
    const msg = ctx.msg || ctx.message || ctx.m;
    const remoteJid = ctx.remoteJid;
    const sender = ctx.sender;
    const fromGroup = ctx.fromGroup;

    if (!fromGroup || !sender || !msg?.key || !sock) return;

    const userJid = getPureJid(sender);

    if (isUserMuted(remoteJid, userJid)) {
      // 1️⃣ LLAVE EXACTA DEL MENSAJE (Copia fiel de tu plugin .del)
      const targetKey = {
        remoteJid: remoteJid,
        id: msg.key.id,
        participant: sender,
        fromMe: false
      };

      // 2️⃣ ATAQUE DE FUERZA BRUTA
      const attempts = [
        targetKey,
        { ...targetKey, fromMe: true }
      ];

      for (const key of attempts) {
        try {
          await sock.sendMessage(remoteJid, { delete: key });
          break; // Si WhatsApp acepta el borrado, corta el ciclo de inmediato
        } catch (e) {
          // Falla silenciosa si WhatsApp lo rechaza (ej. el bot perdió el admin)
        }
      }
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

      // Protección para Owners
      const ownerNumbers = Array.isArray(ctx.config?.owner) ? ctx.config.owner.map(n => String(n).replace(/\D/g, '')) : [];
      if (ownerNumbers.includes(targetNum)) {
        // Obligamos al socket a lanzar la mención nativa
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
        mutedBy: getPureJid(sender),
        time: Date.now()
      };
      saveMutes(data);

      // Usamos sock.sendMessage directo para asegurar que la mención sea azul y real
      return sock.sendMessage(remoteJid, { 
        text: `🤐 *¡USUARIO SILENCIADO!* 🤐\n\nEl usuario @${targetNum} ha sido muteado.\n\n_Sus mensajes serán eliminados al instante._ 🚷\n\n⚠️ *Nota:* Asegúrate de que yo tenga rango de Administrador.`, 
        mentions: [targetJid] 
      }, { quoted: msg });
    }

    // ==========================================
    // ACCIÓN: UNMUTEAR / DESILENCIAR
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
