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

// ✨ FUNCIÓN PARA DIBUJAR CONFETI GEOMÉTRICO (Generado por código)
function drawParticles(ctx, width, height) {
  const colors = ['#FFD700', '#DAA520', '#FFFFFF', '#F5DEB3', '#FF4500'];
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 6 + 2;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const shapeType = Math.random();

    ctx.fillStyle = color;
    ctx.globalAlpha = Math.random() * 0.8 + 0.2; // Transparencia aleatoria

    ctx.beginPath();
    if (shapeType < 0.33) {
      // Círculos (Estrellas desenfocadas)
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    } else if (shapeType < 0.66) {
      // Cuadrados girados (Confeti)
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.random() * Math.PI);
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.restore();
    } else {
      // Triángulos
      ctx.moveTo(x, y);
      ctx.lineTo(x + size, y + size * 1.5);
      ctx.lineTo(x - size, y + size * 1.5);
      ctx.fill();
    }
    ctx.closePath();
  }
  ctx.globalAlpha = 1.0; // Restaurar transparencia
}

// 🎨 CREADOR DE PÓSTER LUXURY (ORO Y CRISTAL)
async function createBirthdayCard(pfpUrl, pushName = 'Amigo') {
  const width = 1080;
  const height = 1350; 
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 🌌 1. FONDO PREMIUM OSCURO
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#0a0a0a'); // Negro carbón
  bgGradient.addColorStop(0.5, '#1a1025'); // Morado muy oscuro
  bgGradient.addColorStop(1, '#050505'); // Negro absoluto
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // ✨ 2. LLUVIA DE PARTICULAS Y CONFETI
  drawParticles(ctx, width, height);

  // 📦 3. TARJETA DE CRISTAL ESMERILADO (Glassmorphism central)
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(80, 250, width - 160, height - 350, 40); // Requiere Canvas moderno, si falla usamos rect simple
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)'; // Borde dorado sutil
  ctx.stroke();
  ctx.restore();

  // 📸 4. MARCO DE FOTO LUXURY DOBLE ANILLO
  const centerX = width / 2;
  const centerY = 450;
  const radius = 220;

  // Anillo exterior brillante
  ctx.save();
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 60;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 25, 0, Math.PI * 2, true);
  
  const ringGradient = ctx.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius);
  ringGradient.addColorStop(0, '#FFD700'); // Oro vivo
  ringGradient.addColorStop(0.5, '#FFA500'); // Naranja brillante
  ringGradient.addColorStop(1, '#DAA520'); // Oro oscuro
  
  ctx.strokeStyle = ringGradient;
  ctx.lineWidth = 12;
  ctx.stroke();
  ctx.restore();

  // Anillo interior blanco elegante
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 8, 0, Math.PI * 2, true);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // 🖼️ 5. DIBUJAR LA FOTO DE PERFIL
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();

  try {
    const avatar = await loadImage(pfpUrl);
    ctx.drawImage(avatar, centerX - radius, centerY - radius, radius * 2, radius * 2);
  } catch {
    ctx.fillStyle = '#222';
    ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
  }
  ctx.restore();

  // 📝 6. TEXTOS Y TIPOGRAFÍAS AVANZADAS
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 20;

  // Título: Degradado Metálico
  const textGradient = ctx.createLinearGradient(0, 750, 0, 850);
  textGradient.addColorStop(0, '#FFF8DC');
  textGradient.addColorStop(0.5, '#FFD700');
  textGradient.addColorStop(1, '#B8860B');

  ctx.fillStyle = textGradient;
  ctx.font = 'bold 85px sans-serif';
  ctx.fillText('FELIZ CUMPLEAÑOS', centerX, 840);

  // Nombre del cumpleañero (Gigante y blanco puro)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 110px sans-serif';
  const displayName = pushName.length > 12 ? pushName.substring(0, 12) + '...' : pushName;
  ctx.fillText(displayName, centerX, 970);

  // Línea separadora decorativa
  ctx.beginPath();
  ctx.moveTo(centerX - 250, 1030);
  ctx.lineTo(centerX + 250, 1030);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#FFD700';
  ctx.stroke();
  
  // Diamante en el centro de la línea
  ctx.save();
  ctx.translate(centerX, 1030);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(-8, -8, 16, 16);
  ctx.restore();

  // Subtítulo elegante final
  ctx.fillStyle = '#E0E0E0';
  ctx.font = 'italic 45px serif'; // Cambiamos la fuente a Serif para darle el toque clásico/profesional
  ctx.fillText('Que la vida te siga sorprendiendo', centerX, 1120);
  
  ctx.fillStyle = '#A9A9A9';
  ctx.font = '30px sans-serif';
  ctx.fillText('Te deseamos lo mejor hoy y siempre', centerX, 1180);

  return canvas.toBuffer('image/jpeg', { quality: 0.95 });
}

module.exports = {
  name: 'felizcumple',
  aliases: ['cumpleaños', 'hb', 'hbd'],
  category: 'diversión',
  desc: 'Felicita a un usuario con una tarjeta de nivel Profesional Luxury',

  execute: async ({ sock, remoteJid, msg, args, reply }) => {
    try {
      const target = getTarget(msg, args);

      if (!target) {
        return reply('❌ Debes mencionar a la persona cumpleañera.\n📌 Ejemplo: *.felizcumple @usuario*');
      }

      const targetNum = cleanNumber(target);

      // 🔥 Extraer nombre oficial de WhatsApp
      let targetName = targetNum;
      try {
        const contact = await sock.onWhatsApp(target);
        if (contact && contact[0] && contact[0].notify) {
          targetName = contact[0].notify;
        } else {
          // Fallback si no tiene notify name guardado
          targetName = 'Amigo/a'; 
        }
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

      // ⏳ Mensaje de espera porque esta imagen tiene gráficos pesados
      const loadMsg = await sock.sendMessage(remoteJid, { text: '⏳ _Diseñando tarjeta premium..._' }, { quoted: msg });

      // 🎨 Generar la nueva imagen Luxury
      const imageBuffer = await createBirthdayCard(pfpUrl, targetName);

      let messageOptions = {
        image: imageBuffer,
        caption: texto,
        mentions: [target]
      };

      await sock.sendMessage(remoteJid, { delete: loadMsg.key }); // Borrar mensaje de carga
      await sock.sendMessage(remoteJid, messageOptions, { quoted: fakeQuoted });

    } catch (err) {
      console.log('❌ Error en plugin felizcumple:', err);
      return reply('❌ Ocurrió un error al intentar generar la tarjeta.');
    }
  }
};
