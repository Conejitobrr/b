'use strict';

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// --- RUTAS DE BASE DE DATOS LOCAL ---
const INV_PATH = path.join(process.cwd(), 'lib', 'inventario.json');
const CARTAS_PATH = path.join(process.cwd(), 'lib', 'cartas.json');
if (!fs.existsSync(path.dirname(CARTAS_PATH))) fs.mkdirSync(path.dirname(CARTAS_PATH), { recursive: true });

function getInv() { try { return JSON.parse(fs.readFileSync(INV_PATH, 'utf8')); } catch { return {}; } }
function saveInv(data) { fs.writeFileSync(INV_PATH, JSON.stringify(data, null, 2)); }
function getCartas() { try { return JSON.parse(fs.readFileSync(CARTAS_PATH, 'utf8')); } catch { return {}; } }
function saveCartas(data) { fs.writeFileSync(CARTAS_PATH, JSON.stringify(data, null, 2)); }

// Memoria temporal para intercambios
global.tradeRequests = global.tradeRequests || {};

// --- UTILIDADES ---
function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }

function getTarget(msg, args) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return cleanJid(quoted) + '@s.whatsapp.net';
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return cleanJid(mentioned) + '@s.whatsapp.net';
  return null;
}

// 🎲 MOTOR DE RAREZAS, TIPOS Y ESTADÍSTICAS
const TIPOS = [
  { nombre: 'Fuego', color: '#E53935', emoji: '🔥' },
  { nombre: 'Agua', color: '#1E88E5', emoji: '💧' },
  { nombre: 'Planta', color: '#43A047', emoji: '🌿' },
  { nombre: 'Rayo', color: '#FDD835', emoji: '⚡' },
  { nombre: 'Oscuro', color: '#424242', emoji: '🌑' },
  { nombre: 'Psíquico', color: '#8E24AA', emoji: '👁️' }
];

function generarCarta() {
  const rand = Math.random() * 100;
  const tipo = TIPOS[Math.floor(Math.random() * TIPOS.length)];
  let rareza, atk, hp, valor, isFullArt = false;

  if (rand < 0.5) { // 0.5%
    rareza = 'MÍTICA ex'; hp = Math.floor(Math.random() * 50) + 250; atk = Math.floor(Math.random() * 100) + 200; valor = 50000; isFullArt = true;
  } else if (rand < 4) { // 3.5%
    rareza = 'LEGENDARIA V'; hp = Math.floor(Math.random() * 50) + 180; atk = Math.floor(Math.random() * 50) + 120; valor = 15000; isFullArt = true;
  } else if (rand < 15) { // 11%
    rareza = 'ÉPICA'; hp = Math.floor(Math.random() * 40) + 120; atk = Math.floor(Math.random() * 40) + 80; valor = 3500;
  } else if (rand < 40) { // 25%
    rareza = 'RARA'; hp = Math.floor(Math.random() * 30) + 80; atk = Math.floor(Math.random() * 30) + 50; valor = 800;
  } else { // 60%
    rareza = 'COMÚN'; hp = Math.floor(Math.random() * 20) + 40; atk = Math.floor(Math.random() * 20) + 20; valor = 300;
  }

  return { rareza, tipo, atk, hp, valor, isFullArt };
}

