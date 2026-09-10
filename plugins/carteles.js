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
    const fallback = createCanvas(400, 400);
    const ctx = fallback.getContext('2d');
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, 400, 400);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 200px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', 200, 270);
    return fallback;
  }
}

// 🔥 FILTRO SÚPER OPTIMIZADO PARA TERMUX (Cero Lag)
function aplicarTinteFast(ctx, x, y, w, h, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha; // Usar opacidad simple en lugar de mezclas complejas
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

module.exports = {
  name: 'carteles',
  aliases: ['sebusca', 'onepiece', 'gta', 'wasted'],
  category: 'diversión',
  desc: 'Genera carteles optimizados para Termux',

  execute: async ({ sock, msg, remoteJid, sender, pushName, args, commandName, db, reply }) => {
    const cmd = commandName.toLowerCase();
    const target = getTarget(msg, args, sender);
    
    const loadMsg = await sock.sendMessage(remoteJid, { text: '🎨 _Pintando lienzo a toda velocidad..._' }, { quoted: msg });

    try {
      // 🧠 OBTENER NOMBRE
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

      // 🧠 OBTENER XP
      let recompensa = 50000;
      if (db) {
        const uData = await db.getUser(target);
        if (uData && uData.xp) recompensa = Math.max(uData.xp * 10, 50000);
      }
      
      const avatar = await getAvatar(sock, target);
      let buffer;

      // 🤠 .sebusca
      if (cmd === 'sebusca') {
        const canvas = createCanvas(800, 1000);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#E3CBA8';
        ctx.fillRect(0, 0, 800, 1000);
        
        ctx.lineWidth = 15;
        ctx.strokeStyle = '#5E3A1A';
        ctx.strokeRect(30, 30, 740, 940);
        ctx.strokeRect(45, 45, 710, 910);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#3E2723';
        ctx.font = '900 110px serif';
        ctx.fillText('WANTED', 400, 160);
        
        ctx.font = 'bold 50px serif';
        ctx.fillText('DEAD OR ALIVE', 400, 230);

        ctx.drawImage(avatar, 100, 260, 600, 480);
        aplicarTinteFast(ctx, 100, 260, 600, 480, '#8A6327', 0.25); 
        ctx.lineWidth = 10;
        ctx.strokeRect(100, 260, 600, 480);

        ctx.font = 'bold 60px serif';
        ctx.fillText(nombreElegido.toUpperCase(), 400, 820);
        
        ctx.fillStyle = '#B71C1C';
        ctx.font = '900 80px serif';
        ctx.fillText(`$ ${recompensa.toLocaleString()}`, 400, 920);

        buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
      }

      // 🏴‍☠️ .onepiece
      if (cmd === 'onepiece') {
        const canvas = createCanvas(750, 1050);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#D6B881';
        ctx.fillRect(0, 0, 750, 1050);

        ctx.lineWidth = 8;
        ctx.strokeStyle = '#4A3219';
        ctx.strokeRect(40, 40, 670, 970);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#4A3219';
        ctx.font = '900 120px serif';
        ctx.fillText('WANTED', 375, 170);

        ctx.drawImage(avatar, 60, 210, 630, 520);
        aplicarTinteFast(ctx, 60, 210, 630, 520, '#D6B881', 0.2); 
        ctx.lineWidth = 10;
        ctx.strokeRect(60, 210, 630, 520);

        ctx.font = '900 75px serif';
        ctx.fillText(nombreElegido.toUpperCase(), 375, 830);

        ctx.font = '900 85px serif';
        ctx.fillText(`฿ ${recompensa.toLocaleString()} -`, 375, 950);
        
        ctx.font = 'bold 25px sans-serif';
        ctx.fillText('MARINE', 375, 1000);

        buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
      }

      // 🚁 .gta
      if (cmd === 'gta') {
        const canvas = createCanvas(800, 800);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(avatar, 0, 0, 800, 800);
        aplicarTinteFast(ctx, 0, 0, 800, 800, '#FF9800', 0.35);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 300, 800, 200);

        ctx.textAlign = 'center';
        
        // Sombra Manual Optimizada
        ctx.fillStyle = '#000000';
        ctx.font = '900 70px sans-serif';
        ctx.fillText('MISSION PASSED!', 405, 405);
        ctx.font = 'bold 50px sans-serif';
        ctx.fillText('+ RESPECT', 404, 464);

        // Texto Real
        ctx.fillStyle = '#FFC107'; 
        ctx.font = '900 70px sans-serif';
        ctx.fillText('MISSION PASSED!', 400, 400);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 50px sans-serif';
        ctx.fillText('+ RESPECT', 400, 460);

        buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
      }

      // 💀 .wasted
      if (cmd === 'wasted') {
        const canvas = createCanvas(800, 800);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(avatar, 0, 0, 800, 800);
        aplicarTinteFast(ctx, 0, 0, 800, 800, '#000000', 0.5); 

        ctx.textAlign = 'center';
        
        // Sombra Manual Optimizada
        ctx.fillStyle = '#000000';
        ctx.font = '900 120px sans-serif';
        ctx.fillText('W A S T E D', 406, 436);

        // Texto Real
        ctx.fillStyle = '#D32F2F'; 
        ctx.fillText('W A S T E D', 400, 430);

        buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
      }

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
