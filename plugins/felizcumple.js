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

// 🌟 EFECTOS GRÁFICOS PROCEDURALES AVANZADOS 🌟

// 1. Rayos de luz volumétrica
function drawSunburst(ctx, centerX, centerY, radius, width, height) {
  ctx.save();
  ctx.translate(centerX, centerY);
  const numRays = 40;
  for (let i = 0; i < numRays; i++) {
    const angle = (Math.PI * 2 / numRays) * i;
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, radius);
    ctx.lineTo(30, width + height);
    ctx.lineTo(-30, width + height);
    
    // Degradado radial para que la luz se desvanezca
    const gradient = ctx.createLinearGradient(0, radius, 0, width);
    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.15)');
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.closePath();
  }
  ctx.restore();
}

// 2. Destellos ópticos (Flares horizontales)
function drawLightFlare(ctx, x, y, width) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, width / 2);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.1, 'rgba(255, 215, 0, 0.8)');
  gradient.addColorStop(0.5, 'rgba(255, 0, 127, 0.2)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  ctx.fillStyle = gradient;
  // Estirar el círculo para que parezca un destello de lente anamórfico
  ctx.transform(1, 0, 0, 0.05, 0, y * 0.95);
  ctx.beginPath();
  ctx.arc(x, y, width / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// 3. Texto en 3D Metálico
function draw3DText(ctx, text, x, y, fontSize) {
  ctx.textAlign = 'center';
  ctx.font = `900 ${fontSize}px "Arial Black", Impact, sans-serif`;

  const depth = 25; // Profundidad del 3D

  // Dibujar las capas traseras (La sombra / extrusión 3D)
  for (let i = depth; i > 0; i--) {
    // Intercalar colores para dar textura al borde 3D
    ctx.fillStyle = (i % 2 === 0) ? '#5c4000' : '#8a6300';
    
    // Sombra en la última capa para que resalte contra el fondo
    if (i === depth) {
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 20;
    } else {
      ctx.shadowColor = 'transparent';
    }
    // Desplazamiento diagonal
    ctx.fillText(text, x - (i * 1.5), y + (i * 1.5));
  }

  // Dibujar la cara frontal (Oro brillante)
  ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 0;
  
  const frontGrad = ctx.createLinearGradient(0, y - fontSize, 0, y);
  frontGrad.addColorStop(0, '#FFF8DC'); // Blanco crema brillante
  frontGrad.addColorStop(0.3, '#FFDF00'); // Oro vivo
  frontGrad.addColorStop(0.7, '#DAA520'); // Oro medio
  frontGrad.addColorStop(1, '#B8860B');  // Oro oscuro
  
  ctx.fillStyle = frontGrad;
  // Borde blanco sutil en la letra frontal
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#FFFFFF';
  ctx.fillText(text, x, y);
  ctx.strokeText(text, x, y);
}

// 4. Dibujar un Listón/Banda de honor (Ribbon)
function drawRibbon(ctx, x, y, width, height, text) {
  const fold = 40; // Profundidad del doblez

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 50px sans-serif';

  // Sombra global del listón
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 15;

  // Cola izquierda
  ctx.beginPath();
  ctx.moveTo(x - width/2 - fold, y - height/2 + 20);
  ctx.lineTo(x - width/2 - fold - 60, y);
  ctx.lineTo(x - width/2 - fold, y + height/2 - 20);
  ctx.lineTo(x - width/2 + 20, y + height/2 - 20);
  ctx.lineTo(x - width/2 + 20, y - height/2 + 20);
  ctx.fillStyle = '#800000'; // Rojo oscuro
  ctx.fill();

  // Cola derecha
  ctx.beginPath();
  ctx.moveTo(x + width/2 + fold, y - height/2 + 20);
  ctx.lineTo(x + width/2 + fold + 60, y);
  ctx.lineTo(x + width/2 + fold, y + height/2 - 20);
  ctx.lineTo(x + width/2 - 20, y + height/2 - 20);
  ctx.lineTo(x + width/2 - 20, y - height/2 + 20);
  ctx.fillStyle = '#800000';
  ctx.fill();

  // Pieza central principal (Rojo vivo)
  ctx.beginPath();
  ctx.rect(x - width/2, y - height/2, width, height);
  const centerGrad = ctx.createLinearGradient(0, y - height/2, 0, y + height/2);
  centerGrad.addColorStop(0, '#ff3333');
  centerGrad.addColorStop(0.5, '#cc0000');
  centerGrad.addColorStop(1, '#990000');
  ctx.fillStyle = centerGrad;
  ctx.fill();
  
  // Bordes dorados del listón
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#FFD700';
  ctx.strokeRect(x - width/2 + 5, y - height/2 + 5, width - 10, height - 10);

  // Texto dentro del listón
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(text, x, y);
  ctx.restore();
}

// 🎨 CREADOR MAESTRO DE LA TARJETA
async function createBirthdayCard(pfpUrl, pushName = 'Amigo') {
  const width = 1200;
  const height = 1600; // Resolución Gigante
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // --- 1. FONDO CINEMÁTICO ---
  const bgGradient = ctx.createRadialGradient(width/2, 600, 100, width/2, 600, 1200);
  bgGradient.addColorStop(0, '#2b0033'); // Magenta oscuro profundo
  bgGradient.addColorStop(0.5, '#0d001a'); // Morado medianoche
  bgGradient.addColorStop(1, '#020005'); // Negro puro
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // --- 2. RAYOS Y POLVO ESTELAR ---
  drawSunburst(ctx, width/2, 600, 250, width, height);
  
  for(let i=0; i<300; i++) {
    const pX = Math.random() * width;
    const pY = Math.random() * height;
    const pSize = Math.random() * 4;
    ctx.beginPath();
    ctx.arc(pX, pY, pSize, 0, Math.PI*2);
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 215, 0, 0.6)' : 'rgba(255, 255, 255, 0.4)';
    ctx.fill();
  }

  // --- 3. MARCO DE LA FOTO (MANDALA DE ORO) ---
  const centerX = width / 2;
  const centerY = 550;
  const radius = 280;

  // Engranaje / Corona exterior
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.beginPath();
  for(let i = 0; i < 60; i++) {
    const angle = (Math.PI * 2 / 60) * i;
    const r = i % 2 === 0 ? radius + 50 : radius + 30;
    ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
  }
  ctx.closePath();
  ctx.fillStyle = '#FFD700';
  ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
  ctx.shadowBlur = 50;
  ctx.fill();
  ctx.restore();

  // Círculo oscuro de contraste
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 15, 0, Math.PI * 2);
  ctx.fillStyle = '#000000';
  ctx.fill();

  // --- 4. DIBUJAR FOTO DE PERFIL ---
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
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

  // Brillo interno en la foto
  const innerGlow = ctx.createRadialGradient(centerX, centerY, radius - 40, centerX, centerY, radius);
  innerGlow.addColorStop(0, 'rgba(0,0,0,0)');
  innerGlow.addColorStop(1, 'rgba(255,215,0,0.6)');
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = innerGlow;
  ctx.fill();

  // --- 5. TEXTO ÉPICO 3D ---
  draw3DText(ctx, "FELIZ", centerX, 1020, 120);
  draw3DText(ctx, "CUMPLEAÑOS", centerX, 1150, 130);

  // --- 6. BANDA CON EL NOMBRE (RIBBON) ---
  const displayName = pushName.length > 15 ? pushName.substring(0, 15) + '...' : pushName;
  drawRibbon(ctx, centerX, 1320, 700, 110, displayName);

  // --- 7. DETALLES FINALES ---
  ctx.shadowColor = 'transparent';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#E0E0E0';
  ctx.font = 'italic 35px serif';
  ctx.fillText('✨ Que hoy sea el mejor día de tu vida ✨', centerX, 1480);
  
  // Agregar destellos ópticos (Flares)
  drawLightFlare(ctx, centerX, 400, 1200);
  drawLightFlare(ctx, centerX, 1080, 900);

  // Marco de tarjeta global elegante
  ctx.lineWidth = 15;
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
  ctx.strokeRect(30, 30, width - 60, height - 60);
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.strokeRect(45, 45, width - 90, height - 90);

  return canvas.toBuffer('image/jpeg', { quality: 1.0 });
}

