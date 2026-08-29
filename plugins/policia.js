'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

// 🗄️ RUTAS LOCALES
const TEMP_DIR = path.join(process.cwd(), 'temp');
const JAIL_PATH = path.join(process.cwd(), 'lib', 'jail.json');
const ROBOS_PATH = path.join(process.cwd(), 'lib', 'robos_recientes.json');
const INV_PATH = path.join(process.cwd(), 'lib', 'inventario.json');
const DEFAULT_PROFILE = path.join(process.cwd(), 'assets', 'Sinperfil.jpg');

const JAIL_TIME = 10 * 60 * 1000;
const ROB_TIME = 5 * 60 * 1000;

// 💰 ECONOMÍA POLICIAL
const BASE_FIANZA = 1000;
const EXTRA_FIANZA_POR_FAMA = 100;
const MAX_FIANZA = 50000;

const BASE_SOBORNO = 500;
const EXTRA_SOBORNO_POR_FAMA = 50;
const EXTRA_SOBORNO_POR_INTENTO = 1000;
const MAX_SOBORNO = 25000;
const MAX_SOBORNO_INTENTOS = 3;
const PENALIDAD_SOBORNO = 5 * 60 * 1000;

const DECAY_INTERVAL = 12 * 60 * 60 * 1000;
const DECAY_AMOUNT = 5;

// 🔥 FÓRMULA DE MENCIONES AZULES ESTRICTAS
function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }

function ensureTemp() { if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true }); }
function ensureFile(file, def) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(def, null, 2));
}

function loadJail() {
  ensureFile(JAIL_PATH, { jailed: {}, fame: {}, lastCrimeAt: {} });
  try { return JSON.parse(fs.readFileSync(JAIL_PATH, 'utf8')); } 
  catch { return { jailed: {}, fame: {}, lastCrimeAt: {} }; }
}

function saveJail(data) { fs.writeFileSync(JAIL_PATH, JSON.stringify(data, null, 2)); }
function loadRobos() { ensureFile(ROBOS_PATH, {}); try { return JSON.parse(fs.readFileSync(ROBOS_PATH, 'utf8')); } catch { return {}; } }
function saveRobos(data) { fs.writeFileSync(ROBOS_PATH, JSON.stringify(data, null, 2)); }
function getInv(jid) { try { const data = JSON.parse(fs.readFileSync(INV_PATH, 'utf8')); return data[cleanJid(jid)] || {}; } catch { return {}; } }

