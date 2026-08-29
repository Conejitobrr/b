'use strict';

const fs = require('fs');
const path = require('path');

// 🔥 RUTA BLINDADA PARA WARNS
const WARNS_PATH = path.join(process.cwd(), 'lib', 'warns.json');
if (!fs.existsSync(path.dirname(WARNS_PATH))) fs.mkdirSync(path.dirname(WARNS_PATH), { recursive: true });
if (!fs.existsSync(WARNS_PATH)) fs.writeFileSync(WARNS_PATH, '{}'); // Lo crea automáticamente

function getWarns() { try { return JSON.parse(fs.readFileSync(WARNS_PATH, 'utf8')); } catch { return {}; } }
function saveWarns(data) { fs.writeFileSync(WARNS_PATH, JSON.stringify(data, null, 2)); }

// Estandariza los números para evitar errores de lectura
function cleanJid(jid = '') { return String(jid).split(':')[0] + '@s.whatsapp.net'; }

module.exports = {
  name: 'antilink',
  category: 'moderación',
  desc: 'Elimina enlaces y expulsa a los usuarios al llegar a 3 advertencias',
  
  onMessage: async ({ sock, msg, remoteJid, body, sender, isOwner }) => {
    // Solo actuar en grupos y si hay texto
    if (!remoteJid.endsWith('@g.us') || !body) return;

    // Regex para detectar enlaces de grupos de WhatsApp
    const linkRegex = /chat\.whatsapp\.com\/[0-9A-Za-z]{10,}/i;
    if (!linkRegex.test(body)) return;

    if (isOwner) return; // El Owner es inmune y puede mandar links

    const senderJid = cleanJid(sender);
    const botJid = cleanJid(sock.user.id);

    let isBotAdmin = false;
    let isAdmin = false;

    // Verificamos quién es admin de forma nativa
    try {
      const groupMetadata = await sock.groupMetadata(remoteJid);
      const participants = groupMetadata.participants || [];
      isBotAdmin = participants.some(p => p.id === botJid && (p.admin === 'admin' || p.admin === 'superadmin'));
      isAdmin = participants.some(p => p.id === senderJid && (p.admin === 'admin' || p.admin === 'superadmin'));
    } catch (e) {
      console.log('Error obteniendo metadata del grupo en antilink', e);
    }

    if (isAdmin) return; // Los admins son inmunes
    if (!isBotAdmin) return; // Si el bot no es admin, aborta silenciosamente

    // 1. ELIMINAR EL MENSAJE
    try {
      await sock.sendMessage(remoteJid, { delete: msg.key });
    } catch (err) {
      console.log('Error eliminando link:', err);
    }

    // 2. SISTEMA DE WARNS INDESTRUCTIBLE
    const dbWarns = getWarns();
    if (!dbWarns[remoteJid]) dbWarns[remoteJid] = {}; // Crea el grupo en el archivo si no existe
    
    const currentWarns = (dbWarns[remoteJid][senderJid] || 0) + 1;
    dbWarns[remoteJid][senderJid] = currentWarns;

    // 3. EJECUCIÓN DE CASTIGOS
    if (currentWarns >= 3) {
      dbWarns[remoteJid][senderJid] = 0; // Reinicia el contador
      saveWarns(dbWarns); // Guarda el reinicio

      await sock.sendMessage(remoteJid, { 
        text: `🚫 *LÍMITE ALCANZADO*\n\n@${senderJid.split('@')[0]} ha sido expulsado por enviar enlaces de otros grupos (3/3 advertencias).`, 
        mentions: [senderJid] 
      });

      try {
        await sock.groupParticipantsUpdate(remoteJid, [senderJid], 'remove');
      } catch (err) {
        console.log('Error al expulsar:', err);
      }
    } else {
      saveWarns(dbWarns); // Guarda el nuevo strike

      await sock.sendMessage(remoteJid, { 
        text: `⚠️ *ANTILINK DETECTADO*\n\n@${senderJid.split('@')[0]}, no se permiten enlaces de otros grupos aquí.\n🚨 Warns: *${currentWarns}/3*`, 
        mentions: [senderJid] 
      });
    }
  }
};
