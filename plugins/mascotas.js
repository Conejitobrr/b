'use strict';

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const PETS_DIR = path.resolve(__dirname, '../media/mascotas');
const TEMP_DIR = path.join(process.cwd(), 'temp');
const INV_PATH = path.join(process.cwd(), 'lib', 'inventario.json');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

function getInv() { try { return JSON.parse(fs.readFileSync(INV_PATH, 'utf8')); } catch { return {}; } }
function saveInv(data) { fs.writeFileSync(INV_PATH, JSON.stringify(data, null, 2)); }

const NIVEL_EVOLUCION = 10; 
const ANIMALES = {
  comun: ["Perro", "Gato", "Conejo", "Hámster", "Tortuga", "Loro", "Pato", "Gallina", "Cerdo", "Oveja", "Vaca", "Caballo", "Ratón"],
  raro: ["Lobo", "Zorro", "Oso", "Tigre", "León", "Pantera", "Guepardo", "Leopardo", "Jaguar", "Puma", "Lince", "Hiena"],
  epico: ["Lobo Blanco", "Tigre Blanco", "Pantera Negra", "León Dorado", "Oso Polar", "Zorro Ártico", "Águila Dorada", "Megalodón Clonado"],
  mitologico: ["Dragón", "Fénix", "Grifo", "Unicornio", "Pegaso", "Cerbero", "Quimera", "Basilisco", "Kraken", "Leviatán"],
  exclusivo: ["Dragón Ancestral"]
};

function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }
function getTarget(msg, args) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return cleanJid(quoted);
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return cleanJid(mentioned);
  return null;
}

function getPetMedia(type, state, level) {
  const stage = level >= NIVEL_EVOLUCION ? 'adulto' : 'bebe';
  const safeType = String(type).toLowerCase().replace(/\s+/g, '_');
  const baseName = `${safeType}_${stage}_${state}`;
  const extensions = ['.webp', '.gif', '.mp4', '.mov', '.png', '.jpg', '.jpeg'];
  for (const ext of extensions) {
    const filePath = path.join(PETS_DIR, baseName + ext);
    if (fs.existsSync(filePath)) return { filePath, isSticker: ext === '.webp', isAnimated: ['.mp4', '.mov', '.gif'].includes(ext), ext };
  }
  return null; 
}

async function sendMediaMsg(sock, remoteJid, media, text, msg, extra = {}) {
  if (!media) return sock.sendMessage(remoteJid, { text, ...extra }, { quoted: msg });
  let stickerBuffer; let tempWebp = null;
  try {
    if (media.isSticker) stickerBuffer = fs.readFileSync(media.filePath);
    else {
      tempWebp = path.join(TEMP_DIR, `pet_${Date.now()}_${Math.floor(Math.random() * 1000)}.webp`);
      let ffmpegCmd = media.isAnimated
        ? `ffmpeg -y -i "${media.filePath}" -vcodec libwebp -vf "fps=15,scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0.0" -q:v 50 -compression_level 6 -preset picture -loop 0 -an "${tempWebp}"`
        : `ffmpeg -y -i "${media.filePath}" -vcodec libwebp -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0.0" -q:v 50 -compression_level 6 -preset picture -an "${tempWebp}"`;
      await execAsync(ffmpegCmd);
      stickerBuffer = fs.readFileSync(tempWebp);
    }
    const mediaMessage = await sock.sendMessage(remoteJid, { sticker: stickerBuffer, ...extra }, { quoted: msg });
    return sock.sendMessage(remoteJid, { text, ...extra }, { quoted: mediaMessage });
  } catch (err) {
    const fallbackBuffer = fs.readFileSync(media.filePath);
    let fallbackMsg = media.isAnimated
      ? await sock.sendMessage(remoteJid, { video: fallbackBuffer, gifPlayback: true, ...extra }, { quoted: msg })
      : await sock.sendMessage(remoteJid, { image: fallbackBuffer, ...extra }, { quoted: msg });
    return sock.sendMessage(remoteJid, { text, ...extra }, { quoted: fallbackMsg });
  } finally {
    if (tempWebp && fs.existsSync(tempWebp)) { try { fs.unlinkSync(tempWebp); } catch {} }
  }
}

