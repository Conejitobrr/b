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

// 🟢 ANTI-CUELGUES: Timeout de 3 segundos para que WhatsApp no trabe al bot
async function getAvatar(sock, jid) {
  try {
    const url = await Promise.race([
        sock.profilePictureUrl(jid, 'image'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ]);
    return await loadImage(url);
  } catch {
    const fallback = createCanvas(300, 300);
    const ctx = fallback.getContext('2d');
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(0, 0, 300, 300);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 120px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', 150, 190);
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

// 🟢 EL TRUCO DEFINITIVO: Comprimir la imagen en segundo plano (Evita el Connection Closed)
function renderizarAsync(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBuffer((err, buffer) => {
      if (err) reject(err);
      else resolve(buffer);
    }, 'image/jpeg', { quality: 0.85 });
  });
}

module.exports = {
  name: 'carteles',
  aliases: ['sebusca', 'onepiece', 'gta', 'wasted'],
  category: 'diversión',
  desc: 'Genera carteles optimizados sin bloquear el bot',

  execute: async ({ sock, msg, remoteJid, sender, pushName, args, commandName, db, reply }) => {
    const cmd = commandName.toLowerCase();
    const target = getTarget(msg, args, sender);
    
    const loadMsg = await sock.sendMessage(remoteJid, { text: '🎨 _Procesando imagen en segundo plano..._' }, { quoted: msg });

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

      // 🤠 COMANDO 1: .sebusca
      if (cmd === 'sebusca') {
        const canvas = createCanvas(500, 625);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#E3CBA8';
        ctx.fillRect(0, 0, 500, 625);
        
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#5E3A1A';
        ctx.strokeRect(20, 20, 460, 585);
        ctx.strokeRect(30, 30, 440, 565);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#3E2723';
        ctx.font = '900 70px serif';
        ctx.fillText('WANTED', 250, 100);
        
        ctx.font = 'bold 35px serif';
        ctx.fillText('DEAD OR ALIVE', 250, 145);

        ctx.drawImage(avatar, 60, 160, 380, 310);
        aplicarTinteFast(ctx, 60, 160, 380, 310, '#8A6327', 0.25); 
        ctx.lineWidth = 8;
        ctx.strokeRect(60, 160, 380, 310);

        ctx.font = 'bold 40px serif';
        ctx.fillText(nombreElegido.toUpperCase(), 250, 520);
        
        ctx.fillStyle = '#B71C1C';
        ctx.font = '900 50px serif';
        ctx.fillText(`$ ${recompensa.toLocaleString()}`, 250, 580);

        buffer = await renderizarAsync(canvas);
      }

      // 🏴‍☠️ COMANDO 2: .onepiece
      else if (cmd === 'onepiece') {
        const canvas = createCanvas(500, 700);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#D6B881';
        ctx.fillRect(0, 0, 500, 700);

        ctx.lineWidth = 6;
        ctx.strokeStyle = '#4A3219';
        ctx.strokeRect(25, 25, 450, 650);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#4A3219';
        ctx.font = '900 80px serif';
        ctx.fillText('WANTED', 250, 115);

        ctx.drawImage(avatar, 40, 140, 420, 350);
        aplicarTinteFast(ctx, 40, 140, 420, 350, '#D6B881', 0.2); 
        ctx.lineWidth = 8;
        ctx.strokeRect(40, 140, 420, 350);

        ctx.font = '900 50px serif';
        ctx.fillText(nombreElegido.toUpperCase(), 250, 555);

        ctx.font = '900 55px serif';
        ctx.fillText(`฿ ${recompensa.toLocaleString()} -`, 250, 630);
        
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('MARINE', 250, 665);

        buffer = await renderizarAsync(canvas);
      }

      // 🚁 COMANDO 3: .gta
      else if (cmd === 'gta') {
        const canvas = createCanvas(500, 500);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(avatar, 0, 0, 500, 500);
        aplicarTinteFast(ctx, 0, 0, 500, 500, '#FF9800', 0.35);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 180, 500, 140);

        ctx.textAlign = 'center';
        
        ctx.fillStyle = '#000000';
        ctx.font = '900 45px sans-serif';
        ctx.fillText('MISSION PASSED!', 253, 243);
        ctx.font = 'bold 35px sans-serif';
        ctx.fillText('+ RESPECT', 253, 293);

        ctx.fillStyle = '#FFC107'; 
        ctx.font = '900 45px sans-serif';
        ctx.fillText('MISSION PASSED!', 250, 240);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 35px sans-serif';
        ctx.fillText('+ RESPECT', 250, 290);

        buffer = await renderizarAsync(canvas);
      }

      // 💀 COMANDO 4: .wasted
      else if (cmd === 'wasted') {
        const canvas = createCanvas(500, 500);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(avatar, 0, 0, 500, 500);
        aplicarTinteFast(ctx, 0, 0, 500, 500, '#000000', 0.5); 

        ctx.textAlign = 'center';
        
        ctx.fillStyle = '#000000';
        ctx.font = '900 75px sans-serif';
        ctx.fillText('W A S T E D', 253, 273);

        ctx.fillStyle = '#D32F2F'; 
        ctx.fillText('W A S T E D', 250, 270);

        buffer = await renderizarAsync(canvas);
      } else {
        return reply('❌ Comando no encontrado.');
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
