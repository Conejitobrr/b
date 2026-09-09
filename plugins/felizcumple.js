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

// 🎆 FUNCIÓN: DIBUJAR FUEGOS ARTIFICIALES
function drawFirework(ctx, x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  for (let i = 0; i < 16; i++) {
    const angle = (Math.PI * 2 / 16) * i;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 15, Math.sin(angle) * 15);
    ctx.lineTo(Math.cos(angle) * 70, Math.sin(angle) * 70);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Chispa en la punta
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * 85, Math.sin(angle) * 85, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  }
  ctx.restore();
}

// 🎈 FUNCIÓN: DIBUJAR GLOBOS REALISTAS
function drawBalloon(ctx, x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  
  // Hilo del globo
  ctx.beginPath();
  ctx.moveTo(0, 45);
  ctx.quadraticCurveTo(15, 80, -10, 150);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Cuerpo del globo
  ctx.beginPath();
  ctx.moveTo(0, 40);
  ctx.bezierCurveTo(45, 40, 55, -45, 0, -55);
  ctx.bezierCurveTo(-55, -45, -45, 40, 0, 40);
  ctx.fillStyle = color;
  ctx.fill();
  
  // Nudo del globo
  ctx.beginPath();
  ctx.moveTo(-8, 40);
  ctx.lineTo(8, 40);
  ctx.lineTo(12, 50);
  ctx.lineTo(-12, 50);
  ctx.fill();

  // Brillo (Reflejo de luz)
  ctx.beginPath();
  ctx.ellipse(-15, -20, 8, 15, Math.PI / 6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fill();
  
  ctx.restore();
}

// 🎂 FUNCIÓN: DIBUJAR PASTEL DE DOS PISOS
function drawCake(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);

  // Piso Inferior
  ctx.fillStyle = '#FF9500'; // Naranja
  ctx.beginPath();
  ctx.roundRect(-120, -70, 240, 70, 10);
  ctx.fill();
  
  // Glaseado piso inferior
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(-125, -75, 250, 30, 10);
  ctx.fill();
  for(let i = -110; i < 110; i+= 30) {
    ctx.beginPath();
    ctx.arc(i + 15, -45, 15, 0, Math.PI);
    ctx.fill();
  }

  // Piso Superior
  ctx.fillStyle = '#FF2D55'; // Rosa fiesta
  ctx.beginPath();
  ctx.roundRect(-80, -130, 160, 60, 10);
  ctx.fill();

  // Glaseado piso superior
  ctx.fillStyle = '#FFDF00'; // Amarillo dorado
  ctx.beginPath();
  ctx.roundRect(-85, -135, 170, 25, 10);
  ctx.fill();
  for(let i = -70; i < 70; i+= 25) {
    ctx.beginPath();
    ctx.arc(i + 12.5, -110, 12.5, 0, Math.PI);
    ctx.fill();
  }

  // Velas
  const candleColors = ['#007AFF', '#4CD964', '#007AFF'];
  const candleX = [-40, 0, 40];
  for(let i = 0; i < 3; i++) {
    // Cuerpo
    ctx.fillStyle = candleColors[i];
    ctx.fillRect(candleX[i] - 6, -170, 12, 40);
    // Llama
    ctx.fillStyle = '#FF9500';
    ctx.beginPath();
    ctx.arc(candleX[i], -180, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFDF00';
    ctx.beginPath();
    ctx.arc(candleX[i], -180, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// 🎨 CREADOR DE TARJETA CUADRADA FESTIVA
async function createSquareFestiveCard(pfpUrl, pushName = 'Amigo') {
  const width = 1080;
  const height = 1080; // Formato 1:1 Cuadrado Perfecto
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  let avatarImage;
  try {
    avatarImage = await loadImage(pfpUrl);
  } catch {
    const fallbackCanvas = createCanvas(500, 500);
    const fallbackCtx = fallbackCanvas.getContext('2d');
    fallbackCtx.fillStyle = '#800080';
    fallbackCtx.fillRect(0,0,500,500);
    avatarImage = fallbackCanvas;
  }

  // 🌌 1. FONDO DIFUMINADO
  ctx.save();
  if (ctx.filter) ctx.filter = 'blur(12px)';
  ctx.drawImage(avatarImage, -50, -50, width + 100, height + 100);
  ctx.restore();

  // Capa oscura vibrante
  ctx.fillStyle = 'rgba(15, 0, 30, 0.75)'; 
  ctx.fillRect(0, 0, width, height);

  // 🎆 2. DIBUJAR FUEGOS ARTIFICIALES
  drawFirework(ctx, 200, 200, '#00FFFF'); // Cyan
  drawFirework(ctx, 880, 250, '#FF2D55'); // Rosa
  drawFirework(ctx, 150, 750, '#FFD700'); // Dorado
  drawFirework(ctx, 900, 700, '#4CD964'); // Verde

  // 🎉 3. DIBUJAR CONFETI GEOMÉTRICO
  const confColors = ['#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#5AC8FA', '#FF2D55'];
  for (let i = 0; i < 150; i++) {
    ctx.fillStyle = confColors[Math.floor(Math.random() * confColors.length)];
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 6 + 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 🎈 4. DIBUJAR GLOBOS LATERALES
  drawBalloon(ctx, 120, 350, '#FF3B30'); // Rojo izq
  drawBalloon(ctx, 220, 420, '#5AC8FA'); // Azul izq
  drawBalloon(ctx, 960, 320, '#FFCC00'); // Amarillo der
  drawBalloon(ctx, 860, 450, '#FF2D55'); // Rosa der

  // 📸 5. FOTO DE PERFIL CENTRAL Y CUADRADA CON BORDES REDONDOS
  const centerX = width / 2;
  const centerY = 380;
  const pfpSize = 400; // Tamaño de la foto

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 40;
  
  // Marco blanco exterior
  ctx.beginPath();
  ctx.roundRect(centerX - (pfpSize/2) - 15, centerY - (pfpSize/2) - 15, pfpSize + 30, pfpSize + 30, 40);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Marco interior dorado
  ctx.beginPath();
  ctx.roundRect(centerX - (pfpSize/2) - 5, centerY - (pfpSize/2) - 5, pfpSize + 10, pfpSize + 10, 35);
  ctx.fillStyle = '#FFD700';
  ctx.fill();

  // Foto de perfil recortada
  ctx.shadowColor = 'transparent';
  ctx.beginPath();
  ctx.roundRect(centerX - pfpSize/2, centerY - pfpSize/2, pfpSize, pfpSize, 30);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatarImage, centerX - pfpSize/2, centerY - pfpSize/2, pfpSize, pfpSize);
  ctx.restore();

  // 📝 6. TEXTO ESPECTACULAR
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 8;
  ctx.textAlign = 'center';
  
  // Título: FELIZ CUMPLEAÑOS
  ctx.font = '900 85px "Arial Black", Impact, sans-serif';
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#000000';
  ctx.strokeText('¡FELIZ CUMPLEAÑOS!', centerX, 730);
  
  const textGrad = ctx.createLinearGradient(0, 650, 0, 750);
  textGrad.addColorStop(0, '#FFDF00');
  textGrad.addColorStop(1, '#FF8C00');
  ctx.fillStyle = textGrad;
  ctx.fillText('¡FELIZ CUMPLEAÑOS!', centerX, 730);

  // Cinta con el nombre
  const displayName = pushName.length > 15 ? pushName.substring(0, 15) + '...' : pushName;
  ctx.font = 'bold 65px sans-serif';
  const textWidth = ctx.measureText(displayName).width;
  
  ctx.fillStyle = '#E30039'; // Rojo carmesí
  ctx.beginPath();
  ctx.roundRect(centerX - textWidth/2 - 50, 780, textWidth + 100, 100, 50);
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'transparent'; 
  ctx.fillText(displayName, centerX, 850);

  // 🎂 7. DIBUJAR PASTEL EN LA PARTE INFERIOR
  drawCake(ctx, centerX, 1060); // Se dibuja pegado abajo en el centro

  return canvas.toBuffer('image/jpeg', { quality: 0.95 });
}

module.exports = {
  name: 'felizcumple',
  aliases: ['cumpleaños', 'hb', 'hbd'],
  category: 'diversión',
  desc: 'Genera una tarjeta cuadrada festiva con globos, pasteles y foto integrada',

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

      const loadMsg = await sock.sendMessage(remoteJid, { text: '⏳ _Horneando el pastel y encendiendo los fuegos artificiales..._' }, { quoted: msg });

      // 🎨 Generar la NUEVA TARJETA CUADRADA
      const imageBuffer = await createSquareFestiveCard(pfpUrl, targetName);

      let messageOptions = {
        image: imageBuffer,
        caption: texto,
        mentions: [target]
      };

      await sock.sendMessage(remoteJid, { delete: loadMsg.key }); 
      await sock.sendMessage(remoteJid, messageOptions, { quoted: fakeQuoted });

    } catch (err) {
      console.log('❌ Error en plugin felizcumple:', err);
      return reply('❌ Ocurrió un error al intentar generar la tarjeta de fiesta.');
    }
  }
};
