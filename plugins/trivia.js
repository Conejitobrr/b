'use strict';

const preguntasBase = require('../assets/data/preguntas_trivia.json');
const juegosTrivia = new Map();

async function iniciarRonda(remoteJid, sock) {
  const juego = juegosTrivia.get(remoteJid);
  if (!juego) return;

  // Si se acaban las preguntas, las rellenamos y mezclamos
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

  // Temporizador de inactividad
  juego.tiempo = setTimeout(async () => {
    if (juegosTrivia.has(remoteJid)) {
      juegosTrivia.delete(remoteJid);
      await sock.sendMessage(remoteJid, { 
        text: `⏳ ¡Se acabó el tiempo! Nadie logró adivinar.\n\n✅ La respuesta era: *${q.a[0]}*\n\nEscriban *.trivia* para jugar otra vez.` 
      });
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

  onMessage: async ({ sock, remoteJid, body, sender, pushName, db }) => {
    if (!juegosTrivia.has(remoteJid) || !body) return;
    
    // Ignora los comandos para evitar conflictos con el chat normal
    if (body.trim().startsWith('.')) return;

    const juego = juegosTrivia.get(remoteJid);
    if (!juego.preguntaActual) return;

    // Limpia el texto del usuario de tildes y lo pasa a minúsculas
    const userText = String(body).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Búsqueda inteligente e infalible
    const acierto = juego.preguntaActual.a.some(ans => {
      const cleanAns = String(ans).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const escapedAns = cleanAns.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // El límite \b asegura que encuentre la palabra exacta, ignorando signos de puntuación o frases largas
      const regex = new RegExp(`\\b${escapedAns}\\b`, 'i');
      return regex.test(userText);
    });

    if (acierto) {
      clearTimeout(juego.tiempo);
      
      // Congelamos la pregunta de inmediato para que nadie más la conteste a la vez
      juego.preguntaActual = null; 

      // Guardado de XP seguro
      try {
        if (db && typeof db.addXP === 'function') {
          await db.addXP(sender, juego.recompensa);
        } else if (db && typeof db.getUser === 'function') {
          const userData = await db.getUser(sender);
          userData.xp = (userData.xp || 0) + juego.recompensa;
          if (userData.save) await userData.save();
        }
      } catch (e) {
        console.log('Error de guardado en trivia, pero el juego continúa:', e);
      }
      
      await sock.sendMessage(remoteJid, { 
        text: `🎉 ¡CORRECTO, *${pushName}*!\n\n✅ La respuesta era *${juego.preguntaActual.a[0]}*.\n⭐ Has ganado *+${juego.recompensa} XP* ⚡\n\nSiguiente pregunta en 3 segundos...` 
      });

      // Lanza la siguiente pregunta en automático
      setTimeout(() => {
        iniciarRonda(remoteJid, sock);
      }, 3000);
    }
  }
};
