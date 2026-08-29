'use strict';

function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }

function getTarget(msg, sender) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return cleanJid(quoted);
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return cleanJid(mentioned);
  return cleanJid(sender);
}

// 📖 Diccionario para traducir las variables de la base de datos a nombres legibles con instrucciones
const DICCIONARIO_ITEMS = {
  mascota: { nombre: '🐶 Licencia de Mascota', uso: 'Usa *.adoptar [Nombre]* para obtener tu mascota.' },
  keys: { nombre: '🔑 Llave de Celda', uso: 'Usa *.usar llave* para escapar de prisión.' },
  cajaUses: { nombre: '📦 Caja Sorpresa XP', uso: 'Usa *.usar caja* para ganar XP aleatoria.' },
  verUses: { nombre: '🎟️ Tickets de .ver', uso: 'Responde a una imagen efímera con *.ver*.' },
  spotifyUses: { nombre: '🎵 Tickets de Spotify', uso: 'Usa *.spotify [canción]* de forma gratuita.' },
  shieldUses: { nombre: '🛡️ Escudo Anti-Robo', uso: 'Pasivo. Te protege automáticamente del próximo *.robar*.' },
  cana_pro: { nombre: '🎣 Caña Profesional', uso: 'Pasivo. Bono permanente en *.pescar*.' },
  arma_pro: { nombre: '🏹 Arco de Cacería', uso: 'Pasivo. Bono permanente en *.cazar*.' },
  hacha_pro: { nombre: '🪓 Hacha de Leñador', uso: 'Pasivo. Bono permanente en *.talar*.' },
  pico_pro: { nombre: '⛏️ Pico de Diamante', uso: 'Pasivo. Bono permanente en *.minar*.' },
  anillo: { nombre: '💍 Anillo de Bodas', uso: 'Siruye para proponer matrimonio.' }
};

module.exports = {
  name: 'inventario',
  aliases: ['inv', 'mochila', 'bolsa'],
  category: 'economía',
  desc: 'Muestra tu mochila con los ítems que has comprado',
  
  execute: async ({ sock, msg, remoteJid, sender, db, reply }) => {
    try {
      const target = getTarget(msg, sender);
      const user = await db.getUser(target);
      const inv = user.inventory || {};

      // Filtramos la base de datos para mostrar solo los ítems que tienen 1 o más en cantidad
      const itemsActivos = Object.entries(inv).filter(([_, cantidad]) => Number(cantidad) > 0);

      let texto = `🎒 *INVENTARIO DE @${cleanNumber(target)}*\n\n`;

      if (itemsActivos.length === 0) {
        texto += `_La mochila está vacía. Visita la *.tienda* para adquirir ítems._`;
      } else {
        for (const [key, cantidad] of itemsActivos) {
          const info = DICCIONARIO_ITEMS[key] || { nombre: `❓ ${key}`, uso: 'Ítem desconocido' };
          texto += `*\u27A4 ${cantidad}x* ${info.nombre}\n💡 _${info.uso}_\n\n`;
        }
      }

      return sock.sendMessage(remoteJid, { 
        text: texto.trim(), 
        mentions: [target] 
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error cargando inventario:', err);
      return reply('❌ Ocurrió un error al intentar abrir la mochila.');
    }
  }
};
