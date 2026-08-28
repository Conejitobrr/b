'use strict';

const preguntasBase = require('../assets/data/preguntas_trivia.json');
const juegosTrivia = new Map();

function normalize(text = '') {
  return String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

async function iniciarRonda(remoteJid, sock) {
  const juego = juegosTrivia.get(remoteJid);
  if (!juego) return;

  // Si se acaban las preguntas, rellenamos y mezclamos
  if (!juego.disponibles || juego.disponibles.length === 0) {
    juego.disponibles = [...preguntasBase].sort(() => Math.random() - 0.5);
  }

  const q = juego.disponibles.pop();
  const recompensa = Math.floor(Math.random() * 500) + 150;

  juego.preguntaActual = q;
  juego.recompensa = recompensa;

  await sock.sendMessage(remoteJid, { 
    text: `🎯 *TRIVIA EXPRESS*\n\n🧠 Pregunta: *${q.q}*\n💰 Recompensa: *+${recompensa} XP*\n⏳ Tienen 1 minuto y medio para responder.` 
  });

  // Temporizador de 90 segundos para inactividad
  juego.tiempo = setTimeout(async () => {
    if (juegosTrivia.has(remoteJid)) {
      juegosTrivia.delete(remoteJid);
      await sock.sendMessage(remoteJid, { 
        text: `⏳ ¡Se acabó el tiempo! Nadie adivinó en 90 segundos.\n\nLa respuesta correcta era: *${q.a[0]}*\n\nEl juego ha finalizado por inactividad. Escriban *.trivia* para volver a jugar.` 
      });
    }
  }, 90000);
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

    // Inicializar el estado del juego para este grupo
    juegosTrivia.set(remoteJid, {
      disponibles: [...preguntasBase].sort(() => Math.random() - 0.5),
      preguntaActual: null,
      recompensa: 0,
      tiempo: null
    });

    await iniciarRonda(remoteJid, sock);
  },

  onMessage: async ({ sock, remoteJid, body, sender, pushName, db }) => {
    if (!juegosTrivia.has(remoteJid) || !body) return;

    const juego = juegosTrivia.get(remoteJid);
    if (!juego.preguntaActual) return;

    const respuestaUsuario = normalize(body);
    const acierto = juego.preguntaActual.a.some(r => normalize(r) === respuestaUsuario);

    if (acierto) {
      clearTimeout(juego.tiempo);
      await db.addXP(sender, juego.recompensa);
      
      await sock.sendMessage(remoteJid, { 
        text: `🎉 ¡CORRECTO, *${pushName}*!\n\nLa respuesta era *${juego.preguntaActual.a[0]}*.\nHas ganado *+${juego.recompensa} XP* ⚡\n\nSiguiente pregunta en 3 segundos...` 
      });

      // Lanzar la siguiente pregunta después de 3 segundos
      setTimeout(() => {
        iniciarRonda(remoteJid, sock);
      }, 3000);
    }
  }
};