function hoursPassed(timestamp, hours) { return (Date.now() - (timestamp || 0)) > (hours * 60 * 60 * 1000); }

module.exports = {
  commands: ['adoptar', 'mascota', 'alimentar', 'jugar', 'entrenar', 'pasear', 'dormir', 'curar', 'sacrificar', 'pelear', 'darmascota', 'editarnombre', 'darxpmascota', 'ruletamascota'],
  
  async execute(ctx) {
    const { sock, remoteJid, msg, sender, args, commandName, isOwner, pushName } = ctx;
    const userKey = cleanJid(sender);
    const now = Date.now();
    const petCommands = ['mascota', 'alimentar', 'jugar', 'entrenar', 'pasear', 'dormir', 'curar', 'pelear', 'ruletamascota'];
    
    // CARGAR INVENTARIO BLINDADO
    const dbInv = getInv();
    if (!dbInv[userKey]) dbInv[userKey] = {};
    const myInv = dbInv[userKey];

    // 🔥 MUERTE POR ABANDONO
    if (myInv.pet && petCommands.includes(commandName) && hoursPassed(myInv.pet.lastFeed, 72)) {
      const p = myInv.pet;
      const media = getPetMedia(p.type, 'sacrificada', p.level);
      const txt = `🪦 *Lamentablemente, ${p.name}(${p.type}) ha fallecido por abandono.*\n\nPasó más de 3 días sin probar bocado y no resistió.\n_Compra una nueva licencia en la tienda (50,000 XP)._`;
      delete myInv.pet; saveInv(dbInv);
      return sendMediaMsg(sock, remoteJid, media, txt, msg);
    }

    // 1. ADOPTAR
    if (commandName === 'adoptar') {
      if (myInv.pet) return sock.sendMessage(remoteJid, { text: `❌ Ya tienes una mascota activa.` }, { quoted: msg });
      
      if (!args.length) {
        return sock.sendMessage(remoteJid, { text: `🐾 *CENTRO DE ADOPCIÓN*\n\nPara adoptar necesitas una *Licencia de Mascota* (Cómprala en la *.tienda* por 50,000 XP).\n\n*Uso:* \`.adoptar [Nombre de tu mascota]\`\n*Ejemplo:* \`.adoptar Zeus\`` }, { quoted: msg });
      }
      
      if ((myInv.licencia_mascota || 0) <= 0 && !isOwner) {
        return sock.sendMessage(remoteJid, { text: `❌ No tienes una *Licencia de Mascota* en tu inventario.\n\n🛒 Cómprala en la *.tienda* por *50,000 XP*.` }, { quoted: msg });
      }

      if (!isOwner) myInv.licencia_mascota -= 1;
      
      const petName = args.join(' ');
      const roll = Math.random() * 100;
      let rareza = '', pool = [];

      if (roll <= 5) { pool = ANIMALES.mitologico; rareza = '🌟 MITOLÓGICO 🌟'; } 
      else if (roll <= 15) { pool = ANIMALES.epico; rareza = '✨ ÉPICO ✨'; } 
      else if (roll <= 40) { pool = ANIMALES.raro; rareza = '🔵 RARO'; } 
      else { pool = ANIMALES.comun; rareza = '⚪ COMÚN'; }

      const randomType = pool[Math.floor(Math.random() * pool.length)];
      myInv.pet = { name: petName, type: randomType, xp: 0, level: 1, lastFeed: now, lastPlay: now, lastTrain: 0, lastWalk: 0, lastBattle: 0 };
      saveInv(dbInv);

      const media = getPetMedia(randomType, 'naciendo', 1);
      const txt = `🎉 *¡MILAGRO DE VIDA!*\n\nCanjeaste tu licencia y nació tu *${randomType.toUpperCase()}* bebé (*${rareza}*).\nNombre: *${petName}*\n\nUsa *.mascota* para verlo.`;
      return sendMediaMsg(sock, remoteJid, media, txt, msg);
    }

    // 🔥 GUÍA PARA LOS QUE NO TIENEN MASCOTA
    if (!myInv.pet && petCommands.includes(commandName)) {
      const guiaTxt = `❌ Aún no tienes un compañero a tu lado.\n\n🛒 *PASO 1:* Compra una *Licencia de Mascota* en la *.tienda* (Cuesta 50,000 XP).\n🐾 *PASO 2:* Usa el comando *.adoptar [Nombre]* para darle la bienvenida a tu nueva mascota.`;
      return sock.sendMessage(remoteJid, { text: guiaTxt }, { quoted: msg });
    }

    // 2. SACRIFICAR
    if (commandName === 'sacrificar') {
      if (!args.includes('confirmar')) return sock.sendMessage(remoteJid, { text: `⚠️ Para sacrificar irreversiblemente a tu mascota escribe: *.sacrificar confirmar*` }, { quoted: msg });
      delete myInv.pet; saveInv(dbInv);
      return sock.sendMessage(remoteJid, { text: `☠️ Mascota sacrificada. Los 50,000 XP invertidos se han perdido.` }, { quoted: msg });
    }

    // 3. PERFIL DE MASCOTA
    if (commandName === 'mascota') {
      const p = myInv.pet;
      const stage = p.level >= NIVEL_EVOLUCION ? 'Adulto 🔥' : 'Bebé 🐾';
      let estadoActual = 'contenta', notaEstado = '¡Irradia felicidad y energía!';
      if (hoursPassed(p.lastFeed, 24)) { estadoActual = 'enferma'; notaEstado = '🤒 Salud decae. Usa .curar y .alimentar.'; } 
      else if (hoursPassed(p.lastFeed, 12)) { estadoActual = 'enojada'; notaEstado = '💢 Está hambriento. Usa .alimentar.'; } 
      else if (hoursPassed(p.lastPlay, 24)) { estadoActual = 'triste'; notaEstado = '😢 Se siente triste. Usa .jugar.'; } 
      
      const media = getPetMedia(p.type, estadoActual, p.level);
      const txt = `🐾 *PERFIL DE MASCOTA*\n\n👤 Cuidador: ${pushName}\n🏷️ Nombre: *${p.name}*\n🧬 Raza: *${String(p.type).toUpperCase()}*\n📊 Nivel: *${p.level}* (${stage})\n✨ XP: *${p.xp}*\n\n💭 Estado: ${notaEstado}`;
      return sendMediaMsg(sock, remoteJid, media, txt, msg);
    }

    // VARIABLES RÁPIDAS
    const p = myInv.pet;

    const procesarAccion = async (gainXP, newState, actionText, isHeal = false) => {
      if (!isHeal && hoursPassed(p.lastFeed, 24)) {
        const mediaEnferma = getPetMedia(p.type, 'enferma', p.level);
        return sendMediaMsg(sock, remoteJid, mediaEnferma, `🤒 *${p.name}* está demasiado débil. Usa .curar primero.`, msg);
      }
      p.xp += gainXP;
      let evoluciono = false;
      const newLevel = Math.floor(p.xp / 200) + 1;
      if (newLevel > p.level) {
        if (p.level < NIVEL_EVOLUCION && newLevel >= NIVEL_EVOLUCION) evoluciono = true;
        p.level = newLevel;
      }
      saveInv(dbInv);
      const estadoFinal = evoluciono ? 'evolucionando' : newState;
      let txtFinal = `${actionText}\n⭐ Ganó *+${gainXP} XP*.${evoluciono ? `\n\n✨ ¡Ha evolucionado a su forma Adulta!` : ''}`;
      return sendMediaMsg(sock, remoteJid, getPetMedia(p.type, estadoFinal, p.level), txtFinal, msg);
    };

    // ACCIONES
    if (commandName === 'alimentar') {
      const remaining = (2 * 60 * 60 * 1000) - (now - (p.lastFeed || 0));
      if (remaining > 0 && !hoursPassed(p.lastFeed, 24)) return sendMediaMsg(sock, remoteJid, getPetMedia(p.type, 'contenta', p.level), `⏳ Espera *${Math.floor(remaining / 60000)} min*.`, msg);
      p.lastFeed = now; return procesarAccion(30, 'comiendo', `🍖 Alimentaste a *${p.name}*.`);
    }
    if (commandName === 'jugar') {
      const remaining = (30 * 60 * 1000) - (now - (p.lastPlay || 0));
      if (remaining > 0) return sendMediaMsg(sock, remoteJid, getPetMedia(p.type, 'triste', p.level), `⏳ Espera *${Math.floor(remaining / 60000)} min*.`, msg);
      p.lastPlay = now; return procesarAccion(15, 'jugando', `🎾 Jugaste con *${p.name}*.`);
    }
    if (commandName === 'entrenar') {
      const remaining = (4 * 60 * 60 * 1000) - (now - (p.lastTrain || 0));
      if (remaining > 0) return sendMediaMsg(sock, remoteJid, getPetMedia(p.type, 'triste', p.level), `⏳ Espera *${Math.floor(remaining / 60000)} min*.`, msg);
      p.lastTrain = now; return procesarAccion(60, 'entrenando', `⚔️ Entrenaste a *${p.name}*.`);
    }
    if (commandName === 'pasear') {
      const remaining = (60 * 60 * 1000) - (now - (p.lastWalk || 0));
      if (remaining > 0) return sendMediaMsg(sock, remoteJid, getPetMedia(p.type, 'triste', p.level), `⏳ Espera *${Math.floor(remaining / 60000)} min*.`, msg);
      p.lastWalk = now; return procesarAccion(20, 'paseando', `🌳 Paseaste con *${p.name}*.`);
    }
    if (commandName === 'curar') {
      p.lastFeed = now - (23 * 60 * 60 * 1000); 
      return procesarAccion(5, 'curando', `💊 Curaste a *${p.name}*.`, true);
    }
    if (commandName === 'dormir') return sendMediaMsg(sock, remoteJid, getPetMedia(p.type, 'durmiendo', p.level), `💤 *${p.name}* está durmiendo.`, msg);

    // COMBATE
    if (commandName === 'pelear') {
      const target = getTarget(msg, args);
      if (!target || target === userKey) return sock.sendMessage(remoteJid, { text: `❌ Menciona a un rival válido.` }, { quoted: msg });

      if (!dbInv[target] || !dbInv[target].pet) return sock.sendMessage(remoteJid, { text: `❌ El rival no tiene mascota.` }, { quoted: msg });
      const enemyPet = dbInv[target].pet;
      
      const n1 = `${p.name}(${p.type})`;
      const n2 = `${enemyPet.name}(${enemyPet.type})`;

      p.lastBattle = now;
      const ganeYo = Math.random() < 0.5;
      const xpBatalla = 80;

      const txtResumen = ganeYo 
        ? `⚔️ *COMBATE DE MASCOTAS*\n\n🏆 ¡*${n1}* derrotó a *${n2}*!\n⭐ Ganó *+${xpBatalla} XP*.`
        : `⚔️ *COMBATE DE MASCOTAS*\n\n💀 ¡*${n2}* venció a *${n1}*!`;

      if (ganeYo) p.xp += xpBatalla; else enemyPet.xp += xpBatalla;

      p.level = Math.floor(p.xp / 200) + 1;
      enemyPet.level = Math.floor(enemyPet.xp / 200) + 1;

      saveInv(dbInv); // Guarda los datos de ambos instantáneamente
      return sock.sendMessage(remoteJid, { text: txtResumen, mentions: [target] }, { quoted: msg });
    }

    // COMANDOS DE OWNER
    if (commandName === 'darmascota') {
      if (!isOwner) return sock.sendMessage(remoteJid, { text: `❌ Solo los Owners pueden crear criaturas a voluntad.` }, { quoted: msg });
      const target = getTarget(msg, args);
      if (!target) return sock.sendMessage(remoteJid, { text: `❌ Menciona al usuario.\n*Uso:* .darmascota @user Raza | Nombre` }, { quoted: msg });

      const partesTexto = args.join(' ').split('|');
      if (partesTexto.length < 2) return sock.sendMessage(remoteJid, { text: `❌ Formato incorrecto.\n*Uso:* .darmascota @user Raza | Nombre` }, { quoted: msg });

      const razaBuscada = partesTexto[0].replace(/@\d+/g, '').replace(/[^\w\sáéíóúÁÉÍÓÚñÑ-]/gi, '').trim().toLowerCase();
      const nombreElegido = partesTexto[1].trim() || 'Criatura';

      let razaOficial = null;
      for (const rareza in ANIMALES) {
        const match = ANIMALES[rareza].find(a => a.toLowerCase() === razaBuscada);
        if (match) { razaOficial = match; break; }
      }

      if (!razaOficial) return sock.sendMessage(remoteJid, { text: `❌ La raza "${razaBuscada}" no existe.` }, { quoted: msg });

      if (!dbInv[target]) dbInv[target] = {};
      dbInv[target].pet = { name: nombreElegido, type: razaOficial, xp: 0, level: 1, lastFeed: now, lastPlay: now, lastTrain: 0, lastWalk: 0, lastBattle: 0 };
      saveInv(dbInv);
      
      return sock.sendMessage(remoteJid, { text: `🎁 *REGALO DIVINO*\n\nEl Owner ha concedido a @${cleanNumber(target)} un majestuoso *${razaOficial}* llamado *${nombreElegido}*.`, mentions: [target] }, { quoted: msg });
    }

    if (commandName === 'editarnombre') {
      if (!isOwner) return;
      const target = getTarget(msg, args);
      const nuevoNombre = args.join(' ').replace(/@\d+/g, '').trim();
      if (!dbInv[target] || !dbInv[target].pet) return sock.sendMessage(remoteJid, { text: `❌ El usuario no tiene mascota.` }, { quoted: msg });
      dbInv[target].pet.name = nuevoNombre;
      saveInv(dbInv);
      return sock.sendMessage(remoteJid, { text: `✅ Nombre actualizado a *${nuevoNombre}*.`, mentions: [target] }, { quoted: msg });
    }

    if (commandName === 'darxpmascota') {
      if (!isOwner) return;
      const target = getTarget(msg, args);
      const amount = parseInt(args[args.length - 1]);
      if (!dbInv[target] || !dbInv[target].pet) return sock.sendMessage(remoteJid, { text: `❌ El usuario no tiene mascota.` }, { quoted: msg });
      dbInv[target].pet.xp += amount;
      dbInv[target].pet.level = Math.floor(dbInv[target].pet.xp / 200) + 1;
      saveInv(dbInv);
      return sock.sendMessage(remoteJid, { text: `⚡ Inyectados *+${amount} XP* a la mascota de @${cleanNumber(target)}.`, mentions: [target] }, { quoted: msg });
    }

    if (commandName === 'ruletamascota') {
      if (!isOwner) return; 
      const wonXP = Math.floor(Math.random() * 4001) + 1000; 
      return procesarAccion(wonXP, 'jugando', `🎰 *RULETA VIP SECRETA* 🎰\n*${p.name}* recibe inyección masiva de XP.`, true);
    }
  }
};