// 🎨 CREADOR VISUAL DE LA CARTA (ESTILO POKÉMON ABSOLUTO)
async function dibujarCartaPokemon(pfpUrl, nombre, stats) {
  const width = 740;
  const height = 1040;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  let avatar;
  try {
    avatar = await loadImage(pfpUrl);
  } catch {
    const fallback = createCanvas(400, 400);
    const fbCtx = fallback.getContext('2d');
    fbCtx.fillStyle = '#666';
    fbCtx.fillRect(0, 0, 400, 400);
    avatar = fallback;
  }

  const shortName = nombre.length > 14 ? nombre.substring(0, 14) + '...' : nombre;

  if (stats.isFullArt) {
    // 🌟 ESTILO FULL ART (Mew EX / Legendarias)
    // Borde holográfico plateado/oscuro
    ctx.fillStyle = '#b5b8c2';
    ctx.fillRect(0, 0, width, height);
    
    // Imagen cubriendo toda la carta por dentro del borde
    ctx.drawImage(avatar, 25, 25, width - 50, height - 50);

    // Efecto holográfico arcoíris translúcido sobre la imagen
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    const holo = ctx.createLinearGradient(0, 0, width, height);
    holo.addColorStop(0, 'rgba(255, 0, 0, 0.4)');
    holo.addColorStop(0.3, 'rgba(255, 255, 0, 0.4)');
    holo.addColorStop(0.6, 'rgba(0, 255, 255, 0.4)');
    holo.addColorStop(1, 'rgba(255, 0, 255, 0.4)');
    ctx.fillStyle = holo;
    ctx.fillRect(25, 25, width - 50, height - 50);
    ctx.restore();

    // Sombra oscura arriba y abajo para que el texto resalte
    const topShadow = ctx.createLinearGradient(0, 0, 0, 250);
    topShadow.addColorStop(0, 'rgba(0,0,0,0.8)');
    topShadow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topShadow;
    ctx.fillRect(25, 25, width - 50, 250);

    const bottomShadow = ctx.createLinearGradient(0, height - 400, 0, height);
    bottomShadow.addColorStop(0, 'rgba(0,0,0,0)');
    bottomShadow.addColorStop(1, 'rgba(0,0,0,0.9)');
    ctx.fillStyle = bottomShadow;
    ctx.fillRect(25, height - 400, width - 50, 400);

    // Textos Full Art
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(`✦ ${stats.rareza} ✦`, 40, 70);

    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 10;
    ctx.font = '900 65px sans-serif';
    ctx.fillText(shortName, 40, 130);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#FF2D55';
    ctx.fillText(`HP ${stats.hp} ${stats.tipo.emoji}`, width - 40, 130);

    // Caja de ataques translúcida
    ctx.textAlign = 'left';
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(40, height - 320, width - 80, 200);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.strokeRect(40, height - 320, width - 80, 200);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(`⚔️ Destrucción Masiva`, 60, height - 250);
    ctx.textAlign = 'right';
    ctx.font = 'bold 50px sans-serif';
    ctx.fillText(`${stats.atk}`, width - 60, height - 250);
    
    ctx.textAlign = 'left';
    ctx.font = '25px sans-serif';
    ctx.fillText(`Valor en el mercado: ${stats.valor} XP`, 60, height - 150);

  } else {
    // 💛 ESTILO CLÁSICO (Cartas Comunes, Raras y Épicas)
    // Borde amarillo Pokémon clásico
    ctx.fillStyle = '#F5D13B'; 
    ctx.fillRect(0, 0, width, height);

    // Fondo según el tipo
    ctx.fillStyle = stats.tipo.color;
    ctx.fillRect(30, 30, width - 60, height - 60);

    // Header Textos
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`BÁSICO   |   Rareza: ${stats.rareza}`, 40, 70);

    ctx.font = 'bold 55px sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 5;
    ctx.fillText(shortName, 40, 130);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`HP ${stats.hp} ${stats.tipo.emoji}`, width - 40, 130);

    // Marco de la imagen
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#E0E0E0';
    ctx.fillRect(50, 150, width - 100, 460); // Fondo gris
    ctx.drawImage(avatar, 60, 160, width - 120, 440); // Imagen
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#B8A038'; // Borde dorado opaco interno
    ctx.strokeRect(60, 160, width - 120, 440);

    // Franja de info bajo la imagen
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(60, 610, width - 120, 30);
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.font = 'italic 18px sans-serif';
    ctx.fillText(`Tipo ${stats.tipo.nombre} • SiriusBot TCG`, width / 2, 632);

    // Caja de ataques
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.9;
    ctx.fillRect(40, 680, width - 80, 200);
    ctx.globalAlpha = 1.0;

    // Ataque Principal
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 45px sans-serif';
    ctx.fillText(`${stats.tipo.emoji} Golpe Base`, 60, 760);
    ctx.textAlign = 'right';
    ctx.font = 'bold 55px sans-serif';
    ctx.fillText(`${stats.atk}`, width - 60, 760);

    // Descripcion del ataque
    ctx.textAlign = 'left';
    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#333333';
    ctx.fillText(`Este ataque hace ${stats.atk} de daño al rival.`, 60, 815);
    ctx.fillText(`Valor en XP: ${stats.valor} 🪙`, 60, 855);

    // Footer (Debilidades)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '22px sans-serif';
    ctx.fillText('Debilidad: x2', 60, 950);
    ctx.textAlign = 'right';
    ctx.fillText('Retirada: 🪙🪙', width - 60, 950);
  }

  return canvas.toBuffer('image/jpeg', { quality: 0.95 });
}

