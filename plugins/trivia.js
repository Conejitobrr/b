'use strict';

const preguntas = require('../assets/data/preguntas_trivia.json');
const juegosTrivia = new Map();

function normalize(text = '') {
  return String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

module.exports = {
  name: 'trivia',
  aliases: ['t'],
  category: 'juegos',
  desc: 'Inicia un juego de trivia express',
  
  execute: async ({ remoteJid, reply }) => {
    if (juegosTrivia.has(remoteJid)) {
      return reply('⚠️ Ya hay una trivia activa en este chat. ¡Responde directamente enviando un mensaje!');
    }

    const randomQ = preguntas[Math.floor(Math.random() * preguntas.length)];
    const recompensa = Math.floor(Math.random() * 500) + 150; 
    
    juegosTrivia.set(remoteJid, {
      respuestas: randomQ.a,
      recompensa: recompensa,
      tiempo: setTimeout(() => {
        if (juegosTrivia.has(remoteJid)) {
          juegosTrivia.delete(remoteJid);
          reply(`⏳ ¡Se acabó el tiempo! Nadie adivinó.\n\nLa respuesta correcta era: *${randomQ.a[0]}*`);
        }
      }, 30000)
    });

    await reply(`🎯 *TRIVIA EXPRESS*\n\n🧠 Pregunta: *${randomQ.q}*\n💰 Recompensa: *+${recompensa} XP*\n⏳ Tienes 30 segundos.`);
  },

  // 🔥 Se ejecuta con TODOS los mensajes de texto normales sin usar comando
  onMessage: async ({ remoteJid, body, sender, pushName, db, reply }) => {
    if (!juegosTrivia.has(remoteJid) || !body) return;

    const juego = juegosTrivia.get(remoteJid);
    const respuestaUsuario = normalize(body);
    
    // Si la respuesta del usuario es igual a alguna de las válidas
    const acierto = juego.respuestas.some(r => normalize(r) === respuestaUsuario);

    if (acierto) {
      clearTimeout(juego.tiempo);
      juegosTrivia.delete(remoteJid);
      
      await db.addXP(sender, juego.recompensa);
      await reply(`🎉 ¡CORRECTO, *${pushName}*!\n\nLa respuesta era *${juego.respuestas[0]}*.\nHas ganado *+${juego.recompensa} XP* ⚡`);
    }
  }
};
