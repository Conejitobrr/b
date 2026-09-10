'use strict';

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// --- RUTAS LOCALES ---
const INV_PATH = path.join(process.cwd(), 'lib', 'inventario.json');
const CARTAS_PATH = path.join(process.cwd(), 'lib', 'cartas.json');
if (!fs.existsSync(path.dirname(CARTAS_PATH))) fs.mkdirSync(path.dirname(CARTAS_PATH), { recursive: true });

function getInv() { try { return JSON.parse(fs.readFileSync(INV_PATH, 'utf8')); } catch { return {}; } }
function saveInv(data) { fs.writeFileSync(INV_PATH, JSON.stringify(data, null, 2)); }
function getCartas() { try { return JSON.parse(fs.readFileSync(CARTAS_PATH, 'utf8')); } catch { return {}; } }
function saveCartas(data) { fs.writeFileSync(CARTAS_PATH, JSON.stringify(data, null, 2)); }

global.tradeRequests = global.tradeRequests || {};

function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }

function getTarget(msg, args, sender) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return cleanJid(quoted) + '@s.whatsapp.net';
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return cleanJid(mentioned) + '@s.whatsapp.net';
  return null;
}

// 🎲 MOTOR DE TIPOS Y ESTADÍSTICAS
const TIPOS = [
  { nombre: 'Fuego', bg: '#E53935', emoji: '🔥' },
  { nombre: 'Agua', bg: '#1E88E5', emoji: '💧' },
  { nombre: 'Planta', bg: '#43A047', emoji: '🌿' },
  { nombre: 'Rayo', bg: '#FDD835', emoji: '⚡' },
  { nombre: 'Oscuro', bg: '#424242', emoji: '🌑' },
  { nombre: 'Psíquico', bg: '#8E24AA', emoji: '👁️' }
];

function generarCarta() {
  const rand = Math.random() * 100;
  const tipo = TIPOS[Math.floor(Math.random() * TIPOS.length)];
  let rareza, atk, hp, valor, isFullArt = false;

  if (rand < 0.5) { 
    rareza = 'MÍTICA ex'; hp = Math.floor(Math.random() * 50) + 250; atk = Math.floor(Math.random() * 100) + 200; valor = 50000; isFullArt = true;
  } else if (rand < 4) { 
    rareza = 'LEGENDARIA V'; hp = Math.floor(Math.random() * 50) + 180; atk = Math.floor(Math.random() * 50) + 120; valor = 15000; isFullArt = true;
  } else if (rand < 15) { 
    rareza = 'ÉPICA'; hp = Math.floor(Math.random() * 40) + 120; atk = Math.floor(Math.random() * 40) + 80; valor = 3500;
  } else if (rand < 40) { 
    rareza = 'RARA'; hp = Math.floor(Math.random() * 30) + 80; atk = Math.floor(Math.random() * 30) + 50; valor = 800;
  } else { 
    rareza = 'COMÚN'; hp = Math.floor(Math.random() * 20) + 40; atk = Math.floor(Math.random() * 20) + 20; valor = 300;
  }
  return { rareza, tipo, atk, hp, valor, isFullArt };
}

// ✨ BRILLO HOLOGRÁFICO POKÉMON (Arcoíris Metálico)
function drawSilverFoil(ctx, x, y, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = 'color-dodge';
  
  // Gradiente arcoíris suave y brillante
  const holo = ctx.createLinearGradient(x, y, x + w, y + h);
  holo.addColorStop(0, 'rgba(255, 150, 150, 0.4)');
  holo.addColorStop(0.3, 'rgba(255, 255, 150, 0.6)'); // Dorado
  holo.addColorStop(0.5, 'rgba(150, 255, 255, 0.7)'); // Cyan
  holo.addColorStop(0.7, 'rgba(200, 150, 255, 0.5)'); // Morado
  holo.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = holo;
  ctx.fillRect(x, y, w, h);
  
  // Textura diagonal holográfica
  ctx.globalAlpha = 0.4;
  for(let i = 0; i < w + h; i += 30) {
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x, y + i);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Estrellas brillantes
  ctx.globalAlpha = 0.9;
  ctx.shadowColor = '#FFFFFF';
  ctx.shadowBlur = 12;
  for(let i = 0; i < 25; i++) {
    const sx = x + Math.random() * w;
    const sy = y + Math.random() * h;
    const size = Math.random() * 3 + 1;
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  }
  ctx.restore();
}

