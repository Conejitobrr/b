'use strict';

const fs = require('fs');
const path = require('path');

const WARNS_PATH = path.join(process.cwd(), 'lib', 'warns.json');
if (!fs.existsSync(path.dirname(WARNS_PATH))) fs.mkdirSync(path.dirname(WARNS_PATH), { recursive: true });
if (!fs.existsSync(WARNS_PATH)) fs.writeFileSync(WARNS_PATH, '{}');

function getWarns() { try { return JSON.parse(fs.readFileSync(WARNS_PATH, 'utf8')); } catch { return {}; } }
function saveWarns(data) { fs.writeFileSync(WARNS_PATH, JSON.stringify(data, null, 2)); }

// 🔥 CORRECCIÓN CRÍTICA: Destruye cualquier signo '+' o espacio para evitar el internal-server-error
function cleanJid(jid = '') { 
  const number = String(jid).replace(/\D/g, ''); 
  return `${number}@s.whatsapp.net`;
}

module.exports = {
  name: 'antilink',
  category: 'moderación',
  desc: 'Elimina enlaces de WhatsApp y advierte a los usuarios',

  onMessage: async (ctx) => {
    const { sock, msg, remoteJid, body, sender, isOwner, isAdmin, groupData } = ctx;

    if (!remoteJid || !remoteJid.endsWith('@g.us') || !body) return;
    if (!groupData || groupData.antilink !== true) return;

    const linkRegex = /chat\.whatsapp\.com\/[0-9A-Za-z]{10,}/i;
    if (!linkRegex.test(body)) return;

    if (isOwner || isAdmin) return;

    // Genera el ID matemáticamente perfecto
    const senderJid = cleanJid(sender);
    const senderNum = senderJid.split('@')[0];

    try {
      await sock.sendMessage(remoteJid, { delete: msg.key });
    } catch (err) {
      console.log('No se borró el link:', err.message);
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

      setTimeout(async () => {
        try {
          await sock.groupParticipantsUpdate(remoteJid, [senderJid], 'remove');
        } catch (err) {
          console.log('No se pudo expulsar:', err.message);
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
