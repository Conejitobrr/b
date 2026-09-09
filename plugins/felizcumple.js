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

// 🎨 CREADOR DE PÓSTER ÉPICO A PANTALLA COMPLETA
async function createBirthdayCard(pfpUrl, pushName = 'Amigo') {
  const width = 800;
  const height = 1000; // Formato vertical tipo póster para WhatsApp
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 🌌 1. Fondo inmersivo: Usar la foto de perfil difuminada y oscurecida como atmósfera
  try {
    const bgImage = await loadImage(pfpUrl);
    ctx.save();
    ctx.drawImage(bgImage, 0, 0, width, height);
    // Capa oscura translúcida con tinte nocturno para que el texto resalte
    ctx.fillStyle = 'rgba(10, 2, 25, 0.85)';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  } catch {
    ctx.fillStyle = '#15002b';
    ctx.fillRect(0, 0, width, height);
  }

  // ✨ 2. Círculo neón central principal para la foto de perfil
  const centerX = width / 2;
  const centerY = 360;
  const radius = 170;

  ctx.save();
  ctx.shadowColor = '#ff007f';
  ctx.shadowBlur = 40;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 12, 0, Math.PI * 2, true);
  const neonGradient = ctx.createLinearGradient(0, 0, width, height);
  neonGradient.addColorStop(0, '#ff007f');
  neonGradient.addColorStop(0.5, '#7b2cbf');
  neonGradient.addColorStop(1, '#00f5d4');
  ctx.fillStyle = neonGradient;
  ctx.fill();
  ctx.closePath();
  ctx.restore();

  // 📸 3. Dibujar la foto de perfil nítida dentro del círculo
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();

  try {
    const avatar = await loadImage(pfpUrl);
    ctx.drawImage(avatar, centerX - radius, centerY - radius, radius * 2, radius * 2);
  } catch {
    ctx.fillStyle = '#333';
    ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
  }
  ctx.restore();

  // 📝 4. Textos y elementos visuales con diseño profesional
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 15;

  // Cabecera
  ctx.fillStyle = '#ffdf00';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('✨ 🎂 ¡FELIZ CUMPLEAÑOS! 🎂 ✨', centerX, 110);

  // Nombre del usuario grande y destacado
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 50px sans-serif';
  const displayName = pushName.length > 16 ? pushName.substring(0, 16) + '...' : pushName;
  ctx.fillText(displayName, centerX, 615);

  // Subtítulo
  ctx.fillStyle = '#00ffff';
  ctx.font = '26px sans-serif';
  ctx.fillText('🎉 Que tengas un día extraordinario 🎉', centerX, 680);

  // 📦 Tarjeta decorativa inferior
  ctx.save();
  ctx.beginPath();
  const boxX = 90, boxY = 740, boxW = 620, boxH = 180, cornerRadius = 25;
  ctx.moveTo(boxX + cornerRadius, boxY);
  ctx.lineTo(boxX + boxW - cornerRadius, boxY);
  ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + cornerRadius);
  ctx.lineTo(boxX + boxW, boxY + boxH - cornerRadius);
  ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - cornerRadius, boxY + boxH);
  ctx.lineTo(boxX + cornerRadius, boxY + boxH);
  ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - cornerRadius);
  ctx.lineTo(boxX, boxY + cornerRadius);
  ctx.quadraticCurveTo(boxX, boxY, boxX + cornerRadius, boxY);
  ctx.closePath();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 0, 127, 0.4)';
  ctx.stroke();
  ctx.restore();

  // Textos dentro de la caja inferior
  ctx.fillStyle = '#ff99cc';
  ctx.font = '22px sans-serif';
  ctx.fillText('🌟 Disfruta al máximo este gran día 🌟', centerX, 810);

  ctx.fillStyle = '#cccccc';
  ctx.font = '18px sans-serif';
  ctx.fillText('De parte de todo el grupo de WhatsApp', centerX, 865);

  return canvas.toBuffer('image/jpeg');
}

module.exports = {
  name: 'felizcumple',
  aliases: ['cumpleaños', 'hb', 'hbd'],
  category: 'diversión',
  desc: 'Felicita a un usuario con un póster visual épico a pantalla completa',

  execute: async ({ sock, remoteJid, msg, args, reply }) => {
    try {
      const target = getTarget(msg, args);

      if (!target) {
        return reply('❌ Debes mencionar a la persona cumpleañera.\n📌 Ejemplo: *.felizcumple @usuario*');
      }

      const targetNum = cleanNumber(target);

      let targetName = targetNum;
      try {
        const contact = await sock.onWhatsApp(target);
        targetName = contact[0]?.notify || 'Amigo';
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

      // 🎨 Generar la nueva imagen épica en formato póster vertical
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
