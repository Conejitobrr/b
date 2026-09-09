'use strict';

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

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

function generateFakeId() {
  return 'BAE5' + Math.floor(Math.random() * 1000000000000000).toString(16).toUpperCase();
}

// 🎨 Función para generar la tarjeta de cumpleaños con la foto de perfil
async function createBirthdayCard(pfpUrl) {
  const width = 800;
  const height = 500;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fondo degradado elegante de fiesta
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1a0033');
  gradient.addColorStop(0.5, '#4b0082');
  gradient.addColorStop(1, '#191970');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Círculo central para la foto de perfil
  const centerX = width / 2;
  const centerY = 200;
  const radius = 110;

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 8, 0, Math.PI * 2, true);
  ctx.fillStyle = '#ff1493'; // Borde brillante de celebración
  ctx.fill();
  ctx.closePath();

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();

  try {
    const avatar = await loadImage(pfpUrl);
    ctx.drawImage(avatar, centerX - radius, centerY - radius, radius * 2, radius * 2);
  } catch {
    // Si falla la foto, dibujamos un relleno por defecto
    ctx.fillStyle = '#333';
    ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
  }
  ctx.restore();

  // Texto decorativo de feliz cumpleaños en el Canvas
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('¡FELIZ CUMPLEAÑOS!', centerX, 370);

  ctx.fillStyle = '#ffdf00';
  ctx.font = '24px sans-serif';
  ctx.fillText('🎂 Que pases un día increíble 🥳', centerX, 420);

  return canvas.toBuffer('image/jpeg');
}

module.exports = {
  name: 'felizcumple',
  aliases: ['cumpleaños', 'hb', 'hbd'],
  category: 'diversión',
  desc: 'Felicita a un usuario con una tarjeta personalizada y su foto de perfil',

  execute: async ({ sock, remoteJid, msg, args, reply }) => {
    try {
      const target = getTarget(msg, args);

      if (!target) {
        return reply('❌ Debes mencionar a la persona cumpleañera.\n📌 Ejemplo: *.felizcumple @usuario*');
      }

      const targetNum = cleanNumber(target);

      // 📝 Texto universal para el mensaje
      const texto = `🎂✨ *FELIZ CUMPLEAÑOS* ✨🎂\n\n🎉 Hoy está de cumpleaños una persona muy especial 🥳💖\n\n💌 ¡Feliz cumpleaños, @${targetNum}!\n\nEspero que tengas un día increíble,\nlleno de amor, regalos y muchísima felicidad ✨\n\n💖 Que nunca te falten motivos para sonreír\n🌟 Que todos tus sueños se hagan realidad\n🎁 Y que este nuevo año de vida sea muchísimo mejor\n\nTe mereces todo lo bonito del mundo 🎉🎂✨`;

      const fakeQuoted = {
        key: {
          fromMe: false,
          participant: target,
          remoteJid: remoteJid,
          id: generateFakeId()
        },
        message: {
          conversation: '🥳 ¡Hoy estoy de cumpleaños! 🎂✨'
        }
      };

      let pfpUrl;
      try {
        pfpUrl = await sock.profilePictureUrl(target, 'image');
      } catch {
        pfpUrl = 'https://i.imgur.com/JP3QZ7B.jpeg';
      }

      // 🎨 Generar la imagen con Canvas
      const imageBuffer = await createBirthdayCard(pfpUrl);

      let messageOptions = {
        image: imageBuffer,
        caption: texto,
        mentions: [target]
      };

      // 🚀 Enviar la tarjeta generada al grupo
      await sock.sendMessage(remoteJid, messageOptions, { quoted: fakeQuoted });

    } catch (err) {
      console.log('❌ Error en plugin felizcumple:', err);
      return reply('❌ Ocurrió un error al intentar generar la tarjeta de cumpleaños.');
    }
  }
};