// --- MÓDULO EXPORTADO ---
module.exports = {
  name: 'felizcumple',
  aliases: ['cumpleaños', 'hb', 'hbd'],
  category: 'diversión',
  desc: 'Genera el póster de cumpleaños más épico de todo WhatsApp',

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

      const texto = `🎂✨ *LA LEYENDA ESTÁ DE CUMPLEAÑOS* ✨🎂\n\n🎉 Todo el grupo se pone de pie para felicitar a @${targetNum} 🥳💖\n\n💌 ¡Feliz cumpleaños!\n\nTe hemos preparado este póster especial porque te mereces un día increíble, lleno de amor, regalos y muchísima felicidad ✨\n\n💖 Que nunca te falten motivos para sonreír\n🌟 Que todos tus sueños se hagan realidad\n🎁 Y que este nuevo año de vida sea el mejor de todos.\n\n¡A celebrar se ha dicho! 🎉🎂✨`;

      const fakeQuoted = {
        key: {
          fromMe: false,
          participant: target,
          remoteJid: remoteJid,
          id: generateFakeId()
        },
        message: {
          conversation: '🥳 ¡Hoy es mi cumpleaños, hagamos fiesta! 🎂✨'
        }
      };

      let pfpUrl;
      try {
        pfpUrl = await sock.profilePictureUrl(target, 'image');
      } catch {
        pfpUrl = 'https://i.imgur.com/JP3QZ7B.jpeg';
      }

      // ⏳ Mensaje de espera
      const loadMsg = await sock.sendMessage(remoteJid, { text: '⏳ _Renderizando póster 3D de alta resolución. Esto tardará unos segundos..._' }, { quoted: msg });

      // 🎨 Generar la OBRA DE ARTE
      const imageBuffer = await createBirthdayCard(pfpUrl, targetName);

      let messageOptions = {
        image: imageBuffer,
        caption: texto,
        mentions: [target]
      };

      await sock.sendMessage(remoteJid, { delete: loadMsg.key }); // Borrar espera
      await sock.sendMessage(remoteJid, messageOptions, { quoted: fakeQuoted });

    } catch (err) {
      console.log('❌ Error en plugin felizcumple:', err);
      return reply('❌ Ocurrió un error al intentar generar la tarjeta maestra.');
    }
  }
};
