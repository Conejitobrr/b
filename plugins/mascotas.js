'use strict';

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const PETS_DIR = path.resolve(__dirname, '../media/mascotas');
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const NIVEL_EVOLUCION = 10; 

const ANIMALES = {
  comun: ["Perro", "Gato", "Conejo", "Hámster", "Tortuga", "Loro", "Pato", "Gallina", "Cerdo", "Oveja", "Vaca", "Caballo", "Ratón", "Paloma", "Pavo", "Iguana", "Rana", "Sapo", "Pez Dorado", "Cabra", "Burro", "Ganso", "Hurón", "Erizo", "Cisne", "Cuervo", "Búho", "Lechuza", "Halcón", "Carpintero", "Pelícano", "Flamenco", "Armadillo", "Oso Hormiguero", "Castor", "Nutria", "Mapache", "Zorrillo", "Tejón", "Murciélago", "Cangrejo", "Alce", "Ciervo"],
  raro: ["Lobo", "Zorro", "Oso", "Tigre", "León", "Pantera", "Guepardo", "Leopardo", "Jaguar", "Puma", "Lince", "Hiena", "Chacal", "Coyote", "Dingo", "Canguro", "Gorila", "Chimpancé", "Orangután", "Babuino", "Tucán", "Guacamayo", "Avestruz", "Pingüino", "Foca", "Morsa", "Delfín", "Orca", "Tiburón", "Cocodrilo", "Caimán", "Pitón", "Boa", "Anaconda", "Cobra", "Víbora", "Dragón de Komodo", "Elefante", "Rinoceronte", "Hipopótamo", "Jirafa", "Cebra"],
  epico: ["Lobo Blanco", "Tigre Blanco", "Pantera Negra", "León Dorado", "Oso Polar", "Zorro Ártico", "Águila Dorada", "Halcón Peregrino", "Cóndor", "Cisne Negro", "Ajolote", "Tiburón Blanco", "Megalodón Clonado", "T-Rex Clonado", "Velociraptor Clonado", "Triceratops Clonado", "Mamut Clonado", "Tigre Dientes de Sable", "Lobo Huargo"],
  mitologico: ["Dragón", "Fénix", "Grifo", "Unicornio", "Pegaso", "Cerbero", "Quimera", "Basilisco", "Kraken", "Leviatán", "Behemoth", "Manticora", "Esfinge", "Minotauro", "Centauro", "Kitsune", "Dragón Chino", "Wyvern", "Hipogrifo", "Wendigo", "Gárgola", "Golem"],
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
    if (fs.existsSync(filePath)) {
      return { filePath, isSticker: ext === '.webp', isAnimated: ['.mp4', '.mov', '.gif'].includes(ext), ext };
    }
  }
  return null; 
}

