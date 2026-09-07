'use strict';

const fs = require('fs');
const path = require('path');

// 🔥 FUNCIONES DE MENCIONES AZULES ESTRICTAS
function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }

function getTarget(msg, args) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return cleanJid(quoted);
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return cleanJid(mentioned);
  if (args && args[0]) {
    const cleanArgs = args[0].replace(/\D/g, '');
    if (cleanArgs) return `${cleanArgs}@s.whatsapp.net`;
  }
  return null;
}

// 🧠 CREADOR DE ID FALSOS
function generateFakeId() {
  return 'BAE5' + Math.floor(Math.random() * 1000000000000000).toString(16).toUpperCase();
}

module.exports = {
  name: 'felizcumple',
  aliases: ['cumpleaños', 'hb', 'hbd'],
  category: 'diversión',
  desc: 'Felicita a un usuario por su cumpleaños',

  execute: async ({ sock, remoteJid, msg, args, reply }) => {
    try {
      const target = getTarget(msg, args);

      if (!target) {
        return reply('❌ Debes mencionar a la persona cumpleañera.\n📌 Ejemplo: *.felizcumple @usuario*');
      }

      const targetNum = cleanNumber(target);

      // 📝 TEXTO UNIVERSAL
      const texto = `🎂✨ *FELIZ CUMPLEAÑOS* ✨🎂\n\n🎉 Hoy es el cumpleaños de una persona muy especial 🥳💖\n\n💌 ¡Feliz cumpleaños, @${targetNum}!\n\nEspero que tengas un día increíble,\nlleno de amor, regalos y muchísima felicidad ✨\n\n💖 Que nunca te falten motivos para sonreír\n🌟 Que todos tus sueños se hagan realidad\n🎁 Y que este nuevo año de vida sea muchísimo mejor\n\nTe mereces todo lo bonito del mundo 🎉🎂✨`;

      // 🔥 EL SECRETO APRENDIDO DE FAKE.JS
      // Hacemos que la cita sea de la misma persona cumpleañera
      const fakeQuoted = {
        key: {
          fromMe: false,
          participant: target,     // El nombre de la persona saldrá impecable en el encabezado
          remoteJid: remoteJid,
          id: generateFakeId()
        },
        message: {
          conversation: '🥳 ¡Hoy estoy de cumpleaños! 🎂✨' // Mensaje limpio sin números crudos
        }
      };

      let messageOptions = {
        caption: texto,
        mentions: [target]
      };

      // 📸 INTENTAR OBTENER FOTO DE PERFIL
      try {
        const pfpUrl = await sock.profilePictureUrl(target, 'image');
        messageOptions.image = { url: pfpUrl };
      } catch {
        const fallbackPath = path.join(process.cwd(), 'assets', 'Sinperfil.jpg');
        if (fs.existsSync(fallbackPath)) {
          messageOptions.image = fs.readFileSync(fallbackPath);
        } else {
          messageOptions.image = { url: 'https://i.imgur.com/JP3QZ7B.jpeg' };
        }
      }

      // 🚀 ENVIAR EL MENSAJE CON LA CITA FALSA PERFECTA
      try {
        await sock.sendMessage(remoteJid, messageOptions, { quoted: fakeQuoted });
      } catch (sendError) {
        console.log('⚠️ Error al enviar imagen, enviando solo texto:', sendError?.message);
        await sock.sendMessage(remoteJid, { text: texto, mentions: [target] }, { quoted: fakeQuoted });
      }

    } catch (err) {
      console.log('❌ Error en plugin felizcumple:', err);
      return reply('❌ Ocurrió un error al intentar enviar la felicitación.');
    }
  }
};
