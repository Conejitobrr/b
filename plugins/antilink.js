'use strict';

const fs = require('fs');
const path = require('path');

const WARNS_PATH = path.join(process.cwd(), 'lib', 'warns.json');
if (!fs.existsSync(path.dirname(WARNS_PATH))) fs.mkdirSync(path.dirname(WARNS_PATH), { recursive: true });
if (!fs.existsSync(WARNS_PATH)) fs.writeFileSync(WARNS_PATH, '{}');

function getWarns() { try { return JSON.parse(fs.readFileSync(WARNS_PATH, 'utf8')); } catch { return {}; } }
function saveWarns(data) { fs.writeFileSync(WARNS_PATH, JSON.stringify(data, null, 2)); }

module.exports = {
  name: 'antilink',
  category: 'moderación',
  desc: 'Elimina enlaces de WhatsApp y advierte a los usuarios',

  onMessage: async (ctx) => {
    const { sock, msg, remoteJid, body, sender, isOwner, isAdmin, groupData } = ctx;

    if (!remoteJid || !remoteJid.endsWith('@g.us') || !body) return;
    if (!groupData || groupData.antilink !== true) return;

    const linkRegex = /chat\.whatsapp\.com/i;
    if (!linkRegex.test(body)) return;

    if (isOwner || isAdmin) return;

    // 🔥 EXTRACCIÓN 100% IDÉNTICA AL PLUGIN RETO.JS
    // Esto garantiza que el ID y el número sean puros, forzando la mención real (azul/Nick).
    const senderJid = String(sender).split(':')[0];
    const senderNum = senderJid.split('@')[0].replace(/\D/g, ''); 

    // Borrado automático
    try {
      await sock.sendMessage(remoteJid, { delete: msg.key });
    } catch (err) {
      console.log('No se borró el link (Posible falta de permisos):', err.message);
    }

    const dbWarns = getWarns();
    if (!dbWarns[remoteJid]) dbWarns[remoteJid] = {};

    const currentWarns = (dbWarns[remoteJid][senderJid] || 0) + 1;
    dbWarns[remoteJid][senderJid] = currentWarns;

    if (currentWarns >= 3) {
      dbWarns[remoteJid][senderJid] = 0; 
      saveWarns(dbWarns);

      await sock.sendMessage(remoteJid, { 
        text: `🚫 *LÍMITE ALCANZADO*\n\n@${senderNum} ha sido expulsado por enviar enlaces de otros grupos (3/3 advertencias).`, 
        mentions: [senderJid] 
      });

      // Baneo con ID purificado (Evita internal-server-error)
      setTimeout(async () => {
        try {
          await sock.groupParticipantsUpdate(remoteJid, [senderJid], 'remove');
        } catch (err) {
          console.log('Error expulsando al usuario:', err.message);
        }
      }, 1000);

    } else {
      saveWarns(dbWarns);
      
      await sock.sendMessage(remoteJid, { 
        text: `⚠️ *ANTILINK DETECTADO*\n\n@${senderNum}, no se permiten enlaces de otros grupos aquí.\n🚨 Warns: *${currentWarns}/3*`, 
        mentions: [senderJid] 
      });
    }
  }
};
