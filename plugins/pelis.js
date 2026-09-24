'use strict';

// 📂 Asegúrate de que la ruta al archivo JSON sea la correcta
const pelisBase = require('../assets/data/emojis_pelis.json');
const juegosPelis = new Map();

// 🧹 Limpia tildes, signos de puntuación y dobles espacios para que sea fácil adivinar
function normalizeText(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function iniciarRondaPelis(remoteJid, sock) {
  const juego = juegosPelis.get(remoteJid);
  if (!juego) return;

  // Si se acaban las películas, volvemos a llenar la bolsa y mezclamos
  if (!juego.disponibles || juego.disponibles.length === 0) {
    juego.disponibles = [...pelisBase].sort(() => Math.random() - 0.5);
  }

  const peli = juego.disponibles.pop();
  const recompensa = Math.floor(Math.random() * 1501) + 500; // Entre 500 y 2000 XP

  juego.peliculaActual = peli;
  juego.recompensa = recompensa;

  // 🎬 NUEVO DISEÑO VISUAL CINEMATOGRÁFICO
  const texto = `🎬 *ADIVINA LA PELÍCULA* 🍿\n\n` +
                `🎞️ *Pista:* ${peli.q}\n` +
                `💰 *Premio:* +${recompensa} XP\n` +
                `⏳ Tienen 60 segundos.\n\n` +
                `_¡Escribe el nombre de la película para ganar!_`;

  await sock.sendMessage(remoteJid, { text: texto });

  juego.tiempo = setTimeout(async () => {
    if (juegosPelis.has(remoteJid)) {
      const currentGame = juegosPelis.get(remoteJid);
      juegosPelis.delete(remoteJid);
      try {
        await sock.sendMessage(remoteJid, { 
          text: `⏳ *¡CORTE! SE ACABÓ EL TIEMPO* 🎬\n\nNinguno logró adivinar la película.\n❌ Era: *${currentGame.peliculaActual.a[0]}*\n\nEscriban *.pelis* para iniciar una nueva función.` 
        });
      } catch (err) {}
    }
  }, 60000); // 60 segundos de límite
}

module.exports = {
  name: 'pelis',
  aliases: ['peliculas', 'adivinapeli', 'cine'],
  category: 'juegos',
  desc: 'Adivina la película viendo solo emojis',
  
  execute: async ({ sock, remoteJid, reply }) => {
    if (juegosPelis.has(remoteJid)) {
      return reply('⚠️ Ya hay una función de cine activa en este chat. ¡Mira los emojis y adivina!');
    }

    juegosPelis.set(remoteJid, {
      disponibles: [...pelisBase].sort(() => Math.random() - 0.5),
      peliculaActual: null,
      recompensa: 0,
      tiempo: null
    });

    await iniciarRondaPelis(remoteJid, sock);
  },

  onMessage: async (ctx) => {
    const { sock, remoteJid, body, sender, pushName, db } = ctx;
    
    if (!juegosPelis.has(remoteJid) || !body) return;
    if (body.trim().startsWith('.')) return; // Ignora los comandos con punto

    const juego = juegosPelis.get(remoteJid);
    if (!juego || !juego.peliculaActual) return;

    // Colocamos la frase del usuario entre espacios en blanco para aislar cada palabra
    const cleanedBody = ` ${normalizeText(body)} `;
    
    // Verificamos si alguna de las respuestas exactas está dentro del texto
    const acierto = juego.peliculaActual.a.some(ans => {
      const cleanAns = ` ${normalizeText(ans)} `;
      return cleanedBody.includes(cleanAns);
    });

    if (acierto) {
      if (juego.tiempo) clearTimeout(juego.tiempo);
      
      const recompensaGanada = juego.recompensa;
      const respuestaCorrecta = juego.peliculaActual.a[0].toUpperCase();
      
      // Congelamos la pregunta de inmediato para que nadie más gane
      juego.peliculaActual = null; 

      // Guardamos la XP en la base de datos
      try {
        const userData = await db.getUser(sender);
        if (userData) {
          userData.xp = (userData.xp || 0) + recompensaGanada;
          // Actualizamos el nivel para que esté en sintonía
          userData.level = Math.floor(0.1 * Math.sqrt(userData.xp || 0)) || 1;
          if (userData.save) await userData.save();
        }
      } catch (e) {
        console.log('Error de guardado en pelis:', e);
      }
      
      const exito = `🏆 *¡EXCELENTE, ${pushName}!* 🎥\n\n` +
                    `✅ La película era: *${respuestaCorrecta}*\n` +
                    `⭐ Has ganado *+${recompensaGanada} XP* ⚡\n\n` +
                    `🎬 _Siguiente escena en 3 segundos..._`;

      await sock.sendMessage(remoteJid, { text: exito });

      setTimeout(() => {
        iniciarRondaPelis(remoteJid, sock);
      }, 3000);
    }
  }
};
