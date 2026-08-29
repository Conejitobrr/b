'use strict';

const preguntasBase = require('../assets/data/preguntas_trivia.json');
const juegosTrivia = new Map();

// Normaliza quitando tildes y mayúsculas
function normalize(text = '') {
  return String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

async function iniciarRonda(remoteJid, sock) {
  const juego = juegosTrivia.get(remoteJid);
  if (!juego) return;

  // Si se acaban las preguntas, rellenamos y mezclamos de nuevo
  if (!juego.disponibles || juego.disponibles.length === 0) {
    juego.disponibles = [...preguntasBase].sort(() => Math.random() - 0.5);
  }

  const q = juego.disponibles.pop();
  // 🔥 Recompensa de la versión clásica: Entre 500 y 2000 XP
  const recompensa = Math.floor(Math.random() * 1501) + 500;

  juego.preguntaActual = q;
  juego.recompensa = recompensa;

  await sock.sendMessage(remoteJid, { 
    text: `🎯 *TRIVIA EXPRESS*\n\n🧠 Pregunta: *${q.q}*\n💰 Recompensa: *+${recompensa} XP*\n⏳ Tienen 60 segundos para responder.\n\n_Puedes responder escribiéndolo dentro de una frase._` 
  });

  // Temporizador de inactividad (60 segundos)
  juego.tiempo = setTimeout(async () => {
    if (juegosTrivia.has(remoteJid)) {
      juegosTrivia.delete(remoteJid);
      await sock.sendMessage(remoteJid, { 
        text: `⏳ ¡Se acabó el tiempo! Nadie logró adivinar.\n\n✅ La respuesta correcta era: *${q.a[0]}*\n\nEl juego ha finalizado. Escriban *.trivia* para volver a jugar.` 
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

    // Ignora comandos directos para evitar roces
    if (body.trim().startsWith('.')) return;

    const juego = juegosTrivia.get(remoteJid);
    if (!juego.preguntaActual) return;

    const respuestaUsuario = normalize(body);
    
    // 🔥 BÚSQUEDA INTELIGENTE DENTRO DE LA ORACIÓN
    const acierto = juego.preguntaActual.a.some(r => {
      const respLimpia = normalize(r);
      // Crea un límite de palabra exacto para encontrar la respuesta oculta en el texto
      const regex = new RegExp(`\\b${respLimpia}\\b`, 'i');
      return regex.test(respuestaUsuario);
    });

    if (acierto) {
      clearTimeout(juego.tiempo);
      
      // Congelamos la pregunta para que dos usuarios no ganen al mismo tiempo
      juego.preguntaActual = null; 

      // 🔥 SUMA DE XP SEGURA Y GUARDADO DIRECTO
      const userData = await db.getUser(sender);
      userData.xp = (userData.xp || 0) + juego.recompensa;
      if (userData.save) await userData.save(); else await db.setUser(sender, userData);
      
      await sock.sendMessage(remoteJid, { 
        text: `🎉 ¡CORRECTO, *${pushName}*!\n\n✅ La respuesta era *${juego.preguntaActual.a[0]}*.\n⭐ Has ganado *+${juego.recompensa} XP* ⚡\n\nSiguiente pregunta en 3 segundos...` 
      });

      setTimeout(() => {
        iniciarRonda(remoteJid, sock);
      }, 3000);
    }
  }
};
