'use strict';

module.exports = {
  name: 'pregunta',
  aliases: ['preguntas', 'apakah', '8ball', 'bot'],
  category: 'diversión',
  desc: 'Responde a cualquier pregunta con respuestas aleatorias',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    try {
      // Capturamos todo el texto escrito después del comando
      const question = args.join(' ').trim();

      if (!question) {
        return reply('❌ Escribe una pregunta.\n📌 Ejemplo: *.pregunta ¿Voy a ser millonario?*');
      }

      // Lista de respuestas mejorada y expandida
      const respuestas = [
        'Sí, definitivamente. ✨',
        'Es cierto. ✅',
        'Tal vez sí... 🤔',
        'Posiblemente. 👀',
        'Todo apunta a que sí. 🎯',
        'Pregunta de nuevo más tarde, estoy ocupado. 💤',
        'Mejor no te lo digo ahora... 🤐',
        'Concéntrate y vuelve a preguntar. 🧘‍♂️',
        'No cuentes con ello. 🚫',
        'Probablemente no. 👎',
        'No. ❌',
        'Imposible. 🤡',
        'Ni en tus mejores sueños. 🤣'
      ];

      const random = respuestas[Math.floor(Math.random() * respuestas.length)];

      // Extraemos menciones por si la pregunta incluye a otro usuario (ej: .pregunta @user es guapo?)
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

      const respuesta = `⁉️ *BOLA MÁGICA 8* ⁉️\n\n🧠 *Pregunta:* ${question}\n🤖 *Respuesta:* ${random}`;

      // Enviamos el mensaje estructurado
      await sock.sendMessage(remoteJid, {
        text: respuesta,
        mentions: mentioned
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en plugin pregunta:', err);
      return reply('❌ Ocurrió un error al intentar adivinar el futuro.');
    }
  }
};
