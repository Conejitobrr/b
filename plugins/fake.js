'use strict';

// 🔥 LA FÓRMULA INFALIBLE: Purificación absoluta del JID
function getTargetInfo(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  
  const rawJid = quoted || mentioned;
  if (!rawJid) return null;

  // Extraemos únicamente los números destruyendo signos, espacios o colones
  const pureNumber = String(rawJid).split('@')[0].replace(/\D/g, '');
  const target = `${pureNumber}@s.whatsapp.net`;
  
  return { target, pureNumber };
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

      // Validar que haya mencionado a alguien y haya puesto el separador "|"
      if (!targetInfo || !fullText.includes('|')) {
        return reply('❌ Uso correcto:\n\n.fake @usuario texto falso | tu respuesta\n\n📌 Ejemplo:\n.fake @usuario Hola | Adiós');
      }

      const { target, pureNumber } = targetInfo;

      // Separar el texto falso de la respuesta real
      let [fakeText, replyText] = fullText.split('|').map(v => v.trim());

      if (!fakeText || !replyText) {
        return reply('❌ Formato incorrecto. Recuerda usar el separador "|".');
      }

      // Limpiar la etiqueta "@numero" del texto falso para que parezca que lo dijo de forma natural
      fakeText = fakeText.replace(/@\+?\d+/g, '').trim();

      // 🧠 CREACIÓN DEL MENSAJE FALSO REALISTA
      const fakeQuoted = {
        key: {
          fromMe: false,        // Simula que lo envió la otra persona
          participant: target,  // ID puro para que cargue su nombre y foto real en la cita
          remoteJid: remoteJid
        },
        message: {
          conversation: fakeText
        }
      };

      // 📩 ENVIAR LA RESPUESTA
      // Le pasamos el "target" puro en menciones para que, si pusiste @Nicola en el replyText, se pinte de azul
      await sock.sendMessage(remoteJid, {
        text: replyText,
        mentions: [target] 
      }, { quoted: fakeQuoted });

    } catch (e) {
      console.log('❌ ERROR fake:', e?.message || e);
      return reply('❌ Ocurrió un error al generar el mensaje falso.');
    }
  }
};
