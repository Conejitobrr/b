'use strict';

const { createCanvas, loadImage } = require('canvas');

function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }

function getTarget(msg, args, sender) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return cleanJid(quoted) + '@s.whatsapp.net';
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return cleanJid(mentioned) + '@s.whatsapp.net';
  return cleanJid(sender) + '@s.whatsapp.net'; // Si no menciona a nadie, se lo hace a sí mismo
}

// 🎨 FUNCIONES DE DIBUJO 100% CÓDIGO (Sin imágenes externas)

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

// 1. FILTRO SEPIA O BLANCO Y NEGRO SEGURO
function aplicarTinte(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.globalCompositeOperation = 'color';
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

module.exports = {
  name: 'carteles',
  aliases: ['sebusca', 'onepiece', 'gta', 'wasted'],
  category: 'diversión',
  desc: 'Genera carteles y memes dinámicos con la foto de perfil',

  execute: async ({ sock, msg, remoteJid, sender, pushName, args, commandName, db, reply }) => {
    const cmd = commandName.toLowerCase();
    const target = getTarget(msg, args, sender);
    
    const loadMsg = await sock.sendMessage(remoteJid, { text: '🎨 _Generando obra de arte..._' }, { quoted: msg });

    try {
      // 🧠 OBTENER NOMBRE REAL
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

      // 🧠 OBTENER XP PARA RECOMPENSA
      let recompensa = 50000;
      if (db) {
        const uData = await db.getUser(target);
        if (uData && uData.xp) recompensa = Math.max(uData.xp * 10, 50000); // Multiplicamos su XP para que parezca una gran recompensa
      }
      
      const avatar = await getAvatar(sock, target);
      let buffer;

      // 🤠 COMANDO 1: .sebusca (Cartel Viejo Oeste)
      if (cmd === 'sebusca') {
        const canvas = createCanvas(800, 1000);
        const ctx = canvas.getContext('2d');

        // Fondo Pergamino
        ctx.fillStyle = '#E3CBA8';
        ctx.fillRect(0, 0, 800, 1000);
        
        // Bordes rústicos
        ctx.lineWidth = 15;
        ctx.strokeStyle = '#5E3A1A';
        ctx.strokeRect(30, 30, 740, 940);
        ctx.strokeRect(45, 45, 710, 910);

        // Textos Superiores
        ctx.textAlign = 'center';
        ctx.fillStyle = '#3E2723';
        ctx.font = '900 110px serif';
        ctx.fillText('WANTED', 400, 160);
        
        ctx.font = 'bold 50px serif';
        ctx.fillText('DEAD OR ALIVE', 400, 230);

        // Imagen de perfil
        ctx.drawImage(avatar, 100, 260, 600, 480);
        aplicarTinte(ctx, 100, 260, 600, 480, '#8A6327'); // Tinte Sepia
        ctx.lineWidth = 10;
        ctx.strokeRect(100, 260, 600, 480);

        // Datos del forajido
        ctx.font = 'bold 60px serif';
        ctx.fillText(nombreElegido.toUpperCase(), 400, 820);
        
        ctx.fillStyle = '#B71C1C';
        ctx.font = '900 80px serif';
        ctx.fillText(`$ ${recompensa.toLocaleString()}`, 400, 920);

        buffer = canvas.toBuffer('image/jpeg');
      }

      // 🏴‍☠️ COMANDO 2: .onepiece (Cartel Anime)
      if (cmd === 'onepiece') {
        const canvas = createCanvas(750, 1050);
        const ctx = canvas.getContext('2d');

        // Fondo Papel
        ctx.fillStyle = '#D6B881';
        ctx.fillRect(0, 0, 750, 1050);

        // Marco interno
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#4A3219';
        ctx.strokeRect(40, 40, 670, 970);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#4A3219';
        ctx.font = '900 120px serif';
        ctx.fillText('WANTED', 375, 170);

        // Foto del Pirata
        ctx.drawImage(avatar, 60, 210, 630, 520);
        aplicarTinte(ctx, 60, 210, 630, 520, '#D6B881'); // Tinte cálido suave
        ctx.lineWidth = 10;
        ctx.strokeRect(60, 210, 630, 520);

        // Nombre
        ctx.font = '900 75px serif';
        ctx.fillText(nombreElegido.toUpperCase(), 375, 830);

        // Recompensa en Berries
        ctx.font = '900 85px serif';
        ctx.fillText(`฿ ${recompensa.toLocaleString()} -`, 375, 950);
        
        ctx.font = 'bold 25px sans-serif';
        ctx.fillText('MARINE', 375, 1000);

        buffer = canvas.toBuffer('image/jpeg');
      }

      // 🚁 COMANDO 3: .gta (Mission Passed)
      if (cmd === 'gta') {
        const canvas = createCanvas(800, 800);
        const ctx = canvas.getContext('2d');

        // Imagen cubriendo todo
        ctx.drawImage(avatar, 0, 0, 800, 800);
        
        // Filtro anaranjado GTA San Andreas
        aplicarTinte(ctx, 0, 0, 800, 800, '#FF9800');
        
        // Sombra oscura al centro
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 300, 800, 200);

        // Textos
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 10;
        
        ctx.fillStyle = '#FFC107'; // Amarillo GTA
        ctx.font = '900 70px sans-serif';
        ctx.fillText('MISSION PASSED!', 400, 400);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 50px sans-serif';
        ctx.fillText('+ RESPECT', 400, 460);

        buffer = canvas.toBuffer('image/jpeg');
      }

      // 💀 COMANDO 4: .wasted (Muerte GTA V)
      if (cmd === 'wasted') {
        const canvas = createCanvas(800, 800);
        const ctx = canvas.getContext('2d');

        // Imagen
        ctx.drawImage(avatar, 0, 0, 800, 800);
        
        // Filtro Blanco y Negro + Oscurecimiento
        aplicarTinte(ctx, 0, 0, 800, 800, '#FFFFFF'); // Desatura
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; // Oscurece el entorno
        ctx.fillRect(0, 0, 800, 800);

        // Letras Rojas WASTED
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 15;
        
        ctx.fillStyle = '#D32F2F'; // Rojo Oscuro
        ctx.font = '900 120px sans-serif';
        ctx.fillText('W A S T E D', 400, 430);

        buffer = canvas.toBuffer('image/jpeg');
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
      return reply('❌ Ocurrió un error al intentar generar la imagen.');
    }
  }
};
