'use strict';

const fs = require('fs');
const path = require('path');

// 🗄️ BÓVEDA LOCAL PARA WARNS
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
    // Tomamos los datos limpios que ya procesó tu handler.js
    const { sock, msg, remoteJid, body, sender, isOwner, isAdmin, groupData } = ctx;

    // 1. Filtros vitales
    if (!remoteJid || !remoteJid.endsWith('@g.us') || !body) return;

    // 2. Verificar que la opción esté encendida (.enable antilink)
    if (!groupData || groupData.antilink !== true) return;

    // 3. Detectar el patrón del enlace
    const linkRegex = /chat\.whatsapp\.com\/[0-9A-Za-z]{10,}/i;
    if (!linkRegex.test(body)) return;

    // 4. Inmunidad absoluta a Owner y Administradores del grupo
    if (isOwner || isAdmin) return;

    const senderJid = cleanJid(sender);

    // 5. FUERZA BRUTA: Eliminar enlace sin consultar permisos previamente
    try {
      await sock.sendMessage(remoteJid, { delete: msg.key });
    } catch (err) {
      console.log('No se borró el link (Probablemente el bot no es admin):', err.message);
    }

    // 6. SISTEMA DE WARNS INMUNE A MONGODB
    const dbWarns = getWarns();
    if (!dbWarns[remoteJid]) dbWarns[remoteJid] = {};

    const currentWarns = (dbWarns[remoteJid][senderJid] || 0) + 1;
    dbWarns[remoteJid][senderJid] = currentWarns;

    // 7. APLICAR ADVERTENCIA O EXPULSIÓN
    if (currentWarns >= 3) {
      dbWarns[remoteJid][senderJid] = 0; // Reiniciar cuenta
      saveWarns(dbWarns);

      await sock.sendMessage(remoteJid, { 
        text: `🚫 *LÍMITE ALCANZADO*\n\n@${senderJid.split('@')[0]} ha sido expulsado por enviar enlaces de otros grupos (3/3 advertencias).`, 
        mentions: [senderJid] 
      });

      try {
        await sock.groupParticipantsUpdate(remoteJid, [senderJid], 'remove');
      } catch (err) {
        console.log('No se pudo expulsar (Probablemente el bot no es admin):', err.message);
      }
    } else {
      saveWarns(dbWarns);
      await sock.sendMessage(remoteJid, { 
        text: `⚠️ *ANTILINK DETECTADO*\n\n@${senderJid.split('@')[0]}, no se permiten enlaces de otros grupos aquí.\n🚨 Warns: *${currentWarns}/3*`, 
        mentions: [senderJid] 
      });
    }
  }
};
