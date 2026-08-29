'use strict';

// 🔥 FUNCIONES EXACTAS DEL PERFIL.JS (El secreto de la mención azul)
function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }

function getTarget(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  
  if (quoted) return cleanJid(quoted);
  if (mentioned) return cleanJid(mentioned);
  
  return null;
}

// Generador de ID realista para que WhatsApp no bloquee el cuadro
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

      // 1. Extraemos el número puro para construir la mención visual
      const pureNumber = cleanNumber(target);

      let [fakeText, replyText] = fullText.split('|').map(v => v.trim());

      if (!fakeText || !replyText) {
        return reply('❌ Formato incorrecto. Recuerda usar el separador "|".');
      }

      // 2. Limpiamos cualquier arroba rota que hayas escrito en el comando
      fakeText = fakeText.replace(/@\S+/g, '').trim();

      // 🔥 TRUCO MAESTRO: Forzamos la mención azul DENTRO del cuadro citado
      const finalFakeText = `@${pureNumber} ${fakeText}`;

      // 🧠 CREACIÓN DEL MENSAJE FALSO (extendedTextMessage soporta menciones internas)
      const fakeQuoted = {
        key: {
          fromMe: false,
          participant: target,
          remoteJid: remoteJid,
          id: generateFakeId()
        },
        message: {
          extendedTextMessage: {
            text: finalFakeText, // Aquí va el texto con el @Nombre
            contextInfo: {
              mentionedJid: [target] // Esto obliga a WhatsApp a pintarlo de azul en la cita
            }
          }
        }
      };

      // 📩 ENVIAR LA RESPUESTA
      await sock.sendMessage(remoteJid, {
        text: replyText,
        mentions: [target] // Habilita la mención también en tu respuesta
      }, { quoted: fakeQuoted });

    } catch (e) {
      console.log('❌ ERROR fake:', e?.message || e);
      return reply('❌ Ocurrió un error al generar el mensaje falso.');
    }
  }
};
