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

function aplicarTinte(ctx, x, y, w, h, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

module.exports = {
  name: 'carteles',
  aliases: ['sebusca', 'onepiece', 'gta', 'wasted'],
  category: 'diversión',
  desc: 'Genera carteles dinámicos con foto de perfil',

  execute: async ({ sock, msg, remoteJid, sender, pushName, args, commandName, db, reply }) => {
    const cmd = commandName.toLowerCase();
    const target = getTarget(msg, args, sender);
    
    const loadMsg = await sock.sendMessage(remoteJid, { text: '🎨 _Generando edición gráfica..._' }, { quoted: msg });

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

      // 2. OBTENER XP (Recompensa)
      let recompensa = 50000;
      if (db) {
        const uData = await db.getUser(target);
        if (uData && uData.xp) recompensa = Math.max(uData.xp * 10, 50000);
      }

      // 3. OBTENER FOTO DE PERFIL (Mismo método ultra-estable de cartas.js)
      let pfpUrl = null;
      try {
        pfpUrl = await sock.profilePictureUrl(target, 'image');
      } catch {}

      let avatar;
      try {
        if (pfpUrl) {
          avatar = await loadImage(pfpUrl);
        } else {
          throw new Error("No URL");
        }
      } catch {
        const fallback = createCanvas(400, 400);
        const ctxFallback = fallback.getContext('2d');
        ctxFallback.fillStyle = '#2b2b2b';
        ctxFallback.fillRect(0, 0, 400, 400);
        ctxFallback.fillStyle = '#FFFFFF';
        ctxFallback.font = 'bold 150px sans-serif';
        ctxFallback.textAlign = 'center';
        ctxFallback.fillText('?', 200, 250);
        avatar = fallback;
      }

      let buffer;

      // 🤠 COMANDO 1: .sebusca
      if (cmd === 'sebusca') {
        const canvas = createCanvas(600, 750);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#E3CBA8';
        ctx.fillRect(0, 0, 600, 750);

        ctx.lineWidth = 12;
        ctx.strokeStyle = '#5E3A1A';
        ctx.strokeRect(20, 20, 560, 710);
        ctx.strokeRect(30, 30, 540, 690);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#3E2723';
        ctx.font = '900 80px serif';
        ctx.fillText('WANTED', 300, 120);

        ctx.font = 'bold 40px serif';
        ctx.fillText('DEAD OR ALIVE', 300, 175);

        ctx.drawImage(avatar, 75, 200, 450, 360);
        aplicarTinte(ctx, 75, 200, 450, 360, '#8A6327', 0.25);
        ctx.lineWidth = 8;
        ctx.strokeRect(75, 200, 450, 360);

        ctx.font = 'bold 45px serif';
        ctx.fillText(nombreElegido.toUpperCase(), 300, 620);

        ctx.fillStyle = '#B71C1C';
        ctx.font = '900 60px serif';
        ctx.fillText(`$ ${recompensa.toLocaleString()}`, 300, 690);

        // Sin funciones raras, directo al buffer
        buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
      }

      // 🏴‍☠️ COMANDO 2: .onepiece
      else if (cmd === 'onepiece') {
        const canvas = createCanvas(600, 840);
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#D6B881';
        ctx.fillRect(0, 0, 600, 840);

        ctx.lineWidth = 6;
        ctx.strokeStyle = '#4A3219';
        ctx.strokeRect(30, 30, 540, 780);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#4A3219';
        ctx.font = '900 95px serif';
        ctx.fillText('WANTED', 300, 140);

        ctx.drawImage(avatar, 50, 170, 500, 410);
        aplicarTinte(ctx, 50, 170, 500, 410, '#D6B881', 0.2);
        ctx.lineWidth = 8;
        ctx.strokeRect(50, 170, 500, 410);

        ctx.font = '900 60px serif';
        ctx.fillText(nombreElegido.toUpperCase(), 300, 660);

        ctx.font = '900 65px serif';
        ctx.fillText(`฿ ${recompensa.toLocaleString()} -`, 300, 755);

        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('MARINE', 300, 800);

        buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
      }

      // 🚁 COMANDO 3: .gta
      else if (cmd === 'gta') {
        const canvas = createCanvas(600, 600);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(avatar, 0, 0, 600, 600);
        aplicarTinte(ctx, 0, 0, 600, 600, '#FF9800', 0.35);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 220, 600, 160);

        ctx.textAlign = 'center';

        ctx.fillStyle = '#000000';
        ctx.font = '900 55px sans-serif';
        ctx.fillText('MISSION PASSED!', 303, 293);
        ctx.font = 'bold 40px sans-serif';
        ctx.fillText('+ RESPECT', 303, 353);

        ctx.fillStyle = '#FFC107';
        ctx.font = '900 55px sans-serif';
        ctx.fillText('MISSION PASSED!', 300, 290);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 40px sans-serif';
        ctx.fillText('+ RESPECT', 300, 350);

        buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
      }

      // 💀 COMANDO 4: .wasted
      else if (cmd === 'wasted') {
        const canvas = createCanvas(600, 600);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(avatar, 0, 0, 600, 600);
        aplicarTinte(ctx, 0, 0, 600, 600, '#000000', 0.5);

        ctx.textAlign = 'center';

        ctx.fillStyle = '#000000';
        ctx.font = '900 90px sans-serif';
        ctx.fillText('W A S T E D', 303, 323);

        ctx.fillStyle = '#D32F2F';
        ctx.fillText('W A S T E D', 300, 320);

        buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
      } else {
        return reply('❌ Comando no encontrado.');
      }

      // 4. ENVIAR RESULTADO
      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      
      const menciones = (target !== sender) ? [target] : [];
      await sock.sendMessage(remoteJid, { 
        image: buffer, 
        caption: `📸 Edición generada para 👤 *${nombreElegido}*`,
        mentions: menciones
      }, { quoted: msg });

    } catch (err) {
      console.log('Error en carteles:', err);
      return reply('❌ Ocurrió un error al dibujar el lienzo.');
    }
  }
};
