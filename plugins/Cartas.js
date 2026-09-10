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

// --- UTILIDADES ---
function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }

function getTarget(msg, args) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return cleanJid(quoted);
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return cleanJid(mentioned);
  return null;
}

// 🎲 MOTOR DE RAREZAS Y ESTADÍSTICAS
function generarCarta() {
  const rand = Math.random() * 100;
  let rareza, color, atk, def, valor;

  if (rand < 0.5) {
    rareza = 'MÍTICA'; color = '#FF007F'; atk = Math.floor(Math.random() * 200) + 900; def = Math.floor(Math.random() * 200) + 900; valor = 50000;
  } else if (rand < 4) {
    rareza = 'LEGENDARIA'; color = '#FFD700'; atk = Math.floor(Math.random() * 300) + 600; def = Math.floor(Math.random() * 300) + 600; valor = 15000;
  } else if (rand < 15) {
    rareza = 'ÉPICA'; color = '#9C27B0'; atk = Math.floor(Math.random() * 200) + 400; def = Math.floor(Math.random() * 200) + 400; valor = 3500;
  } else if (rand < 40) {
    rareza = 'RARA'; color = '#03A9F4'; atk = Math.floor(Math.random() * 150) + 200; def = Math.floor(Math.random() * 150) + 200; valor = 800;
  } else {
    rareza = 'COMÚN'; color = '#9E9E9E'; atk = Math.floor(Math.random() * 100) + 50; def = Math.floor(Math.random() * 100) + 50; valor = 300;
  }

  return { rareza, color, atk, def, valor };
}

// 🎨 CREADOR VISUAL DE LA CARTA (CANVAS)
async function dibujarCarta(pfpUrl, nombre, stats) {
  const width = 600;
  const height = 850;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fondo según rareza
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#111');
  grad.addColorStop(1, stats.color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Marco de la carta
  ctx.lineWidth = 20;
  ctx.strokeStyle = stats.color;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // Etiqueta de rareza
  ctx.fillStyle = stats.color;
  ctx.fillRect(20, 20, width - 40, 60);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 35px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`✦ ${stats.rareza} ✦`, width / 2, 62);

  // Cargar Foto de Perfil
  let avatar;
  try {
    avatar = await loadImage(pfpUrl);
  } catch {
    const fallback = createCanvas(400, 400);
    const fbCtx = fallback.getContext('2d');
    fbCtx.fillStyle = '#333';
    fbCtx.fillRect(0, 0, 400, 400);
    avatar = fallback;
  }

  // Dibujar foto de perfil cuadrada
  ctx.drawImage(avatar, 50, 110, 500, 450);
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#FFFFFF';
  ctx.strokeRect(50, 110, 500, 450);

  // Nombre del personaje
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 45px sans-serif';
  const shortName = nombre.length > 15 ? nombre.substring(0, 15) + '...' : nombre;
  ctx.fillText(shortName, width / 2, 630);

  // Stats (Estilo Pokémon)
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`⚔️ ATAQUE: ${stats.atk}`, 70, 700);
  ctx.fillText(`🛡️ DEFENSA: ${stats.def}`, 70, 750);
  ctx.fillText(`💰 VALOR: ${stats.valor} XP`, 70, 800);

  return canvas.toBuffer('image/jpeg', { quality: 0.95 });
}

