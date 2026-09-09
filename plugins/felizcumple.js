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

// 🎨 CREADOR DE TARJETA ESTILO PRO
async function createBirthdayCard(pfpUrl, pushName = 'Amigo') {
  const width = 900;
  const height = 500;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 🌌 1. Fondo con un degradado mucho más atractivo (Estilo nocturno de fiesta)
  const bgGradient = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, 600);
  bgGradient.addColorStop(0, '#2e0854');
  bgGradient.addColorStop(0.5, '#15002b');
  bgGradient.addColorStop(1, '#080012');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // ✨ 2. Círculo de neón exterior para la foto
  const centerX = 200;
  const centerY = height / 2;
  const radius = 120;

  ctx.save();
  ctx.shadowColor = '#ff007f';
  ctx.shadowBlur = 25;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 6, 0, Math.PI * 2, true);
  ctx.fillStyle = '#ff007f';
  ctx.fill();
  ctx.closePath();
  ctx.restore();

  // 📸 3. Dibujar la foto de perfil en círculo perfecto
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();

  try {
    const avatar = await loadImage(pfpUrl);
    ctx.drawImage(avatar, centerX - radius, centerY - radius, radius * 2, radius * 2);
  } catch {
    ctx.fillStyle = '#444';
    ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
  }
  ctx.restore();

  // 📝 4. Textos elegantes al lado derecho
  ctx.textAlign = 'left';

  // Sombra para el texto principal
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 10;

  ctx.fillStyle = '#ffdf00';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('¡FELIZ CUMPLEAÑOS!', 380, 180);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px sans-serif';
  // Acortar el nombre si es muy largo
  const displayName = pushName.length > 15 ? pushName.substring(0, 15) + '...' : pushName;
  ctx.fillText(displayName, 380, 235);

  ctx.fillStyle = '#ff99cc';
  ctx.font = '22px sans-serif';
  ctx.fillText('🥳 Que tengas un día excelente 🎂', 380, 290);

  ctx.fillStyle = '#00ffff';
  ctx.font = '18px sans-serif';
  ctx.fillText('✨ De parte de todo el grupo ✨', 380, 340);

  return canvas.toBuffer('image/jpeg');
}

module.exports = {
  name: 'felizcumple',
  aliases: ['cumpleaños', 'hb', 'hbd'],
  category: 'diversión',
  desc: 'Felicita a un usuario con una tarjeta personalizada profesional',

  execute: async ({ sock, remoteJid, msg, args, reply }) => {
    try {
      const target = getTarget(msg, args);

      if (!target) {
        return reply('❌ Debes mencionar a la persona cumpleañera.\n📌 Ejemplo: *.felizcumple @usuario*');
      }

      const targetNum = cleanNumber(target);

      // Intentar obtener el nombre del contacto o usar su número
      let targetName = targetNum;
      try {
        const contact = await sock.onWhatsApp(target);
        // Si hay un nombre de perfil disponible
        targetName = contact[0]?.notify || `Usuario`;
      } catch {
        targetName = 'Amigo/a';
      }

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

      // 🎨 Generar la nueva imagen Pro
      const imageBuffer = await createBirthdayCard(pfpUrl, targetName);

      let messageOptions = {
        image: imageBuffer,
        caption: texto,
        mentions: [target]
      };

      await sock.sendMessage(remoteJid, messageOptions, { quoted: fakeQuoted });

    } catch (err) {
      console.log('❌ Error en plugin felizcumple:', err);
      return reply('❌ Ocurrió un error al intentar generar la tarjeta.');
    }
  }
};