function msToTime(ms = 0) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m} min ${s} seg`;
}

function applyFameDecay(jailDB, jid) {
  const user = cleanJid(jid);
  jailDB.fame = jailDB.fame || {};
  jailDB.lastCrimeAt = jailDB.lastCrimeAt || {};
  let fame = Number(jailDB.fame[user] || 0);

  if (fame <= 0) {
    jailDB.fame[user] = 0;
    jailDB.lastCrimeAt[user] = Date.now();
    return 0;
  }

  const lastCrime = Number(jailDB.lastCrimeAt[user] || 0);
  if (!lastCrime) { jailDB.lastCrimeAt[user] = Date.now(); return fame; }

  const steps = Math.floor((Date.now() - lastCrime) / DECAY_INTERVAL);
  if (steps > 0) {
    fame = Math.max(0, fame - (steps * DECAY_AMOUNT));
    jailDB.fame[user] = fame;
    jailDB.lastCrimeAt[user] = Date.now();
  }
  return fame;
}

function addFame(jailDB, jid, amount) {
  const user = cleanJid(jid);
  jailDB.fame[user] = Math.max(0, Number(jailDB.fame[user] || 0) + Number(amount || 0));
  jailDB.lastCrimeAt[user] = Date.now();
  return jailDB.fame[user];
}

function getJailOptions(jailDB, jid) {
  const user = cleanJid(jid);
  const jail = jailDB.jailed?.[user] || {};
  const fame = applyFameDecay(jailDB, user);
  const attempts = Number(jail.sobornoAttempts || 0);
  const remainingAttempts = Math.max(0, MAX_SOBORNO_INTENTOS - attempts);

  const fianzaCost = Math.min(MAX_FIANZA, BASE_FIANZA + (fame * EXTRA_FIANZA_POR_FAMA));
  const sobornoCost = remainingAttempts > 0 ? Math.min(MAX_SOBORNO, BASE_SOBORNO + (fame * EXTRA_SOBORNO_POR_FAMA) + (attempts * EXTRA_SOBORNO_POR_INTENTO)) : 0;
  
  const inv = getInv(user);
  const keys = Number(inv.keys || 0);

  return { fame, attempts, remainingAttempts, fianzaCost, sobornoCost, keys };
}

// 🎨 GENERADOR DE IMÁGENES (Filtro de rejas)
async function downloadProfile(sock, jid, output) {
  try {
    const url = await sock.profilePictureUrl(jid, 'image');
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(output, res.data);
  } catch {
    if (fs.existsSync(DEFAULT_PROFILE)) fs.copyFileSync(DEFAULT_PROFILE, output);
    else throw new Error('Falta assets/Sinperfil.jpg');
  }
}

async function makeArrestTile(input, output, title = 'ARRESTADO') {
  await execFileAsync('convert', [
    input, '-resize', '720x720^', '-gravity', 'center', '-extent', '720x720',
    '-fill', 'rgba(0,0,0,0.28)', '-draw', 'rectangle 0,0 720,720',
    '-fill', 'rgba(18,18,18,0.92)', '-draw', 'rectangle 72,0 108,720', '-draw', 'rectangle 218,0 254,720', '-draw', 'rectangle 364,0 400,720', '-draw', 'rectangle 510,0 546,720', '-draw', 'rectangle 656,0 692,720',
    '-fill', 'rgba(255,255,255,0.32)', '-draw', 'rectangle 78,0 86,720', '-draw', 'rectangle 224,0 232,720', '-draw', 'rectangle 370,0 378,720', '-draw', 'rectangle 516,0 524,720', '-draw', 'rectangle 662,0 670,720',
    '-fill', 'rgba(0,0,0,0.55)', '-draw', 'rectangle 98,0 108,720', '-draw', 'rectangle 244,0 254,720', '-draw', 'rectangle 390,0 400,720', '-draw', 'rectangle 536,0 546,720', '-draw', 'rectangle 682,0 692,720',
    '-fill', 'rgba(18,18,18,0.92)', '-draw', 'rectangle 0,138 720,170', '-draw', 'rectangle 0,350 720,382', '-draw', 'rectangle 0,562 720,594',
    '-fill', 'rgba(185,0,0,0.86)', '-draw', 'rectangle 0,292 720,420',
    '-fill', '#ffffff', '-stroke', '#000000', '-strokewidth', '4', '-gravity', 'center', '-font', 'DejaVu-Sans-Bold', '-pointsize', '76', '-annotate', '0', title,
    output
  ]);
}

async function makeArrestCollage(sock, captured, output) {
  ensureTemp();
  const files = [];
  try {
    for (let i = 0; i < captured.length; i++) {
      const jid = cleanJid(captured[i].thief);
      const profile = path.join(TEMP_DIR, `police_profile_${Date.now()}_${i}.jpg`);
      const tile = path.join(TEMP_DIR, `police_tile_${Date.now()}_${i}.jpg`);
      await downloadProfile(sock, jid, profile);
      await makeArrestTile(profile, tile);
      files.push(profile, tile);
    }
    const tiles = files.filter(f => f.includes('police_tile_'));
    if (tiles.length === 1) { fs.copyFileSync(tiles[0], output); return; }
    
    const columns = tiles.length <= 2 ? 2 : 3;
    await execFileAsync('montage', [...tiles, '-tile', `${columns}x`, '-geometry', '720x720+8+8', '-background', '#111111', output]);
  } finally {
    for (const file of files) { try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch {} }
  }
}

module.exports = {
  name: 'policia',
  aliases: ['policía', 'denunciar', 'carcel', 'fama', 'sobornar', 'fianza'],
  category: 'economía',
  desc: 'Sistema completo de policía y cárcel',

  execute: async ({ sock, remoteJid, msg, sender, commandName, args, db, reply }) => {
    let collagePath = null;
    try {
      const now = Date.now();
      const me = cleanJid(sender);
      const myNum = cleanNumber(me);
      
      const jailDB = loadJail();
      applyFameDecay(jailDB, me);

      // 1. ESTADO DE LA CÁRCEL
      if (commandName === 'carcel') {
        const jail = jailDB.jailed[me];
        if (!jail || jail.until <= now) {
          delete jailDB.jailed[me]; saveJail(jailDB);
          return reply('✅ No estás arrestado.');
        }
        const opts = getJailOptions(jailDB, me);
        return reply(`⛓️ *ESTÁS ARRESTADO*\n\n⏳ Tiempo restante: *${msToTime(jail.until - now)}*\n☠️ Fama criminal: *${opts.fame}*\n\n💰 *FIANZA SEGURA*\n➤ Costo: *${opts.fianzaCost} XP*\n➤ Usar: *.fianza pagar*\n\n💸 *SOBORNO ARRIESGADO*\n➤ Intentos: *${opts.remainingAttempts}/${MAX_SOBORNO_INTENTOS}*\n➤ Costo: *${opts.remainingAttempts > 0 ? `${opts.sobornoCost} XP` : 'Agotado'}*\n➤ Usar: *.sobornar pagar*\n\n🔑 *LLAVE DE CELDA*\n➤ Llaves disponibles: *${opts.keys}*\n➤ Usar: *.usar llave*`);
      }

      // 2. VER FAMA CRIMINAL
      if (commandName === 'fama') {
        const fame = jailDB.fame[me] || 0;
        return sock.sendMessage(remoteJid, { text: `☠️ *FAMA CRIMINAL*\n\n👤 @${myNum}\n🔥 Nivel criminal: *${fame}*\n🚨 Riesgo policial: *${Math.min(90, 10 + fame)}%*\n\n📉 Si dejas de robar, tu fama bajará poco a poco.`, mentions: [me] }, { quoted: msg });
      }

      // 3. PAGAR FIANZA
      if (commandName === 'fianza') {
        const jail = jailDB.jailed[me];
        if (!jail || jail.until <= now) { delete jailDB.jailed[me]; saveJail(jailDB); return reply('✅ No estás arrestado. No necesitas pagar fianza.'); }
        
        const opts = getJailOptions(jailDB, me);
        const userData = await db.getUser(me);
        const xp = Number(userData.xp || 0);
        const opt = (args?.[0] || '').toLowerCase();

        if (!['pagar', 'pay', 'si', 'sí', 'confirmar'].includes(opt)) {
          return sock.sendMessage(remoteJid, { text: `💰 *FIANZA DISPONIBLE*\n\n👤 @${myNum}\n⛓️ Tiempo restante: *${msToTime(jail.until - now)}*\n\n☠️ Fama criminal: *${opts.fame}*\n💸 Costo de fianza: *${opts.fianzaCost} XP*\n⭐ Tu XP actual: *${xp} XP*\n\n📌 La fianza es salida segura.\nPara pagar envía: *.fianza pagar*`, mentions: [me] }, { quoted: msg });
        }

        if (xp < opts.fianzaCost) return reply(`❌ No tienes suficiente XP.\n💸 Fianza: *${opts.fianzaCost} XP*\n⭐ Tienes: *${xp} XP*`);
        
        userData.xp -= opts.fianzaCost;
        if (userData.save) await userData.save();
        
        delete jailDB.jailed[me];
        jailDB.fame[me] = Math.max(0, Number(jailDB.fame[me] || 0) - 3);
        saveJail(jailDB);
        return sock.sendMessage(remoteJid, { text: `💰 *FIANZA PAGADA*\n\n👤 @${myNum} pagó *${opts.fianzaCost} XP*.\n✅ Saliste de prisión libremente.`, mentions: [me] }, { quoted: msg });
      }

      // 4. SOBORNAR
      if (commandName === 'sobornar') {
        const jail = jailDB.jailed[me];
        if (!jail || jail.until <= now) { delete jailDB.jailed[me]; saveJail(jailDB); return reply('✅ No estás arrestado.'); }
        
        const opts = getJailOptions(jailDB, me);
        if (opts.remainingAttempts <= 0) return reply(`❌ Agotaste tus *${MAX_SOBORNO_INTENTOS} intentos* de soborno.\nUsa *.fianza pagar* o *.usar llave*.`);
        
        const userData = await db.getUser(me);
        const xp = Number(userData.xp || 0);
        const opt = (args?.[0] || '').toLowerCase();

        if (!['pagar', 'pay', 'si', 'sí', 'confirmar'].includes(opt)) {
          return sock.sendMessage(remoteJid, { text: `💸 *SOBORNO DISPONIBLE*\n\n⛓️ Tiempo restante: *${msToTime(jail.until - now)}*\n🎲 Intentos: *${opts.remainingAttempts}/${MAX_SOBORNO_INTENTOS}*\n💰 Costo: *${opts.sobornoCost} XP*\n⭐ Tu XP: *${xp} XP*\n\n✅ Si funciona: sales libre.\n❌ Si falla: pierdes XP y se suman 5 minutos.\nPara intentar: *.sobornar pagar*`, mentions: [me] }, { quoted: msg });
        }

        if (xp < opts.sobornoCost) return reply(`❌ XP insuficiente.\n💸 Soborno: *${opts.sobornoCost} XP*\n⭐ Tienes: *${xp} XP*`);
        
        userData.xp -= opts.sobornoCost;
        if (userData.save) await userData.save();

        const chance = Math.max(0.20, 0.45 - (opts.attempts * 0.10));
        
        if (Math.random() < chance) {
          delete jailDB.jailed[me];
          jailDB.fame[me] = Math.max(0, Number(jailDB.fame[me] || 0) - 5);
          saveJail(jailDB);
          return reply(`💸 *SOBORNO EXITOSO*\n\nPagaste *${opts.sobornoCost} XP*.\n🚓 La policía aceptó el trato y estás libre.`);
        } else {
          jail.sobornoAttempts = Number(jail.sobornoAttempts || 0) + 1;
          jail.until += PENALIDAD_SOBORNO;
          addFame(jailDB, me, 3);
          saveJail(jailDB);
          return reply(`❌ *SOBORNO FALLIDO*\n\nPagaste *${opts.sobornoCost} XP* pero el policía te delató.\n\n⛓️ Penalidad: *+5 minutos de cárcel*\n☠️ Tu fama criminal aumentó.\n⏳ Tiempo restante: *${msToTime(jail.until - now)}*`);
        }
      }

      // 5. CAZAR LADRONES (Comando Principal .policia)
      const robosDB = loadRobos();
      const robos = robosDB[remoteJid] || [];
      const mentionedRaw = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      const mentioned = mentionedRaw ? cleanJid(mentionedRaw) : null;

      let suspects = robos.filter(r => !r.caught && now - Number(r.time || 0) <= ROB_TIME);
      if (mentioned) suspects = suspects.filter(r => cleanJid(r.thief) === mentioned);
      const oldRobos = robos.filter(r => !r.caught && now - Number(r.time || 0) > ROB_TIME);

      if (!suspects.length) {
        if (mentioned) return sock.sendMessage(remoteJid, { text: `🚓 *SIN PRUEBAS*\n\n@${cleanNumber(mentioned)} no tiene robos recientes o ya escapó.`, mentions: [mentioned] }, { quoted: msg });
        
        if (oldRobos.length) {
          const escapedMentions = [...new Set(oldRobos.map(r => cleanJid(r.thief)))];
          robosDB[remoteJid] = robos.filter(r => now - Number(r.time || 0) <= 10 * 60 * 1000);
          saveRobos(robosDB);
          return sock.sendMessage(remoteJid, { text: `🚓 *LA POLICÍA LLEGÓ TARDE*\n\nLos sospechosos ya escaparon:\n${escapedMentions.map(j => `➤ @${cleanNumber(j)}`).join('\n')}`, mentions: escapedMentions }, { quoted: msg });
        }
        return reply('✅ La ciudad está en paz. No hay robos recientes en los últimos 5 minutos.');
      }

      const captured = [];
      const escaped = [];

      for (const robbery of suspects) {
        const thief = cleanJid(robbery.thief);
        const fame = applyFameDecay(jailDB, thief);
        const captureChance = Math.min(0.85, 0.55 + fame / 200);

        if (Math.random() < captureChance) {
          captured.push(robbery);
          jailDB.jailed[thief] = { until: now + JAIL_TIME, by: me, chat: remoteJid, at: now, sobornoAttempts: 0 };
          addFame(jailDB, thief, 10);
          robbery.caught = true;
        } else {
          escaped.push(robbery);
          addFame(jailDB, thief, 5);
        }
      }

      robosDB[remoteJid] = robos.filter(r => now - Number(r.time || 0) <= 10 * 60 * 1000);
      saveRobos(robosDB);
      saveJail(jailDB);

      // 🔥 RECOLECTAR MENCIONES AZULES ESTRICTAS
      const allMentions = new Set([me]);
      captured.forEach(r => { allMentions.add(cleanJid(r.thief)); allMentions.add(cleanJid(r.victim)); });
      escaped.forEach(r => { allMentions.add(cleanJid(r.thief)); allMentions.add(cleanJid(r.victim)); });

      let text = `🚔 *OPERATIVO POLICIAL*\n\n`;

      if (captured.length) {
        text += `⛓️ *Arrestados:*\n`;
        for (const r of captured) {
          const thief = cleanJid(r.thief);
          const opts = getJailOptions(jailDB, thief);
          text += `➤ @${cleanNumber(r.thief)} fue arrestado por robar *${r.amount} XP* a @${cleanNumber(r.victim)}\n`;
          text += `   💰 Fianza: *${opts.fianzaCost} XP* → *.fianza pagar*\n`;
          text += `   💸 Soborno: *${opts.sobornoCost} XP* → *.sobornar pagar*\n\n`;
        }
        text += `📌 Condena: *10 minutos en prisión*\n\n`;
      }

      if (escaped.length) {
        text += `🚓 *Escaparon:*\n`;
        for (const r of escaped) { text += `➤ @${cleanNumber(r.thief)} escapó con *${r.amount} XP* de @${cleanNumber(r.victim)}\n`; }
      }

      if (captured.length) {
        const id = `${Date.now()}_${Math.floor(Math.random() * 9999)}`;
        collagePath = path.join(TEMP_DIR, `police_collage_${id}.jpg`);
        await makeArrestCollage(sock, captured, collagePath);
        
        return sock.sendMessage(remoteJid, { image: fs.readFileSync(collagePath), caption: text, mentions: [...allMentions] }, { quoted: msg });
      }

      return sock.sendMessage(remoteJid, { text, mentions: [...allMentions] }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error policia:', err);
      return reply('❌ Ocurrió un error en el sistema policial.');
    } finally {
      try { if (collagePath && fs.existsSync(collagePath)) fs.unlinkSync(collagePath); } catch {}
    }
  }
};