async function sendMediaMsg(sock, remoteJid, media, text, msg, extra = {}) {
  if (!media) return sock.sendMessage(remoteJid, { text, ...extra }, { quoted: msg });

  let stickerBuffer;
  let tempWebp = null;

  try {
    if (media.isSticker) {
      stickerBuffer = fs.readFileSync(media.filePath);
    } else {
      tempWebp = path.join(TEMP_DIR, `pet_sticker_${Date.now()}_${Math.floor(Math.random() * 1000)}.webp`);
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
    const { sock, remoteJid, msg, sender, args, commandName, isOwner, pushName, userData, db } = ctx;
    const now = Date.now();
    const petCommands = ['mascota', 'alimentar', 'jugar', 'entrenar', 'pasear', 'dormir', 'curar', 'pelear', 'ruletamascota'];
    
    if (!userData.inventory) userData.inventory = {};

    // 🔥 MUERTE POR ABANDONO
    if (userData.pet && petCommands.includes(commandName) && hoursPassed(userData.pet.lastFeed, 72)) {
      const p = userData.pet;
      const media = getPetMedia(p.type, 'sacrificada', p.level);
      const txt = `🪦 *Lamentablemente, ${p.name}(${p.type}) ha fallecido por abandono.*\n\nPasó más de 3 días sin probar bocado y no resistió.\n\n_Para tener otra mascota deberás comprar una nueva licencia en la tienda (50,000 XP)._`;
      
      delete userData.pet; 
      if (userData.save) await userData.save();
      
      return sendMediaMsg(sock, remoteJid, media, txt, msg);
    }

    if (commandName === 'adoptar') {
      if (!args.length) {
        const menuMascotas = `🐾 *CENTRO DE ADOPCIÓN* 🐾\n\nPara adoptar debes comprar primero una *Licencia de Mascota* en la *.tienda* (50,000 XP).\n\n*Uso:* \`.adoptar [Nombre]\`\n*Ejemplo:* \`.adoptar Zeus\``;
        return sock.sendMessage(remoteJid, { text: menuMascotas }, { quoted: msg });
      }

      if (userData.pet) return sock.sendMessage(remoteJid, { text: `❌ Ya tienes una mascota activa.` }, { quoted: msg });

      const licenses = userData.inventory.mascota || 0;
      if (licenses <= 0 && !isOwner) {
        return sock.sendMessage(remoteJid, { text: `❌ No tienes una *Licencia de Mascota* en tu inventario.\n\n🛒 Cómprala en la *.tienda* por *50,000 XP*.` }, { quoted: msg });
      }

      if (!isOwner) {
        // 🔥 GUARDADO CORRECTO DEL TICKET MONGODB
        userData.inventory.mascota -= 1;
        if (userData.markModified) userData.markModified('inventory');
      }

      const petName = args.join(' ');
      const roll = Math.random() * 100;
      let rareza = '', pool = [];

      if (roll <= 5) { pool = ANIMALES.mitologico; rareza = '🌟 MITOLÓGICO 🌟'; } 
      else if (roll <= 15) { pool = ANIMALES.epico; rareza = '✨ ÉPICO ✨'; } 
      else if (roll <= 40) { pool = ANIMALES.raro; rareza = '🔵 RARO'; } 
      else { pool = ANIMALES.comun; rareza = '⚪ COMÚN'; }

      const randomType = pool[Math.floor(Math.random() * pool.length)];

      userData.pet = { name: petName, type: randomType, xp: 0, level: 1, lastFeed: now, lastPlay: now, lastTrain: 0, lastWalk: 0, lastBattle: 0 };
      
      if (userData.save) await userData.save();

      const media = getPetMedia(randomType, 'naciendo', 1);
      const txt = `🎉 *¡MILAGRO DE VIDA!* 🎉\n\nCanjeaste tu licencia y nació tu *${randomType.toUpperCase()}* bebé (*${rareza}*).\n\nLe has puesto de nombre: *${petName}*\n\nUsa *.mascota* para ver su estado.`;
      
      return sendMediaMsg(sock, remoteJid, media, txt, msg);
    }

    if (commandName === 'sacrificar') {
      if (!userData.pet) return sock.sendMessage(remoteJid, { text: `❌ No tienes mascota.` }, { quoted: msg });
      
      if (!args.includes('confirmar')) {
        return sock.sendMessage(remoteJid, { text: `⚠️ Estás a punto de sacrificar a tu mascota de forma irreversible. Perderás los 50,000 XP que invertiste.\n\nPara confirmar escribe: *.sacrificar confirmar*` }, { quoted: msg });
      }

      delete userData.pet; 
      if (userData.save) await userData.save();
      
      return sock.sendMessage(remoteJid, { text: `☠️ Mascota sacrificada. Los 50,000 XP se han perdido. Si deseas otra, deberás comprar una nueva licencia en la tienda.` }, { quoted: msg });
    }

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

      const targetData = await db.getUser(target);
      targetData.pet = { name: nombreElegido, type: razaOficial, xp: 0, level: 1, lastFeed: now, lastPlay: now, lastTrain: 0, lastWalk: 0, lastBattle: 0 };
      
      if (targetData.save) await targetData.save();
      return sock.sendMessage(remoteJid, { text: `🎁 *REGALO DIVINO*\n\nEl Owner ha concedido a @${cleanNumber(target)} un majestuoso *${razaOficial}* llamado *${nombreElegido}*.`, mentions: [target] }, { quoted: msg });
    }

    if (commandName === 'editarnombre') {
      if (!isOwner) return sock.sendMessage(remoteJid, { text: `❌ Solo el Owner puede cambiar nombres.` }, { quoted: msg });
      const target = getTarget(msg, args);
      if (!target) return sock.sendMessage(remoteJid, { text: `❌ Menciona al usuario.\n*Uso:* .editarnombre @user NuevoNombre` }, { quoted: msg });

      const nuevoNombre = args.join(' ').replace(/@\d+/g, '').trim();
      const targetData = await db.getUser(target);
      if (!targetData.pet) return sock.sendMessage(remoteJid, { text: `❌ El usuario no tiene mascota.` }, { quoted: msg });

      targetData.pet.name = nuevoNombre;
      if (targetData.save) await targetData.save();
      return sock.sendMessage(remoteJid, { text: `✅ Nombre actualizado a *${nuevoNombre}*.`, mentions: [target] }, { quoted: msg });
    }

    if (commandName === 'darxpmascota') {
      if (!isOwner) return sock.sendMessage(remoteJid, { text: `❌ Solo los Owners pueden inyectar XP.` }, { quoted: msg });
      const target = getTarget(msg, args);
      const amount = parseInt(args[args.length - 1]);
      if (!target || isNaN(amount)) return sock.sendMessage(remoteJid, { text: `❌ Uso: .darxpmascota @user Cantidad` }, { quoted: msg });

      const targetData = await db.getUser(target);
      if (!targetData.pet) return sock.sendMessage(remoteJid, { text: `❌ El usuario no tiene mascota.` }, { quoted: msg });

      targetData.pet.xp += amount;
      targetData.pet.level = Math.floor(targetData.pet.xp / 200) + 1;
      
      if (targetData.save) await targetData.save();
      return sock.sendMessage(remoteJid, { text: `⚡ Inyectados *+${amount} XP* a la mascota de @${cleanNumber(target)}.`, mentions: [target] }, { quoted: msg });
    }

    if (commandName === 'mascota') {
      if (!userData.pet) return sock.sendMessage(remoteJid, { text: `❌ No tienes mascota.` }, { quoted: msg });
      const p = userData.pet;
      const stage = p.level >= NIVEL_EVOLUCION ? 'Adulto 🔥' : 'Bebé 🐾';
      
      let estadoActual = 'contenta', notaEstado = '¡Irradia felicidad y energía!';
      if (hoursPassed(p.lastFeed, 24)) { estadoActual = 'enferma'; notaEstado = '🤒 Su salud decae. Usa .curar y luego .alimentar.'; } 
      else if (hoursPassed(p.lastFeed, 12)) { estadoActual = 'enojada'; notaEstado = '💢 Está hambriento. Usa .alimentar.'; } 
      else if (hoursPassed(p.lastPlay, 24)) { estadoActual = 'triste'; notaEstado = '😢 Se siente triste. Usa .jugar.'; } 
      
      const media = getPetMedia(p.type, estadoActual, p.level);
      const txt = `🐾 *PERFIL DE MASCOTA* 🐾\n\n👤 Cuidador: ${pushName}\n🏷️ Nombre: *${p.name}*\n🧬 Raza: *${String(p.type).toUpperCase()}*\n📊 Nivel: *${p.level}* (${stage})\n✨ Experiencia: *${p.xp} XP*\n\n💭 Estado: ${notaEstado}`;
      
      return sendMediaMsg(sock, remoteJid, media, txt, msg);
    }

    if (!userData.pet && petCommands.includes(commandName)) return sock.sendMessage(remoteJid, { text: `❌ No tienes criatura alguna a tu cuidado.` }, { quoted: msg });
    const p = userData.pet;

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
      
      if (userData.save) await userData.save();

      const estadoFinal = evoluciono ? 'evolucionando' : newState;
      let txtFinal = `${actionText}\n⭐ Ganó *+${gainXP} XP*.`;
      if (evoluciono) txtFinal += `\n\n✨ ¡Ha evolucionado a su forma Adulta!`;

      const media = getPetMedia(p.type, estadoFinal, p.level);
      return sendMediaMsg(sock, remoteJid, media, txtFinal, msg);
    };

    if (commandName === 'alimentar') {
      const remaining = (2 * 60 * 60 * 1000) - (now - (p.lastFeed || 0));
      if (remaining > 0 && !hoursPassed(p.lastFeed, 24)) {
        const media = getPetMedia(p.type, 'contenta', p.level);
        return sendMediaMsg(sock, remoteJid, media, `⏳ *${p.name}* no tiene hambre. Espera *${Math.floor(remaining / 60000)} min*.`, msg);
      }
      p.lastFeed = now; 
      return procesarAccion(30, 'comiendo', `🍖 Le diste su comida favorita a *${p.name}*.`);
    }

    if (commandName === 'jugar') {
      const remaining = (30 * 60 * 1000) - (now - (p.lastPlay || 0));
      if (remaining > 0) {
        const media = getPetMedia(p.type, 'triste', p.level);
        return sendMediaMsg(sock, remoteJid, media, `⏳ *${p.name}* está cansado. Espera *${Math.floor(remaining / 60000)} min*.`, msg);
      }
      p.lastPlay = now; 
      return procesarAccion(15, 'jugando', `🎾 Te divertiste con *${p.name}*.`);
    }

    if (commandName === 'entrenar') {
      const remaining = (4 * 60 * 60 * 1000) - (now - (p.lastTrain || 0));
      if (remaining > 0) {
        const media = getPetMedia(p.type, 'triste', p.level);
        return sendMediaMsg(sock, remoteJid, media, `⏳ *${p.name}* está exhausto. Espera *${Math.floor(remaining / 60000)} min*.`, msg);
      }
      p.lastTrain = now; 
      return procesarAccion(60, 'entrenando', `⚔️ Entrenaste a *${p.name}* duro.`);
    }

    if (commandName === 'pasear') {
      const remaining = (60 * 60 * 1000) - (now - (p.lastWalk || 0));
      if (remaining > 0) {
        const media = getPetMedia(p.type, 'triste', p.level);
        return sendMediaMsg(sock, remoteJid, media, `⏳ Ya caminó suficiente. Espera *${Math.floor(remaining / 60000)} min*.`, msg);
      }
      p.lastWalk = now; 
      return procesarAccion(20, 'paseando', `🌳 Fuiste a pasear con *${p.name}*.`);
    }

    if (commandName === 'ruletamascota') {
      if (!isOwner) return; 
      const wonXP = Math.floor(Math.random() * 4001) + 1000; 
      return procesarAccion(wonXP, 'jugando', `🎰 *RULETA VIP SECRETA* 🎰\n*${p.name}* recibe inyección masiva de XP.`, true);
    }

    if (commandName === 'curar') {
      p.lastFeed = now - (23 * 60 * 60 * 1000); 
      return procesarAccion(5, 'curando', `💊 Aplicaste medicina a *${p.name}*.`, true);
    }

    if (commandName === 'dormir') {
      const media = getPetMedia(p.type, 'durmiendo', p.level);
      return sendMediaMsg(sock, remoteJid, media, `💤 *${p.name}* se ha ido a dormir.`, msg);
    }

    if (commandName === 'pelear') {
      const target = getTarget(msg, args);
      if (!target || target === userKey) return sock.sendMessage(remoteJid, { text: `❌ Menciona a un rival válido.` }, { quoted: msg });

      const targetData = await db.getUser(target);
      if (!targetData.pet) return sock.sendMessage(remoteJid, { text: `❌ El rival no tiene mascota.` }, { quoted: msg });
      const enemyPet = targetData.pet;
      
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

      if (userData.save) await userData.save();
      if (targetData.save) await targetData.save();

      return sock.sendMessage(remoteJid, { text: txtResumen, mentions: [target] }, { quoted: msg });
    }
  }
};
