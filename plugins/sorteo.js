'use strict';

const fs = require('fs');
const path = require('path');

const LOTERIA_PATH = path.join(process.cwd(), 'lib', 'loteria.json');
const LAST_DRAW_PATH = path.join(process.cwd(), 'lib', 'last_draw.json'); // Guarda cuándo fue el último sorteo para no repetirlo el mismo día

function cleanNumber(jid = '') { return String(jid).split('@')[0].split(':')[0].replace(/\D/g, ''); }

async function realizarSorteo(sock, db, tipo = 'diario') {
  let loteriaDB = { pozo: 0, tickets: {} };
  try { loteriaDB = JSON.parse(fs.readFileSync(LOTERIA_PATH, 'utf8')); } catch {}

  const tickets = Object.entries(loteriaDB.tickets);
  if (tickets.length === 0 && loteriaDB.pozo === 0) return; // Nada que sortear

  // Extraer los grupos que participaron para anunciar en todos simultáneamente
  const chatsParticipantes = [...new Set(tickets.map(t => t[1].chat))];

  const sendBroadcast = async (text, mentions = []) => {
    for (const chat of chatsParticipantes) {
      try { await sock.sendMessage(chat, { text, mentions }); } catch {}
    }
  };

  if (tickets.length === 0 && loteriaDB.pozo > 0) {
    await sendBroadcast(`🎰 *SORTEO MILLONARIO* 🎰\n\nNadie compró boletos hoy.\nEl pozo de *${loteriaDB.pozo} XP* se acumula para mañana. 📈`);
    return;
  }

  await sendBroadcast(`🎰 *INICIANDO SORTEO MILLONARIO* 🎰\n\nGirando la tómbola... 🥁`);

  setTimeout(async () => {
    let ganadorJid = null;
    let numeroGanador = 0;

    if (tipo === 'domingo') {
       // Sorteo Garantizado: Sacamos a alguien al azar de la lista de los que compraron
       const ganadorRandom = tickets[Math.floor(Math.random() * tickets.length)];
       ganadorJid = ganadorRandom[0];
       numeroGanador = ganadorRandom[1].num;
    } else {
       // Sorteo Normal: 1 al 100
       numeroGanador = Math.floor(Math.random() * 100) + 1;
       const ganadorObj = tickets.find(t => t[1].num === numeroGanador);
       if (ganadorObj) ganadorJid = ganadorObj[0];
    }

    if (ganadorJid) {
      const premio = loteriaDB.pozo;
      if (db && typeof db.getUser === 'function') {
        const uData = await db.getUser(ganadorJid);
        uData.xp = (uData.xp || 0) + premio;
        if (uData.save) await uData.save();
      }
      await sendBroadcast(`🎉 *¡TENEMOS UN GANADOR!* 🎉\n\nEl número premiado es el *${numeroGanador}*.\n\n@${cleanNumber(ganadorJid)} se lleva el gigantesco pozo de *${premio} XP*. ¡Felicidades! 💸`, [ganadorJid]);
      
      // Reiniciar pozo
      loteriaDB.pozo = 0;
    } else {
      await sendBroadcast(`💨 *¡NADIE GANÓ ESTA VEZ!* 💨\n\nEl número premiado fue el *${numeroGanador}*, pero nadie lo tenía.\n\n🔥 Todos los boletos de hoy se queman y pierden su valor.\n📈 ¡Pero el gigantesco pozo de *${loteriaDB.pozo} XP* se acumula para la próxima ronda!`);
    }

    // Quema de boletos siempre (limpiamos el objeto tickets)
    loteriaDB.tickets = {};
    fs.writeFileSync(LOTERIA_PATH, JSON.stringify(loteriaDB, null, 2));

  }, 3500);
}

module.exports = {
  name: 'sorteo',
  aliases: ['loteria', 'draw', 'pozo'],
  category: 'economía',
  desc: 'Muestra el pozo y la información de la lotería',
  
  execute: async ({ sock, msg, remoteJid, isOwner, db, reply }) => {
    let loteriaDB = { pozo: 0, tickets: {} };
    try { if (fs.existsSync(LOTERIA_PATH)) loteriaDB = JSON.parse(fs.readFileSync(LOTERIA_PATH, 'utf8')); } catch {}

    const ticketsVendidos = Object.keys(loteriaDB.tickets).length;

    // Si el owner escribe ".sorteo forzar", lo tira manualmente. Si no, muestra la info normal.
    if (isOwner && msg.message?.conversation?.includes('forzar')) {
      return realizarSorteo(sock, db, 'diario');
    }

    return reply(`🎰 *LOTERÍA SIRIUSBOT* 🎰\n\n💰 Pozo Acumulado: *${loteriaDB.pozo} XP*\n🎟️ Boletos vendidos: *${ticketsVendidos}/100*\n\nCompra tu número con *.comprar boleto*\n\n🕒 *Sorteo Diario:* 7:30 PM\n🎁 *Sorteo Garantizado:* Domingos 6:00 AM\n_*(Los boletos se queman después de cada sorteo)*_`);
  },
  
  // ⚙️ FUNCIÓN AUTOMÁTICA (Se ejecuta en el handler.js)
  autoCheck: async (sock, db) => {
     const now = new Date();
     const timeKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
     let lastDraws = { daily: '', sunday: '' };
     
     try { 
       if (fs.existsSync(LAST_DRAW_PATH)) lastDraws = JSON.parse(fs.readFileSync(LAST_DRAW_PATH, 'utf8')); 
     } catch {}

     const dayOfWeek = now.getDay(); // 0 = Domingo
     const hours = now.getHours();
     const minutes = now.getMinutes();

     // DOMINGO 6:00 AM (Garantizado)
     if (dayOfWeek === 0 && hours === 6 && minutes >= 0 && lastDraws.sunday !== timeKey) {
         lastDraws.sunday = timeKey;
         lastDraws.daily = timeKey; // Cubre el diario para que no se crucen
         fs.writeFileSync(LAST_DRAW_PATH, JSON.stringify(lastDraws));
         await realizarSorteo(sock, db, 'domingo');
     }
     // LUNES A SÁBADO 7:30 PM (19:30) (Sorteo Normal)
     else if (hours === 19 && minutes >= 30 && lastDraws.daily !== timeKey) {
         lastDraws.daily = timeKey;
         fs.writeFileSync(LAST_DRAW_PATH, JSON.stringify(lastDraws));
         await realizarSorteo(sock, db, 'diario');
     }
  }
};
