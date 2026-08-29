'use strict';

function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }

const DICCIONARIO_ITEMS = {
  licencia_mascota: { nombre: '🐶 Licencia de Mascota', uso: 'Usa *.adoptar [Nombre]* para obtener tu mascota.' },
  keys: { nombre: '🔑 Llave de Celda', uso: 'Usa *.usar llave* para escapar de prisión.' },
  cajaUses: { nombre: '📦 Caja Sorpresa XP', uso: 'Usa *.usar caja* para ganar XP aleatoria.' },
  verUses: { nombre: '🎟️ Tickets de .ver', uso: 'Responde a una imagen efímera con *.ver*.' },
  spotifyUses: { nombre: '🎵 Tickets de Spotify', uso: 'Usa *.spotify [canción]* de forma gratuita.' },
  shieldUses: { nombre: '🛡️ Escudo Anti-Robo', uso: 'Pasivo. Te protege automáticamente del próximo *.robar*.' },
  cana_pro: { nombre: '🎣 Caña Profesional', uso: 'Pasivo. Bono permanente en *.pescar*.' },
  arma_pro: { nombre: '🏹 Arco de Cacería', uso: 'Pasivo. Bono permanente en *.cazar*.' },
  hacha_pro: { nombre: '🪓 Hacha de Leñador', uso: 'Pasivo. Bono permanente en *.talar*.' },
  pico_pro: { nombre: '⛏️ Pico de Diamante', uso: 'Pasivo. Bono permanente en *.minar*.' },
  anillo: { nombre: '💍 Anillo de Bodas', uso: 'Sirve para proponer matrimonio.' }
};

module.exports = {
  name: 'inventario',
  aliases: ['inv', 'mochila', 'bolsa'],
  category: 'economía',
  desc: 'Muestra tu mochila con los ítems que has comprado',
  
  execute: async ({ sock, msg, remoteJid, sender, userData, reply }) => {
    try {
      const number = cleanNumber(sender);
      let texto = `🎒 *INVENTARIO DE @${number}*\n\n`;
      let count = 0;

      for (const [key, info] of Object.entries(DICCIONARIO_ITEMS)) {
        const cantidad = Number(userData[key] || 0);
        if (cantidad > 0) {
          texto += `*\u27A4 ${cantidad}x* ${info.nombre}\n💡 _${info.uso}_\n\n`;
          count++;
        }
      }

      if (count === 0) {
        texto += `_La mochila está vacía. Visita la *.tienda* para adquirir ítems._`;
      }

      return sock.sendMessage(remoteJid, { text: texto.trim(), mentions: [sender] }, { quoted: msg });
    } catch (err) {
      console.log('❌ Error cargando inventario:', err);
      return reply('❌ Ocurrió un error al intentar abrir la mochila.');
    }
  }
};
