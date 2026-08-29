'use strict';

// 🔥 LA FÓRMULA INFALIBLE PARA MENCIONES REALES
function getTargetInfo(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  
  const rawJid = quoted || mentioned;
  if (!rawJid) return null;

  // Extraemos únicamente los números destruyendo signos, espacios o letras
  const pureNumber = String(rawJid).split('@')[0].replace(/\D/g, '');
  const target = `${pureNumber}@s.whatsapp.net`;
  
  return { target, pureNumber };
}

// 🧠 ENGAÑO DE SISTEMA: Genera un ID realista para que WhatsApp renderice el nombre
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
      const targetInfo = getTargetInfo(msg);
      const fullText = args.join(' ');

      if (!targetInfo || !fullText.includes('|')) {
        return reply('❌ Uso correcto:\n\n.fake @usuario texto falso | tu respuesta\n\n📌 Ejemplo:\n.fake @usuario Hola | Adiós');
      }

      const { target } = targetInfo;

      let [fakeText, replyText] = fullText.split('|').map(v => v.trim());

      if (!fakeText || !replyText) {
        return reply('❌ Formato incorrecto. Recuerda usar el separador "|".');
      }

      // Limpia la etiqueta @mención del texto falso para que no salga escrito en la burbuja
      fakeText = fakeText.replace(/@\S+/g, '').trim();

      // 🧠 CREACIÓN DEL MENSAJE FALSO 100% REALISTA
      const fakeQuoted = {
        key: {
          fromMe: false,        
          participant: target,   // 🔥 Clave para el color del Nick
          remoteJid: remoteJid,  // 🔥 Para que el mensaje nazca en el chat actual
          id: generateFakeId()   // 🔥 CRÍTICO: Sin esto, WhatsApp Web/Móvil deja el nombre en blanco
        },
        message: {
          conversation: fakeText // El texto que aparecerá dentro del cuadrito
        }
      };

      // 📩 ENVIAR LA RESPUESTA
      await sock.sendMessage(remoteJid, {
        text: replyText,
        mentions: [target] // Mención real azul en el texto de afuera
      }, { quoted: fakeQuoted });

    } catch (e) {
      console.log('❌ ERROR fake:', e?.message || e);
      return reply('❌ Ocurrió un error al generar el mensaje falso.');
    }
  }
};
