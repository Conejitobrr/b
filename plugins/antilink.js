'use strict';

const fs = require('fs');
const path = require('path');

// 🗄️ BÓVEDA LOCAL PARA WARNS (Inmune a MongoDB)
const WARNS_PATH = path.join(process.cwd(), 'lib', 'warns.json');
if (!fs.existsSync(path.dirname(WARNS_PATH))) fs.mkdirSync(path.dirname(WARNS_PATH), { recursive: true });
if (!fs.existsSync(WARNS_PATH)) fs.writeFileSync(WARNS_PATH, '{}');

function getWarns() { try { return JSON.parse(fs.readFileSync(WARNS_PATH, 'utf8')); } catch { return {}; } }
function saveWarns(data) { fs.writeFileSync(WARNS_PATH, JSON.stringify(data, null, 2)); }
function cleanJid(jid = '') { return String(jid).split(':')[0] + '@s.whatsapp.net'; }

module.exports = {
  name: 'antilink',
  category: 'moderación',
  desc: 'Elimina enlaces de WhatsApp y advierte a los usuarios',

  onMessage: async (ctx) => {
    const { sock, msg, remoteJid, body, sender, isOwner, db } = ctx;

    if (!remoteJid || !remoteJid.endsWith('@g.us') || !body) return;

    // 1. DETECCIÓN DEL LINK PRIMERO (Para no saturar al bot leyendo DBs)
    const linkRegex = /chat\.whatsapp\.com\/[0-9A-Za-z]{10,}/i;
    if (!linkRegex.test(body)) return;

    // 2. LEER CONFIGURACIÓN (Ignoramos el groupData del ctx por si viene corrupto del handler)
    let groupSettings = {};
    try {
      if (db && typeof db.getGroup === 'function') {
        groupSettings = await db.getGroup(remoteJid) || {};
      }
    } catch (e) {}

    // Si el antilink no está encendido (.enable antilink), ignorar.
    if (!groupSettings.antilink) return;

    // 3. INMUNIDAD DE OWNER Y DEL PROPIO BOT
    const senderJid = cleanJid(sender);
    const botJid = cleanJid(sock.user.id);
    if (isOwner || senderJid === botJid) return;

    // 4. LECTURA INDEPENDIENTE DE PERMISOS (Puenteamos tu Handler)
    let botEsAdmin = false;
    let senderEsAdmin = false;

    try {
      const groupMetadata = await sock.groupMetadata(remoteJid);
      const participants = groupMetadata.participants || [];
      
      botEsAdmin = participants.some(p => p.id === botJid && (p.admin === 'admin' || p.admin === 'superadmin'));
      senderEsAdmin = participants.some(p => p.id === senderJid && (p.admin === 'admin' || p.admin === 'superadmin'));
    } catch (e) {
      console.log('Error obteniendo metadata en antilink:', e);
    }

    if (senderEsAdmin) return; // Admins pueden enviar links
    if (!botEsAdmin) return; // Si el bot no tiene admin, aborta para no lanzar errores

    // 5. ELIMINAR EL MENSAJE
    try {
      await sock.sendMessage(remoteJid, { delete: msg.key });
    } catch (err) {
      console.log('Fallo al borrar link:', err);
    }

    // 6. GESTIÓN DE WARNS (Bóveda Blindada)
    const dbWarns = getWarns();
    if (!dbWarns[remoteJid]) dbWarns[remoteJid] = {};

    const currentWarns = (dbWarns[remoteJid][senderJid] || 0) + 1;
    dbWarns[remoteJid][senderJid] = currentWarns;

    // 7. EXPULSIÓN O ADVERTENCIA
    if (currentWarns >= 3) {
      dbWarns[remoteJid][senderJid] = 0; // Reiniciamos el contador tras expulsar
      saveWarns(dbWarns);

      await sock.sendMessage(remoteJid, { 
        text: `🚫 *LÍMITE ALCANZADO*\n\n@${senderJid.split('@')[0]} ha sido expulsado por enviar enlaces de otros grupos (3/3 advertencias).`, 
        mentions: [senderJid] 
      });

      try {
        await sock.groupParticipantsUpdate(remoteJid, [senderJid], 'remove');
      } catch (err) {}
    } else {
      saveWarns(dbWarns);

      await sock.sendMessage(remoteJid, { 
        text: `⚠️ *ANTILINK DETECTADO*\n\n@${senderJid.split('@')[0]}, no se permiten enlaces de otros grupos aquí.\n🚨 Warns: *${currentWarns}/3*`, 
        mentions: [senderJid] 
      });
    }
  }
};