module.exports = {
  name: 'cartas',
  aliases: ['abrirsobre', 'miscartas', 'vendercarta', 'duelocarta'],
  category: 'juegos',
  desc: 'Sistema de Gacha, colección y peleas de cartas',

  execute: async ({ sock, msg, remoteJid, sender, args, commandName, db, reply }) => {
    const cmd = commandName.toLowerCase();
    const dbCartas = getCartas();
    if (!dbCartas[sender]) dbCartas[sender] = [];
    let misCartas = dbCartas[sender];

    // 📦 ABRIR UN SOBRE (GACHA)
    if (cmd === 'abrirsobre') {
      const dbInv = getInv();
      if (!dbInv[sender] || (dbInv[sender].sobre || 0) <= 0) {
        return reply('❌ No tienes Sobres Gacha. Cómpralos en la tienda con *.tienda sobre 1*');
      }

      // Restar el sobre
      dbInv[sender].sobre -= 1;
      saveInv(dbInv);

      const loadMsg = await sock.sendMessage(remoteJid, { text: '✨ _Abriendo sobre mágico..._' }, { quoted: msg });

      try {
        // Seleccionar a un miembro aleatorio del grupo para la carta
        const groupMetadata = await sock.groupMetadata(remoteJid);
        const participants = groupMetadata.participants;
        const randomParticipant = participants[Math.floor(Math.random() * participants.length)];
        const jidElegido = randomParticipant.id;

        // Intentar obtener su nombre o usar su número
        let nombreElegido = cleanNumber(jidElegido);
        try {
          const contact = await sock.onWhatsApp(jidElegido);
          if (contact && contact[0] && contact[0].notify) nombreElegido = contact[0].notify;
        } catch {}

        // Obtener Foto
        let pfpUrl = 'https://i.imgur.com/JP3QZ7B.jpeg';
        try { pfpUrl = await sock.profilePictureUrl(jidElegido, 'image'); } catch {}

        // Generar Stats
        const stats = generarCarta();

        // Guardar la carta en el inventario del usuario
        const nuevaCarta = {
          nombre: nombreElegido,
          jid: jidElegido,
          rareza: stats.rareza,
          atk: stats.atk,
          def: stats.def,
          valor: stats.valor
        };
        misCartas.push(nuevaCarta);
        saveCartas(dbCartas);

        // Dibujar y enviar la imagen
        const buffer = await dibujarCarta(pfpUrl, nombreElegido, stats);
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        await sock.sendMessage(remoteJid, { 
          image: buffer, 
          caption: `🎉 ¡Felicidades! Has obtenido a *${nombreElegido}*\n🌟 Rareza: *${stats.rareza}*\n\n🎒 Usa *.miscartas* para ver tu colección.`
        }, { quoted: msg });

      } catch (err) {
        console.log(err);
        return reply('❌ Error al generar la carta. El sobre se ha perdido en el multiverso.');
      }
    }

    // 🎒 VER INVENTARIO DE CARTAS
    if (cmd === 'miscartas') {
      if (misCartas.length === 0) return reply('🎒 Tu álbum está vacío. Compra sobres con *.tienda sobre 1*');
      
      let txt = `🎒 *TU COLECCIÓN DE CARTAS* 🎒\n\n`;
      misCartas.forEach((carta, index) => {
        const icono = carta.rareza === 'MÍTICA' ? '🔴' : carta.rareza === 'LEGENDARIA' ? '🟡' : carta.rareza === 'ÉPICA' ? '🟣' : carta.rareza === 'RARA' ? '🔵' : '⚪';
        txt += `*[ ${index + 1} ]* ${icono} ${carta.nombre}\n⚔️ ${carta.atk} | 🛡️ ${carta.def} | 💎 ${carta.valor} XP\n\n`;
      });
      txt += `\n💸 *Vender:* .vendercarta [número]\n⚔️ *Pelear:* .duelocarta [tu_numero] @usuario`;
      return reply(txt);
    }

    // 💸 VENDER UNA CARTA AL SISTEMA
    if (cmd === 'vendercarta') {
      const index = parseInt(args[0]) - 1;
      if (isNaN(index) || index < 0 || index >= misCartas.length) {
        return reply('❌ Debes indicar el número correcto de la carta.\n📌 Ejemplo: *.vendercarta 1* (Usa .miscartas para ver los números).');
      }

      const cartaVendida = misCartas[index];
      const ganancia = cartaVendida.valor;

      // Eliminar del array
      misCartas.splice(index, 1);
      saveCartas(dbCartas);

      // Dar dinero
      const userData = await db.getUser(sender);
      userData.xp = (userData.xp || 0) + ganancia;
      if (userData.save) await userData.save();

      return reply(`✅ Has vendido a *${cartaVendida.nombre}* (${cartaVendida.rareza}) por *${ganancia} XP*.\n💰 Tu nuevo saldo es de: ${userData.xp} XP.`);
    }

    // ⚔️ DUELO DE CARTAS TIPO POKÉMON
    if (cmd === 'duelocarta') {
      const index = parseInt(args[0]) - 1;
      const target = getTarget(msg, args.slice(1));

      if (isNaN(index) || index < 0 || index >= misCartas.length) {
        return reply('❌ Indica qué carta quieres usar para pelear.\n📌 Ejemplo: *.duelocarta 1 @usuario*');
      }
      if (!target) return reply('❌ Debes mencionar a quién quieres retar a un duelo.');
      if (target === sender) return reply('❌ No puedes pelear contra ti mismo, esquizofrénico.');

      // Verificar si el oponente tiene cartas
      if (!dbCartas[target] || dbCartas[target].length === 0) {
        return reply('❌ Ese usuario no tiene ninguna carta para defenderse.');
      }

      const miCarta = misCartas[index];
      const cartasOponente = dbCartas[target];
      // El oponente defiende con una carta al azar de su mazo
      const cartaOponente = cartasOponente[Math.floor(Math.random() * cartasOponente.length)];

      // Fórmula de combate con un factor de suerte de los dados (1 a 50)
      const miPoder = miCarta.atk + Math.floor(Math.random() * 50);
      const poderEnemigo = cartaOponente.def + Math.floor(Math.random() * 50);

      let resultadoTxt = `⚔️ *DUELO DE CARTAS* ⚔️\n\n`;
      resultadoTxt += `🔥 *@${cleanNumber(sender)}* ataca con *${miCarta.nombre}* (ATK: ${miCarta.atk})\n`;
      resultadoTxt += `🛡️ *@${cleanNumber(target)}* defiende con *${cartaOponente.nombre}* (DEF: ${cartaOponente.def})\n\n`;

      if (miPoder > poderEnemigo) {
        // Gano el duelo
        const botin = Math.floor(Math.random() * 1000) + 500;
        const myData = await db.getUser(sender);
        const targetData = await db.getUser(target);
        
        targetData.xp = Math.max(0, (targetData.xp || 0) - botin);
        myData.xp = (myData.xp || 0) + botin;
        if (myData.save) await myData.save();
        if (targetData.save) await targetData.save();

        resultadoTxt += `🎉 *¡Has ganado el duelo!* Tu carta logró romper la defensa.\nLe has robado *${botin} XP* al perdedor.`;
      } else {
        // Pierdo el duelo
        resultadoTxt += `💀 *¡Has perdido el duelo!* La defensa de su carta fue demasiado fuerte. No ganaste nada.`;
      }

      return sock.sendMessage(remoteJid, { text: resultadoTxt, mentions: [sender, target] }, { quoted: msg });
    }
  }
};
