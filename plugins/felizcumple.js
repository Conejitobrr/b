'use strict';

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// --- UTILIDADES ---
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

// 🎈 FUNCIÓN: DIBUJAR BANDERINES DE FIESTA
function drawBunting(ctx, width) {
  const colors = ['#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55'];
  const numFlags = 9;
  const flagWidth = width / numFlags;
  
  // Cuerda de los banderines
  ctx.beginPath();
  ctx.moveTo(0, 50);
  ctx.quadraticCurveTo(width / 2, 120, width, 50);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();

  // Dibujar cada triángulo
  for (let i = 0; i < numFlags; i++) {
    const startX = i * flagWidth;
    const endX = (i + 1) * flagWidth;
    const midX = (startX + endX) / 2;
    
    // Altura del triángulo simulando la curva de la cuerda
    const curveOffset = Math.sin((i / numFlags) * Math.PI) * 50; 
    const yTop = 50 + curveOffset;
    
    ctx.beginPath();
    ctx.moveTo(startX + 10, yTop);
    ctx.lineTo(endX - 10, yTop);
    ctx.lineTo(midX, yTop + 130 + (Math.random() * 40)); // Punta hacia abajo
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    
    // Sombra interior del banderín
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.stroke();
  }
}

// 🎉 FUNCIÓN: DIBUJAR SERPENTINAS Y CONFETI
function drawPartyDecorations(ctx, width, height) {
  const colors = ['#FF3B30', '#4CD964', '#FFCC00', '#5AC8FA', '#FF2D55'];
  
  // Serpentinas (Líneas curvas)
  for (let i = 0; i < 15; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * width, -50);
    ctx.bezierCurveTo(
      Math.random() * width, Math.random() * height / 2,
      Math.random() * width, Math.random() * height / 2,
      Math.random() * width, height + 50
    );
    ctx.lineWidth = Math.random() * 8 + 4;
    ctx.strokeStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.stroke();
  }

  // Confeti de colores
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 8 + 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 🎨 CREADOR DE TARJETA FESTIVA DEFINITIVA
async function createFestiveCard(pfpUrl, pushName = 'Amigo') {
  const width = 1080;
  const height = 1350;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  let avatarImage;
  try {
    avatarImage = await loadImage(pfpUrl);
  } catch {
    // Imagen por defecto colorida si falla la descarga
    const fallbackCanvas = createCanvas(500, 500);
    const fallbackCtx = fallbackCanvas.getContext('2d');
    fallbackCtx.fillStyle = '#FF9500';
    fallbackCtx.fillRect(0,0,500,500);
    avatarImage = fallbackCanvas;
  }

  // 🌌 1. FONDO: LA FOTO DE PERFIL DIFUMINADA
  ctx.save();
  // Aplicamos un filtro de desenfoque nativo (Si la versión de canvas lo soporta)
  if (ctx.filter) ctx.filter = 'blur(15px)';
  // Dibujamos la imagen gigante para cubrir el fondo
  ctx.drawImage(avatarImage, -50, -50, width + 100, height + 100);
  ctx.restore();

  // Capa oscura translúcida para que los colores de la fiesta resalten
  ctx.fillStyle = 'rgba(20, 0, 40, 0.65)'; 
  ctx.fillRect(0, 0, width, height);

  // 🎉 2. DIBUJAR DECORACIÓN FESTIVA (Banderines y Serpentinas)
  drawPartyDecorations(ctx, width, height);
  drawBunting(ctx, width);

  // 🎁 3. DIBUJAR OBJETOS DE FIESTA (Usando emojis renderizados como gráficos HD)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Sombra para que los objetos destaquen
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 20;

  ctx.font = '140px Arial';
  ctx.fillText('🪅', 150, 350); // Piñata arriba izquierda
  ctx.fillText('🎈', width - 130, 320); // Globo arriba derecha
  
  ctx.font = '160px Arial';
  ctx.fillText('🎂', 200, height - 250); // Pastel gigante abajo izquierda
  ctx.fillText('🎁', width - 200, height - 230); // Regalo abajo derecha
  
  ctx.font = '100px Arial';
  ctx.fillText('🎊', width / 2 - 250, 480); 
  ctx.fillText('🎉', width / 2 + 250, 480);

  // 📸 4. MARCO CENTRAL DIVERTIDO PARA LA FOTO
  const centerX = width / 2;
  const centerY = 550;
  const radius = 220;

  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 40;

  // Círculo blanco grueso (Estilo Polaroid/Sticker)
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 25, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Círculo de color vibrante interior
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 10, 0, Math.PI * 2);
  ctx.fillStyle = '#FF2D55'; // Rosa fiesta
  ctx.fill();

  // Dibujar la foto de perfil nítida en el centro
  ctx.shadowColor = 'transparent';
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatarImage, centerX - radius, centerY - radius, radius * 2, radius * 2);
  ctx.restore();

  // 📝 5. TEXTO PRINCIPAL SÚPER ALEGRE
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 10;
  ctx.textAlign = 'center';
  
  // Título: FELIZ CUMPLEAÑOS
  ctx.font = '900 100px "Arial Black", sans-serif';
  ctx.lineWidth = 15;
  ctx.strokeStyle = '#000000'; // Borde negro grueso
  ctx.strokeText('¡FELIZ CUMPLEAÑOS!', centerX, 880);
  
  // Degradado arcoíris para el título
  const rainbowGrad = ctx.createLinearGradient(centerX - 400, 0, centerX + 400, 0);
  rainbowGrad.addColorStop(0, '#FF3B30'); // Rojo
  rainbowGrad.addColorStop(0.3, '#FFCC00'); // Amarillo
  rainbowGrad.addColorStop(0.6, '#4CD964'); // Verde
  rainbowGrad.addColorStop(1, '#007AFF'); // Azul
  ctx.fillStyle = rainbowGrad;
  ctx.fillText('¡FELIZ CUMPLEAÑOS!', centerX, 880);

  // Nombre del cumpleañero (Fondo estilo cinta de regalo)
  const displayName = pushName.length > 14 ? pushName.substring(0, 14) + '...' : pushName;
  ctx.font = 'bold 80px sans-serif';
  
  // Dibujar caja detrás del nombre
  const textWidth = ctx.measureText(displayName).width;
  ctx.fillStyle = '#FF2D55'; // Cinta roja/rosa
  ctx.beginPath();
  ctx.roundRect(centerX - textWidth/2 - 40, 950, textWidth + 80, 120, 60); // Caja con bordes redondos
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();

  // Escribir el nombre
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'transparent'; // Quitar sombra para que se lea nítido
  ctx.fillText(displayName, centerX, 1035);

  // Mensaje final
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#FFF8DC';
  ctx.font = 'bold 45px sans-serif';
  ctx.fillText('✨ Que se arme la verdadera fiesta ✨', centerX, 1180);
  ctx.fillStyle = '#E0E0E0';
  ctx.font = '35px sans-serif';
  ctx.fillText('Te deseamos lo mejor hoy y siempre', centerX, 1250);

  return canvas.toBuffer('image/jpeg', { quality: 0.95 });
}

