'use strict';

function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }

function getTarget(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  
  if (quoted) return cleanJid(quoted);
  if (mentioned) return cleanJid(mentioned);
  
  return null;
}

function generateFakeId() {
  return 'BAE5' + Math.floor(Math.random() * 1000000000000000).toString(16).toUpperCase();
}

module.exports = {
  name: 'fake',
  aliases: ['falso'],
  category: 'diversión',
  desc: 'Crea una cita falsa de otro usuario',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    try {
      const target = getTarget(msg);
      const fullText = args.join(' ');

      if (!target || !fullText.includes('|')) {
        return reply('❌ Uso correcto:\n\n.fake @usuario texto falso | tu respuesta\n\n📌 Ejemplo:\n.fake @usuario Hola | Adiós');
      }

      let [fakeText, replyText] = fullText.split('|').map(v => v.trim());

      if (!fakeText || !replyText) {
        return reply('❌ Formato incorrecto. Recuerda usar el separador "|".');
      }

      // Limpiamos cualquier arroba que hayas escrito accidentalmente en el comando
      fakeText = fakeText.replace(/@\S+/g, '').trim();

      // 🧠 CREACIÓN DEL MENSAJE FALSO LIMPIO
      const fakeQuoted = {
        key: {
          fromMe: false,
          participant: target,     // Carga el nombre (Ej. Bruno 2)
          remoteJid: remoteJid,
          id: generateFakeId()     // Evita que el cuadro salga en blanco
        },
        message: {
          conversation: fakeText   // Texto 100% puro y limpio, sin @número al inicio
        }
      };

      // 📩 ENVIAR LA RESPUESTA
      await sock.sendMessage(remoteJid, {
        text: replyText,
        mentions: [target]         // Mantiene la mención azul real en tu respuesta
      }, { quoted: fakeQuoted });

    } catch (e) {
      console.log('❌ ERROR fake:', e?.message || e);
      return reply('❌ Ocurrió un error al generar el mensaje falso.');
    }
  }
};
