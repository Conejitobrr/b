'use strict';

const fs = require('fs');
const path = require('path');

const LOTERIA_PATH = path.join(process.cwd(), 'lib', 'loteria.json');

function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }

module.exports = {
  name: 'sorteo',
  aliases: ['loteria', 'draw', 'pozo'],
  category: 'economía',
  desc: 'Muestra el pozo o realiza el sorteo (Solo Owner)',
  
  execute: async ({ sock, msg, remoteJid, isOwner, db, reply }) => {
    let loteriaDB = { pozo: 0, tickets: {} };
    try { 
      if (fs.existsSync(LOTERIA_PATH)) {
        loteriaDB = JSON.parse(fs.readFileSync(LOTERIA_PATH, 'utf8')); 
      }
    } catch {}

    const ticketsVendidos = Object.keys(loteriaDB.tickets).length;

    // Si no es el Owner, solo le mostramos el estado de la lotería
    if (!isOwner) {
      return reply(`🎰 *LOTERÍA SIRIUSBOT* 🎰\n\n💰 Pozo Acumulado: *${loteriaDB.pozo} XP*\n🎟️ Boletos vendidos: *${ticketsVendidos}*\n\nCompra tu número con *.comprar boleto [1-100]*`);
    }

    // SI ES EL OWNER: Iniciar Sorteo
    if (ticketsVendidos === 0 && loteriaDB.pozo === 0) {
      return reply('❌ Nadie ha comprado boletos aún y el pozo está vacío.');
    }

    await sock.sendMessage(remoteJid, { text: `🎰 *INICIANDO SORTEO MILLONARIO* 🎰\n\nGirando la tómbola... 🥁` }, { quoted: msg });
    
    // Hacemos una pausa dramática de 3 segundos para darle emoción
    setTimeout(async () => {
      const numeroGanador = Math.floor(Math.random() * 100) + 1;
      let ganadorJid = null;

      // Buscar si alguien compró ese número
      for (const [jid, num] of Object.entries(loteriaDB.tickets)) {
        if (parseInt(num) === numeroGanador) {
          ganadorJid = jid;
          break;
        }
      }

      if (ganadorJid) {
        // ¡Alguien ganó!
        const premio = loteriaDB.pozo;
        const userData = await db.getUser(ganadorJid);
        
        userData.xp = (userData.xp || 0) + premio;
        if (userData.save) await userData.save();

        await sock.sendMessage(remoteJid, {
          text: `🎉 *¡TENEMOS UN GANADOR!* 🎉\n\nEl número premiado es el *${numeroGanador}*.\n\n@${cleanNumber(ganadorJid)} se lleva el gigantesco pozo de *${premio} XP*. ¡Felicidades! 💸`,
          mentions: [ganadorJid]
        });

        // Reiniciar la lotería por completo
        fs.writeFileSync(LOTERIA_PATH, JSON.stringify({ pozo: 0, tickets: {} }, null, 2));

      } else {
        // Nadie ganó (El Pozo crece)
        await sock.sendMessage(remoteJid, {
          text: `💨 *¡NADIE GANÓ ESTA VEZ!* 💨\n\nEl número que salió fue el *${numeroGanador}*, pero nadie lo compró.\n\nEl pozo de *${loteriaDB.pozo} XP* se acumula para el siguiente sorteo. 📈`
        });
        
        // Borramos los tickets para la nueva ronda, pero mantenemos el pozo de dinero intacto
        loteriaDB.tickets = {};
        fs.writeFileSync(LOTERIA_PATH, JSON.stringify(loteriaDB, null, 2));
      }
    }, 3000);
  }
};
