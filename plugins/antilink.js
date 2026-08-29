'use strict';

const fs = require('fs');
const path = require('path');

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

  // Capturamos el contexto completo que envía el bot (ctx)
  onMessage: async (ctx) => {
    const { sock, msg, remoteJid, body, sender, isOwner, isAdmin, isBotAdmin, groupData } = ctx;

    // 1. Validaciones base
    if (!remoteJid || !remoteJid.endsWith('@g.us') || !body) return;

    // 2. Comprobar si fue apagado intencionalmente (.disable antilink)
    if (groupData && groupData.antilink === false) return;

    // 3. Detectar enlace de WhatsApp
    const linkRegex = /chat\.whatsapp\.com\/[0-9A-Za-z]{10,}/i;
    if (!linkRegex.test(body)) return;

    // 4. Inmunidad (Owners y Admins pueden enviar enlaces)
    if (isOwner || isAdmin) return;

    const senderJid = cleanJid(sender);
    const botJid = cleanJid(sock.user.id);

    // 5. Permisos del Bot para poder borrar y expulsar
    let botEsAdmin = isBotAdmin;
    if (botEsAdmin === undefined) {
      try {
        const groupMetadata = await sock.groupMetadata(remoteJid);
        const participants = groupMetadata.participants || [];
        botEsAdmin = participants.some(p => p.id === botJid && (p.admin === 'admin' || p.admin === 'superadmin'));
        
        // Refuerzo local para verificar al usuario si el framework no lo detectó
        if (isAdmin === undefined) {
          const senderEsAdmin = participants.some(p => p.id === senderJid && (p.admin === 'admin' || p.admin === 'superadmin'));
          if (senderEsAdmin) return;
        }
      } catch (e) {
        console.log('Error obteniendo admins:', e);
      }
    }

    // Si el bot no es admin en el grupo, ignora el mensaje
    if (!botEsAdmin) return; 

    // 6. ELIMINAR EL MENSAJE
    try {
      await sock.sendMessage(remoteJid, { delete: msg.key });
    } catch (err) {
      console.log('Fallo al borrar link:', err);
    }

    // 7. SISTEMA DE WARNS BLINDADO
    const dbWarns = getWarns();
    if (!dbWarns[remoteJid]) dbWarns[remoteJid] = {};

    const currentWarns = (dbWarns[remoteJid][senderJid] || 0) + 1;
    dbWarns[remoteJid][senderJid] = currentWarns;

    // 8. EJECUTAR CASTIGO
    if (currentWarns >= 3) {
      dbWarns[remoteJid][senderJid] = 0; // Reiniciar
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