// --- MÓDULO EXPORTADO ---
module.exports = {
  name: 'felizcumple',
  aliases: ['cumpleaños', 'hb', 'hbd'],
  category: 'diversión',
  desc: 'Genera una tarjeta festiva llena de color, globos y pasteles',

  execute: async ({ sock, remoteJid, msg, args, reply }) => {
    try {
      const target = getTarget(msg, args);

      if (!target) {
        return reply('❌ Debes mencionar a la persona cumpleañera.\n📌 Ejemplo: *.felizcumple @usuario*');
      }

      const targetNum = cleanNumber(target);

      // Obtener nombre real de WhatsApp
      let targetName = targetNum;
      try {
        const contact = await sock.onWhatsApp(target);
        if (contact && contact[0] && contact[0].notify) {
          targetName = contact[0].notify;
        } else {
          targetName = 'Amigo/a'; 
        }
      } catch {
        targetName = 'Amigo/a';
      }

      const texto = `🎂✨ *¡ESTAMOS DE FIESTA!* ✨🎂\n\n🎉 Todo el grupo se reúne hoy para celebrar a @${targetNum} 🥳💖\n\n💌 ¡Feliz cumpleaños!\n\nTe hemos preparado esta tarjeta festiva porque te mereces un día increíble, lleno de pasteles, regalos y muchísima felicidad ✨\n\n💖 Que nunca te falten motivos para sonreír\n🌟 Que todos tus sueños se hagan realidad\n🎁 Y que este nuevo año de vida esté lleno de éxitos.\n\n¡A celebrar se ha dicho! 🎉🎂✨`;

      const fakeQuoted = {
        key: {
          fromMe: false,
          participant: target,
          remoteJid: remoteJid,
          id: generateFakeId()
        },
        message: {
          conversation: '🥳 ¡Hoy es mi cumpleaños, quiero pastel! 🎂✨'
        }
      };

      let pfpUrl;
      try {
        pfpUrl = await sock.profilePictureUrl(target, 'image');
      } catch {
        pfpUrl = 'https://i.imgur.com/JP3QZ7B.jpeg';
      }

      // ⏳ Mensaje de espera
      const loadMsg = await sock.sendMessage(remoteJid, { text: '⏳ _Preparando los globos, el pastel y la piñata..._' }, { quoted: msg });

      // 🎨 Generar la TARJETA FESTIVA
      const imageBuffer = await createFestiveCard(pfpUrl, targetName);

      let messageOptions = {
        image: imageBuffer,
        caption: texto,
        mentions: [target]
      };

      await sock.sendMessage(remoteJid, { delete: loadMsg.key }); // Borrar espera
      await sock.sendMessage(remoteJid, messageOptions, { quoted: fakeQuoted });

    } catch (err) {
      console.log('❌ Error en plugin felizcumple:', err);
      return reply('❌ Ocurrió un error al intentar generar la tarjeta de fiesta.');
    }
  }
};
