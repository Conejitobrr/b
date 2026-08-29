'use strict';

const preguntasBase = require('../assets/data/preguntas_trivia.json');
const juegosTrivia = new Map();

// Limpia tildes, signos de puntuación y dobles espacios
function normalizeText(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function iniciarRonda(remoteJid, sock) {
  const juego = juegosTrivia.get(remoteJid);
  if (!juego) return;

  if (!juego.disponibles || juego.disponibles.length === 0) {
    juego.disponibles = [...preguntasBase].sort(() => Math.random() - 0.5);
  }

  const q = juego.disponibles.pop();
  const recompensa = Math.floor(Math.random() * 1501) + 500;

  juego.preguntaActual = q;
  juego.recompensa = recompensa;

  await sock.sendMessage(remoteJid, { 
    text: `🎯 *TRIVIA EXPRESS*\n\n🧠 Pregunta: *${q.q}*\n💰 Recompensa: *+${recompensa} XP*\n⏳ Tienen 60 segundos.\n\n_¡Puedes responder dentro de una frase!_` 
  });

  juego.tiempo = setTimeout(async () => {
    if (juegosTrivia.has(remoteJid)) {
      const currentGame = juegosTrivia.get(remoteJid);
      juegosTrivia.delete(remoteJid);
      try {
        await sock.sendMessage(remoteJid, { 
          text: `⏳ ¡Se acabó el tiempo! Nadie logró adivinar.\n\n✅ La respuesta era: *${currentGame.preguntaActual.a[0]}*\n\nEscriban *.trivia* para jugar otra vez.` 
        });
      } catch (err) {}
    }
  }, 60000);
}

module.exports = {
  name: 'trivia',
  aliases: ['t'],
  category: 'juegos',
  desc: 'Inicia un juego de trivia infinito',
  
  execute: async ({ sock, remoteJid, reply }) => {
    if (juegosTrivia.has(remoteJid)) {
      return reply('⚠️ Ya hay una trivia activa en este chat. ¡Respondan directamente en el grupo!');
    }

    juegosTrivia.set(remoteJid, {
      disponibles: [...preguntasBase].sort(() => Math.random() - 0.5),
      preguntaActual: null,
      recompensa: 0,
      tiempo: null
    });

    await iniciarRonda(remoteJid, sock);
  },

  onMessage: async (ctx) => {
    const { sock, remoteJid, body, sender, pushName, db } = ctx;
    
    if (!juegosTrivia.has(remoteJid) || !body) return;
    if (body.trim().startsWith('.')) return;

    const juego = juegosTrivia.get(remoteJid);
    if (!juego || !juego.preguntaActual) return;

    // Colocamos la frase del usuario entre espacios en blanco para aislar cada palabra
    const cleanedBody = ` ${normalizeText(body)} `;
    
    // Verificamos si alguna de las respuestas exactas (también entre espacios) está dentro del texto
    const acierto = juego.preguntaActual.a.some(ans => {
      const cleanAns = ` ${normalizeText(ans)} `;
      return cleanedBody.includes(cleanAns);
    });

    if (acierto) {
      if (juego.tiempo) clearTimeout(juego.tiempo);
      
      const recompensaGanada = juego.recompensa;
      const respuestaCorrecta = juego.preguntaActual.a[0];
      
      // Congelamos la pregunta de inmediato
      juego.preguntaActual = null; 

      // Guardamos la XP en la base de datos
      try {
        const userData = await db.getUser(sender);
        if (userData) {
          userData.xp = (userData.xp || 0) + recompensaGanada;
          if (userData.save) await userData.save();
        }
      } catch (e) {
        console.log('Error de guardado en trivia:', e);
      }
      
      await sock.sendMessage(remoteJid, { 
        text: `🎉 ¡CORRECTO, *${pushName}*!\n\n✅ La respuesta era *${respuestaCorrecta}*.\n⭐ Has ganado *+${recompensaGanada} XP* ⚡\n\nSiguiente pregunta en 3 segundos...` 
      });

      setTimeout(() => {
        iniciarRonda(remoteJid, sock);
      }, 3000);
    }
  }
};