// 🎨 CREADOR VISUAL (CANVAS)
async function dibujarCartaPokemon(pfpUrl, renderName, stats) {
  const width = 740;
  const height = 1040;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  if (renderName.length > 15) renderName = renderName.substring(0, 15) + '...';

  // CARGAR IMAGEN (Con Fallback sin enlaces externos)
  let avatar;
  try {
    if (pfpUrl) {
      avatar = await loadImage(pfpUrl);
    } else {
      throw new Error("No URL");
    }
  } catch {
    const fallback = createCanvas(400, 400);
    const fbCtx = fallback.getContext('2d');
    fbCtx.fillStyle = '#2b2b2b';
    fbCtx.fillRect(0, 0, 400, 400);
    fbCtx.fillStyle = '#FFFFFF';
    fbCtx.font = 'bold 150px sans-serif';
    fbCtx.textAlign = 'center';
    fbCtx.fillText('?', 200, 250);
    avatar = fallback;
  }

  if (stats.isFullArt) {
    // 🌟 ESTILO FULL ART HOLO (Legendarias y Míticas)
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);
    
    ctx.drawImage(avatar, 20, 20, width - 40, height - 40);
    drawSilverFoil(ctx, 20, 20, width - 40, height - 40); // ✨ Magia Holo aquí

    const topShadow = ctx.createLinearGradient(0, 0, 0, 250);
    topShadow.addColorStop(0, 'rgba(0,0,0,0.85)');
    topShadow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topShadow;
    ctx.fillRect(20, 20, width - 40, 250);

    const bottomShadow = ctx.createLinearGradient(0, height - 400, 0, height);
    bottomShadow.addColorStop(0, 'rgba(0,0,0,0)');
    bottomShadow.addColorStop(1, 'rgba(0,0,0,0.95)');
    ctx.fillStyle = bottomShadow;
    ctx.fillRect(20, height - 400, width - 40, 400);

    ctx.shadowColor = '#000';
    ctx.shadowBlur = 10;
    
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'italic 900 65px sans-serif';
    ctx.fillText(renderName, 40, 100);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 50px sans-serif';
    ctx.fillText(`HP ${stats.hp}`, width - 100, 100);
    ctx.fillText(stats.tipo.emoji, width - 40, 100);

    ctx.textAlign = 'left';
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(40, height - 320, width - 80, 200);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.strokeRect(40, height - 320, width - 80, 200);

    ctx.shadowColor = '#000';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 45px sans-serif';
    ctx.fillText(`${stats.tipo.emoji} Golpe Cataclísmico`, 60, height - 250);
    
    ctx.textAlign = 'right';
    ctx.font = 'bold 60px sans-serif';
    ctx.fillText(`${stats.atk}`, width - 60, height - 250);
    
    ctx.textAlign = 'left';
    ctx.font = '24px sans-serif';
    ctx.fillText(`Rareza: ${stats.rareza} | Valor: ${stats.valor} XP`, 60, height - 170);

  } else {
    // 💛 ESTILO CLÁSICO (Bordes Variables)
    let borderColor = '#F5D63D'; // Rara (Amarillo)
    if (stats.rareza === 'COMÚN') borderColor = '#B0BEC5'; // Plateado/Gris
    if (stats.rareza === 'ÉPICA') borderColor = '#9C27B0'; // Morado Épico

    ctx.fillStyle = borderColor; 
    ctx.fillRect(0, 0, width, height);

    const bgElement = ctx.createLinearGradient(0, 0, 0, height);
    bgElement.addColorStop(0, stats.tipo.bg);
    bgElement.addColorStop(1, '#111');
    ctx.fillStyle = bgElement;
    ctx.fillRect(25, 25, width - 50, height - 50);

    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.font = 'bold 50px sans-serif';
    ctx.fillText(renderName, 50, 95);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#FF3B30';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(`${stats.hp} HP`, width - 90, 95);
    ctx.fillText(stats.tipo.emoji, width - 40, 95);

    ctx.fillStyle = '#B0B0B0';
    ctx.fillRect(55, 135, 630, 420);
    ctx.drawImage(avatar, 60, 140, 620, 410);

    // ✨ ¡Efecto Holográfico Exclusivo para cartas Épicas!
    if (stats.rareza === 'ÉPICA') {
      drawSilverFoil(ctx, 60, 140, 620, 410);
    }

    ctx.lineWidth = 8;
    ctx.strokeStyle = (stats.rareza === 'ÉPICA') ? '#FFD700' : '#444444'; 
    ctx.strokeRect(60, 140, 620, 410);

    ctx.fillStyle = (stats.rareza === 'ÉPICA') ? '#D4AF37' : '#9E9E9E';
    ctx.fillRect(60, 565, 620, 30);
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.font = 'bold italic 18px sans-serif';
    ctx.fillText(`BÁSICO • Tipo ${stats.tipo.nombre} • SiriusBot TCG`, width / 2, 587);

    ctx.fillStyle = '#F8F8F8';
    ctx.fillRect(45, 615, 650, 290);
    
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.font = 'bold 45px sans-serif';
    ctx.fillText(`${stats.tipo.emoji} Golpe Base`, 65, 695);
    
    ctx.textAlign = 'right';
    ctx.font = 'bold 60px sans-serif';
    ctx.fillText(`${stats.atk}`, width - 65, 695);

    ctx.textAlign = 'left';
    ctx.font = '26px sans-serif';
    ctx.fillStyle = '#444';
    ctx.fillText(`Este ataque causa ${stats.atk} puntos de daño al rival.`, 65, 755);
    ctx.fillText(`Rareza: ${stats.rareza} | Valor: ${stats.valor} XP`, 65, 810);

    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('DEBILIDAD', 90, 950);
    ctx.textAlign = 'center';
    ctx.fillText('RESISTENCIA', width / 2, 950);
    ctx.textAlign = 'right';
    ctx.fillText('RETIRADA', width - 90, 950);
    
    ctx.font = '26px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('💧 x2', 90, 985);
    ctx.textAlign = 'right';
    ctx.fillText('⚪ ⚪', width - 90, 985);
  }

  return canvas.toBuffer('image/jpeg', { quality: 0.95 });
}

