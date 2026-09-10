'use strict';

const { createCanvas, loadImage } = require('canvas');

function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }

function getTarget(msg, args, sender) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return cleanJid(quoted) + '@s.whatsapp.net';
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return cleanJid(mentioned) + '@s.whatsapp.net';
  return cleanJid(sender) + '@s.whatsapp.net';
}

async function getAvatar(sock, jid) {
  try {
    const url = await sock.profilePictureUrl(jid, 'image');
    return await loadImage(url);
  } catch {
    // Canvas más pequeño para el fallback
    const fallback = createCanvas(200, 200);
    const ctx = fallback.getContext('2d');
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 100px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', 100, 135);
    return fallback;
  }
}

function aplicarTinteFast(ctx, x, y, w, h, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha; 
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

// 🟢 FUNCIÓN SALVA-VIDAS: Le da un respiro al bot para no perder la conexión
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  name: 'carteles',
  aliases: ['sebusca', 'onepiece', 'gta', 'wasted'],
  category: 'diversión',
  desc: 'Genera carteles optimizados para Termux (Anti-Lag)',

  execute: async ({ sock, msg, remoteJid, sender, pushName, args, commandName, db, reply }) => {
    const cmd = commandName.toLowerCase();
    const target = getTarget(msg, args, sender);
    
    const loadMsg = await sock.sendMessage(remoteJid, { text: '🎨 _Pintando lienzo... (Modo Anti-Lag)_' }, { quoted: msg });

    try {
      // 1. OBTENER NOMBRE
      let nombreElegido = cleanNumber(target);
      if (target === sender && pushName) {
          nombreElegido = pushName;
      } else {
          try {
              if (sock.store && sock.store.contacts && sock.store.contacts[target]) {
                  const c = sock.store.contacts[target];
                  nombreElegido = c.pushName || c.name || c.notify || nombreElegido;
              }
              if (/^\d+$/.test(nombreElegido) && db) {
                  const uData = await db.getUser(target);
                  if (uData && uData.name) nombreElegido = uData.name;
              }
          } catch (e) {}
      }
      if (/^\d+$/.test(nombreElegido)) nombreElegido = `Bandido ${nombreElegido.slice(-4)}`;
      if (nombreElegido.length > 15) nombreElegido = nombreElegido.substring(0, 15);

      // 2. OBTENER XP
      let recompensa = 50000;
      if (db) {
        const uData = await db.getUser(target);
        if (uData && uData.xp) recompensa = Math.max(uData.xp * 10, 50000);
      }
      
      const avatar = await getAvatar(sock, target);
      let buffer;

      // 🟢 RESPIRACIÓN 1: Dejar que Baileys envíe sus pings antes de congelar el CPU
      await sleep(150); 

      // 🤠 COMANDO 1: .sebusca (Resolución 400x500)
      if (cmd === 'sebusca') {
        const canvas = createCanvas(400, 500);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#E3CBA8';
        ctx.fillRect(0, 0, 400, 500);
        
        ctx.lineWidth = 7;
        ctx.strokeStyle = '#5E3A1A';
        ctx.strokeRect(15, 15, 370, 470);
        ctx.strokeRect(22, 22, 355, 455);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#3E2723';
        ctx.font = '900 55px serif';
        ctx.fillText('WANTED', 200, 80);
        
        ctx.font = 'bold 25px serif';
        ctx.fillText('DEAD OR ALIVE', 200, 115);

        ctx.drawImage(avatar, 50, 130, 300, 240);
        aplicarTinteFast(ctx, 50, 130, 300, 240, '#8A6327', 0.25); 
        ctx.lineWidth = 5;
        ctx.strokeRect(50, 130, 300, 240);

        ctx.font = 'bold 30px serif';
        ctx.fillText(nombreElegido.toUpperCase(), 200, 410);
        
        ctx.fillStyle = '#B71C1C';
        ctx.font = '900 40px serif';
        ctx.fillText(`$ ${recompensa.toLocaleString()}`, 200, 460);

        // 🟢 RESPIRACIÓN 2
        await sleep(50);
        buffer = canvas.toBuffer('image/jpeg', { quality: 0.8 });
      }

      // 🏴‍☠️ COMANDO 2: .onepiece (Resolución 375x525)
      else if (cmd === 'onepiece') {
        const canvas = createCanvas(375, 525);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#D6B881';
        ctx.fillRect(0, 0, 375, 525);

        ctx.lineWidth = 4;
        ctx.strokeStyle = '#4A3219';
        ctx.strokeRect(20, 20, 335, 485);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#4A3219';
        ctx.font = '900 60px serif';
        ctx.fillText('WANTED', 187, 85);

        ctx.drawImage(avatar, 30, 105, 315, 260);
        aplicarTinteFast(ctx, 30, 105, 315, 260, '#D6B881', 0.2); 
        ctx.lineWidth = 5;
        ctx.strokeRect(30, 105, 315, 260);

        ctx.font = '900 37px serif';
        ctx.fillText(nombreElegido.toUpperCase(), 187, 415);

        ctx.font = '900 42px serif';
        ctx.fillText(`฿ ${recompensa.toLocaleString()} -`, 187, 475);
        
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('MARINE', 187, 500);

        await sleep(50);
        buffer = canvas.toBuffer('image/jpeg', { quality: 0.8 });
      }

      // 🚁 COMANDO 3: .gta (Resolución 400x400)
      else if (cmd === 'gta') {
        const canvas = createCanvas(400, 400);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(avatar, 0, 0, 400, 400);
        aplicarTinteFast(ctx, 0, 0, 400, 400, '#FF9800', 0.35);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 150, 400, 100);

        ctx.textAlign = 'center';
        
        ctx.fillStyle = '#000000';
        ctx.font = '900 35px sans-serif';
        ctx.fillText('MISSION PASSED!', 202, 192);
        ctx.font = 'bold 25px sans-serif';
        ctx.fillText('+ RESPECT', 202, 222);

        ctx.fillStyle = '#FFC107'; 
        ctx.font = '900 35px sans-serif';
        ctx.fillText('MISSION PASSED!', 200, 190);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 25px sans-serif';
        ctx.fillText('+ RESPECT', 200, 220);

        await sleep(50);
        buffer = canvas.toBuffer('image/jpeg', { quality: 0.8 });
      }

      // 💀 COMANDO 4: .wasted (Resolución 400x400)
      else if (cmd === 'wasted') {
        const canvas = createCanvas(400, 400);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(avatar, 0, 0, 400, 400);
        aplicarTinteFast(ctx, 0, 0, 400, 400, '#000000', 0.5); 

        ctx.textAlign = 'center';
        
        ctx.fillStyle = '#000000';
        ctx.font = '900 60px sans-serif';
        ctx.fillText('W A S T E D', 202, 217);

        ctx.fillStyle = '#D32F2F'; 
        ctx.fillText('W A S T E D', 200, 215);

        await sleep(50);
        buffer = canvas.toBuffer('image/jpeg', { quality: 0.8 });
      } else {
        return reply('❌ Comando no encontrado en carteles.');
      }

      // 🟢 RESPIRACIÓN 3: Dejamos que WhatsApp reciba la señal final
      await sleep(150);

      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      
      const menciones = (target !== sender) ? [target] : [];
      await sock.sendMessage(remoteJid, { 
        image: buffer, 
        caption: `📸 Edición generada para 👤 *${nombreElegido}*`,
        mentions: menciones
      }, { quoted: msg });

    } catch (err) {
      console.log('Error en carteles:', err);
      return reply('❌ Ocurrió un error interno al dibujar.');
    }
  }
};