module.exports = {
  name: 'cartas',
  aliases: ['abrirsobre', 'miscartas', 'vendercarta', 'duelocarta', 'intercambiar', 'aceptar'],
  category: 'juegos',
  desc: 'Colección de cartas TCG, peleas y mercado de intercambios',

  execute: async ({ sock, msg, remoteJid, sender, args, commandName, db, reply }) => {
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

      const loadMsg = await sock.sendMessage(remoteJid, { text: '✨ _Rasgando el sobre..._' }, { quoted: msg });

      try {
        const groupMetadata = await sock.groupMetadata(remoteJid);
        const participants = groupMetadata.participants;
        const randomParticipant = participants[Math.floor(Math.random() * participants.length)];
        const jidElegido = randomParticipant.id;

        // Intentar obtener el Nickname real
        let nombreElegido = cleanNumber(jidElegido);
        try {
          const contact = await sock.onWhatsApp(jidElegido);
          if (contact && contact[0] && contact[0].notify) nombreElegido = contact[0].notify;
          else if (randomParticipant.notify) nombreElegido = randomParticipant.notify;
        } catch {}

        let pfpUrl = 'https://i.imgur.com/JP3QZ7B.jpeg';
        try { pfpUrl = await sock.profilePictureUrl(jidElegido, 'image'); } catch {}

        const stats = generarCarta();

        const nuevaCarta = {
          nombre: nombreElegido,
          jid: jidElegido,
          rareza: stats.rareza,
          tipo: stats.tipo.nombre,
          atk: stats.atk,
          hp: stats.hp,
          valor: stats.valor
        };
        misCartas.push(nuevaCarta);
        saveCartas(dbCartas);

        const buffer = await dibujarCartaPokemon(pfpUrl, nombreElegido, stats);
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        
        // Mención azul real en el texto
        const jidLimpio = cleanNumber(jidElegido);
        await sock.sendMessage(remoteJid, { 
          image: buffer, 
          caption: `🎉 ¡Felicidades! Has obtenido la carta de *@${jidLimpio}*\n🌟 Rareza: *${stats.rareza}*\n\n🎒 Usa *.miscartas* para ver tu álbum.`,
          mentions: [jidElegido]
        }, { quoted: msg });

      } catch (err) {
        console.log(err);
        return reply('❌ Error al generar la carta.');
      }
    }

    // 🎒 VER INVENTARIO DE CARTAS
    if (cmd === 'miscartas') {
      if (misCartas.length === 0) return reply('🎒 Tu álbum está vacío. Compra sobres con *.tienda sobre 1*');
      
      let txt = `🎒 *TU ÁLBUM POKÉMON* 🎒\n\n`;
      misCartas.forEach((carta, index) => {
        txt += `*[ ${index + 1} ]* ✦ ${carta.rareza} | ${carta.nombre}\n⚔️ ATK: ${carta.atk} | 💖 HP: ${carta.hp} | 💎 ${carta.valor} XP\n\n`;
      });
      txt += `💸 *Vender:* .vendercarta [número]\n⚔️ *Pelear:* .duelocarta [tu_numero] @usuario\n🤝 *Intercambio:* .intercambiar @usuario [tu_num] [su_num]`;
      return reply(txt);
    }

    // 💸 VENDER UNA CARTA AL SISTEMA
    if (cmd === 'vendercarta') {
      const index = parseInt(args[0]) - 1;
      if (isNaN(index) || index < 0 || index >= misCartas.length) return reply('❌ Indica el número correcto de la carta (Ej: .vendercarta 1)');

      const ganancia = misCartas[index].valor;
      misCartas.splice(index, 1);
      saveCartas(dbCartas);

      const userData = await db.getUser(sender);
      userData.xp = (userData.xp || 0) + ganancia;
      if (userData.save) await userData.save();

      return reply(`✅ Carta vendida a la tienda por *${ganancia} XP*.`);
    }

    // 🤝 SISTEMA DE INTERCAMBIO (TRADING)
    if (cmd === 'intercambiar') {
      const target = getTarget(msg, args);
      const miNum = parseInt(args[1]) - 1;
      const suNum = parseInt(args[2]) - 1;

      if (!target || isNaN(miNum) || isNaN(suNum)) {
        return reply('❌ Uso correcto:\n*.intercambiar @usuario [Tu_Carta] [Su_Carta]*\nEjemplo: .intercambiar @Juan 2 5');
      }
      if (target === sender) return reply('❌ No puedes intercambiar contigo mismo.');

      if (!dbCartas[sender] || !dbCartas[sender][miNum]) return reply('❌ No posees la carta que estás ofreciendo.');
      if (!dbCartas[target] || !dbCartas[target][suNum]) return reply('❌ El otro usuario no posee esa carta.');

      const miCarta = dbCartas[sender][miNum];
      const suCarta = dbCartas[target][suNum];

      // Guardar solicitud en RAM
      global.tradeRequests[target] = { from: sender, miNum, suNum, miCartaInfo: miCarta.nombre, suCartaInfo: suCarta.nombre };

      return sock.sendMessage(remoteJid, { 
        text: `⚖️ *SOLICITUD DE INTERCAMBIO* ⚖️\n\n@${cleanNumber(sender)} ofrece su carta *${miCarta.rareza} de ${miCarta.nombre}* a cambio de tu carta *${suCarta.rareza} de ${suCarta.nombre}*.\n\n@${cleanNumber(target)}, escribe *.aceptar* para realizar el cambio.`, 
        mentions: [sender, target] 
      });
    }

    // ✅ ACEPTAR INTERCAMBIO
    if (cmd === 'aceptar') {
      const trade = global.tradeRequests[sender];
      if (!trade) return reply('❌ No tienes ninguna solicitud de intercambio pendiente.');

      const { from, miNum, suNum } = trade;

      // Extraer las cartas (suNum es del sender de aceptar, miNum es del que propuso)
      const cartaDelIniciador = dbCartas[from].splice(miNum, 1)[0];
      const cartaMia = dbCartas[sender].splice(suNum, 1)[0];

      // Inyectar en inventarios opuestos
      dbCartas[from].push(cartaMia);
      dbCartas[sender].push(cartaDelIniciador);
      saveCartas(dbCartas);

      delete global.tradeRequests[sender];

      return sock.sendMessage(remoteJid, { 
        text: `🤝 *¡INTERCAMBIO EXITOSO!*\nLas cartas han sido transferidas a sus nuevos álbumes.`, 
        mentions: [sender, from] 
      });
    }

    // ⚔️ DUELO DE CARTAS POKÉMON
    if (cmd === 'duelocarta') {
      const index = parseInt(args[0]) - 1;
      const target = getTarget(msg, args.slice(1));

      if (isNaN(index) || !target) return reply('❌ Uso correcto:\n*.duelocarta [tu_numero] @usuario*');
      if (!dbCartas[target] || dbCartas[target].length === 0) return reply('❌ Tu rival no tiene cartas para defenderse.');

      const miCarta = misCartas[index];
      const cartaRival = dbCartas[target][Math.floor(Math.random() * dbCartas[target].length)];

      const miPoder = miCarta.atk + Math.floor(Math.random() * 50);
      const poderEnemigo = cartaRival.hp + Math.floor(Math.random() * 50);

      let txt = `⚔️ *BATALLA POKÉMON* ⚔️\n\n`;
      txt += `🔥 *@${cleanNumber(sender)}* usa a *${miCarta.nombre}* (Daño: ${miPoder})\n`;
      txt += `🛡️ *@${cleanNumber(target)}* defiende con *${cartaRival.nombre}* (Defensa: ${poderEnemigo})\n\n`;

      if (miPoder > poderEnemigo) {
        const botin = Math.floor(Math.random() * 800) + 200;
        const myData = await db.getUser(sender);
        const targetData = await db.getUser(target);
        
        targetData.xp = Math.max(0, (targetData.xp || 0) - botin);
        myData.xp = (myData.xp || 0) + botin;
        if (myData.save) await myData.save();
        if (targetData.save) await targetData.save();

        txt += `💥 *¡Un golpe crítico!* Tu carta debilitó al rival.\nLe robaste *${botin} XP*.`;
      } else {
        txt += `🧱 *¡No es muy efectivo!* La defensa del rival resistió tu ataque.`;
      }

      return sock.sendMessage(remoteJid, { text: txt, mentions: [sender, target] }, { quoted: msg });
    }
  }
};