module.exports = {
  name: 'cartas',
  aliases: ['abrirsobre', 'miscartas', 'vendercarta', 'vendertodas', 'duelocarta', 'intercambiar', 'aceptar'],
  category: 'juegos',
  desc: 'Colección de cartas TCG, peleas y mercado',

  // 🔴 ¡Ojo aquí! Añadimos pushName directamente a los parámetros ejecutables
  execute: async ({ sock, msg, remoteJid, sender, pushName, args, commandName, db, reply }) => {
    const cmd = commandName.toLowerCase();
    const dbCartas = getCartas();
    if (!dbCartas[sender]) dbCartas[sender] = [];
    let misCartas = dbCartas[sender];

    // 📦 ABRIR UN SOBRE
    if (cmd === 'abrirsobre') {
      const dbInv = getInv();
      if (!dbInv[sender] || (dbInv[sender].sobre || 0) <= 0) {
        return reply('❌ No tienes Sobres Gacha. Cómpralos en la tienda con *.tienda sobre 1*');
      }

      dbInv[sender].sobre -= 1;
      saveInv(dbInv);

      const loadMsg = await sock.sendMessage(remoteJid, { text: '✨ _Abriendo sobre mágico..._' }, { quoted: msg });

      try {
        const groupMetadata = await sock.groupMetadata(remoteJid);
        const participants = groupMetadata.participants;
        const randomParticipant = participants[Math.floor(Math.random() * participants.length)];
        const jidElegido = randomParticipant.id;

        // 🧠 EXTRACCIÓN DE NICKNAME EXACTO TIPO RANK.JS
        let nombreElegido = cleanNumber(jidElegido);
        
        // Si el bot te eligió a ti mismo, usamos pushName directo
        if (jidElegido === sender && pushName) {
            nombreElegido = pushName;
        } else {
            // Si eligió a otro, lo buscamos en el caché o en tu BD
            try {
                if (sock.store && sock.store.contacts && sock.store.contacts[jidElegido]) {
                    const c = sock.store.contacts[jidElegido];
                    nombreElegido = c.pushName || c.name || c.notify || nombreElegido;
                }
                if (/^\d+$/.test(nombreElegido) && db) {
                    const uData = await db.getUser(jidElegido);
                    if (uData && uData.name) nombreElegido = uData.name;
                }
            } catch (e) {}
        }

        // Si después de todo sigue siendo un número crudo, usamos "User XXXX"
        if (/^\d+$/.test(nombreElegido)) {
            nombreElegido = `User ${nombreElegido.slice(-4)}`;
        }

        let pfpUrl = null;
        try { pfpUrl = await sock.profilePictureUrl(jidElegido, 'image'); } catch {}

        const stats = generarCarta();

        // 💾 GUARDAMOS EL NOMBRE EN TEXTO (Ej: "Sirius")
        const nuevaCarta = { 
            nombreReal: nombreElegido, 
            jid: jidElegido, 
            rareza: stats.rareza, 
            tipo: stats.tipo.nombre, 
            atk: stats.atk, 
            hp: stats.hp, 
            valor: stats.valor 
        };
        misCartas.push(nuevaCarta);
        saveCartas(dbCartas);

        // Dibuja el Canvas usando el nombre real de texto
        const buffer = await dibujarCartaPokemon(pfpUrl, nombreElegido, stats);
        
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        
        // El bot imprimirá el texto puro (Ej: 👤 Sirius), igual que rank.js
        await sock.sendMessage(remoteJid, { 
          image: buffer, 
          caption: `🎉 ¡Felicidades! Has obtenido la carta de 👤 *${nombreElegido}*\n🌟 Rareza: *${stats.rareza}*\n\n🎒 Usa *.miscartas* para ver tu álbum.`
        }, { quoted: msg });

      } catch (err) {
        console.log(err);
        return reply('❌ Error al generar la carta.');
      }
    }

    // 🎒 VER INVENTARIO (Texto puro como rank.js)
    if (cmd === 'miscartas') {
      if (misCartas.length === 0) return reply('🎒 Tu álbum está vacío. Compra sobres con *.tienda sobre 1*');
      
      let txt = `🎒 *TU ÁLBUM POKÉMON* 🎒\n\n`;

      misCartas.forEach((carta, index) => {
        // Se imprimirá exactamente el texto, ej: "👤 EVE J" o "👤 Sirius"
        txt += `*[ ${index + 1} ]* ✦ ${carta.rareza} | 👤 ${carta.nombreReal || 'Usuario'}\n⚔️ ATK: ${carta.atk} | 💖 HP: ${carta.hp} | 💎 ${carta.valor} XP\n\n`;
      });
      
      txt += `💸 *Vender:* .vendercarta [número] | .vendertodas\n⚔️ *Pelear:* .duelocarta [tu_numero] @usuario\n🤝 *Intercambio:* .intercambiar @usuario [tu_num] [su_num]`;
      
      return sock.sendMessage(remoteJid, { text: txt }, { quoted: msg });
    }

    // 💸 VENDER UNA SOLA CARTA
    if (cmd === 'vendercarta') {
      const index = parseInt(args[0]) - 1;
      if (isNaN(index) || index < 0 || index >= misCartas.length) return reply('❌ Indica el número de la carta (Ej: .vendercarta 1)');

      const ganancia = misCartas[index].valor;
      misCartas.splice(index, 1);
      saveCartas(dbCartas);

      const userData = await db.getUser(sender);
      userData.xp = (userData.xp || 0) + ganancia;
      if (userData.save) await userData.save();

      return reply(`✅ Carta vendida a la tienda por *${ganancia} XP*.`);
    }

    // 💰 VENDER TODAS LAS CARTAS DE GOLPE
    if (cmd === 'vendertodas') {
      if (misCartas.length === 0) return reply('❌ No tienes cartas para vender.');

      let gananciaTotal = misCartas.reduce((acc, carta) => acc + carta.valor, 0);
      let cantidad = misCartas.length;
      
      dbCartas[sender] = []; // Vaciamos la mochila
      saveCartas(dbCartas);

      const userData = await db.getUser(sender);
      userData.xp = (userData.xp || 0) + gananciaTotal;
      if (userData.save) await userData.save();

      return reply(`✅ Has vaciado tu álbum.\nVendiste *${cantidad} cartas* por un total de *${gananciaTotal} XP*.`);
    }

    // 🤝 SISTEMA DE INTERCAMBIO (TRADING)
    if (cmd === 'intercambiar') {
      const target = getTarget(msg, args, sender);
      const miNum = parseInt(args[1]) - 1;
      const suNum = parseInt(args[2]) - 1;

      if (!target || isNaN(miNum) || isNaN(suNum)) return reply('❌ Uso correcto:\n*.intercambiar @usuario [Tu_Carta] [Su_Carta]*');
      if (target === sender) return reply('❌ No puedes intercambiar contigo mismo.');

      if (!dbCartas[sender] || !dbCartas[sender][miNum]) return reply('❌ No posees la carta que ofreces.');
      if (!dbCartas[target] || !dbCartas[target][suNum]) return reply('❌ El rival no posee esa carta.');

      const miCarta = dbCartas[sender][miNum];
      const suCarta = dbCartas[target][suNum];

      global.tradeRequests[target] = { from: sender, miNum, suNum };

      return sock.sendMessage(remoteJid, { 
        text: `⚖️ *SOLICITUD DE INTERCAMBIO* ⚖️\n\n👤 *${pushName}* ofrece la carta de 👤 ${miCarta.nombreReal} [${miCarta.rareza}]\nA cambio de la carta de 👤 ${suCarta.nombreReal} [${suCarta.rareza}].\n\n@${cleanNumber(target)}, escribe *.aceptar* para confirmar.`, 
        mentions: [target] 
      });
    }

    // ✅ ACEPTAR INTERCAMBIO
    if (cmd === 'aceptar') {
      const trade = global.tradeRequests[sender];
      if (!trade) return reply('❌ No tienes ninguna solicitud pendiente.');

      const { from, miNum, suNum } = trade;
      const cartaDelIniciador = dbCartas[from].splice(miNum, 1)[0];
      const cartaMia = dbCartas[sender].splice(suNum, 1)[0];

      dbCartas[from].push(cartaMia);
      dbCartas[sender].push(cartaDelIniciador);
      saveCartas(dbCartas);
      delete global.tradeRequests[sender];

      return sock.sendMessage(remoteJid, { text: `🤝 *¡INTERCAMBIO EXITOSO!*`, mentions: [sender, from] });
    }

    // ⚔️ DUELO DE CARTAS POKÉMON
    if (cmd === 'duelocarta') {
      const index = parseInt(args[0]) - 1;
      const target = getTarget(msg, args.slice(1), sender);

      if (isNaN(index) || !target) return reply('❌ Uso:\n*.duelocarta [tu_numero] @usuario*');
      if (!dbCartas[target] || dbCartas[target].length === 0) return reply('❌ Tu rival no tiene cartas para defenderse.');

      const miCarta = misCartas[index];
      const cartaRival = dbCartas[target][Math.floor(Math.random() * dbCartas[target].length)];

      const miPoder = miCarta.atk + Math.floor(Math.random() * 50);
      const poderEnemigo = cartaRival.hp + Math.floor(Math.random() * 50);

      let txt = `⚔️ *BATALLA POKÉMON* ⚔️\n\n🔥 👤 *${pushName}* usa la carta de 👤 *${miCarta.nombreReal}* (Daño: ${miPoder})\n🛡️ *@${cleanNumber(target)}* defiende con la carta de 👤 *${cartaRival.nombreReal}* (Defensa: ${poderEnemigo})\n\n`;

      if (miPoder > poderEnemigo) {
        const botin = Math.floor(Math.random() * 800) + 200;
        const myData = await db.getUser(sender);
        const targetData = await db.getUser(target);
        
        targetData.xp = Math.max(0, (targetData.xp || 0) - botin);
        myData.xp = (myData.xp || 0) + botin;
        if (myData.save) await myData.save();
        if (targetData.save) await targetData.save();
        txt += `💥 *¡Un golpe crítico!* Le robaste *${botin} XP*.`;
      } else {
        txt += `🧱 *¡No es muy efectivo!* La defensa del rival resistió tu ataque.`;
      }
      return sock.sendMessage(remoteJid, { text: txt, mentions: [target] }, { quoted: msg });
    }
  }
};
