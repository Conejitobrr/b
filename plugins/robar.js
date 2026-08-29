'use strict';

const fs = require('fs');
const path = require('path');

// 🗄️ RUTAS LOCALES
const INV_PATH = path.join(process.cwd(), 'lib', 'inventario.json');
const COOLDOWN_PATH = path.join(process.cwd(), 'lib', 'rob_cooldowns.json');
const JAIL_PATH = path.join(process.cwd(), 'lib', 'jail.json');
const ROBOS_PATH = path.join(process.cwd(), 'lib', 'robos_recientes.json');

// Crear archivos si no existen
if (!fs.existsSync(path.dirname(COOLDOWN_PATH))) fs.mkdirSync(path.dirname(COOLDOWN_PATH), { recursive: true });
if (!fs.existsSync(COOLDOWN_PATH)) fs.writeFileSync(COOLDOWN_PATH, '{}');
if (!fs.existsSync(path.dirname(JAIL_PATH))) fs.mkdirSync(path.dirname(JAIL_PATH), { recursive: true });
if (!fs.existsSync(JAIL_PATH)) fs.writeFileSync(JAIL_PATH, '{"jailed":{}}');
if (!fs.existsSync(path.dirname(ROBOS_PATH))) fs.mkdirSync(path.dirname(ROBOS_PATH), { recursive: true });
if (!fs.existsSync(ROBOS_PATH)) fs.writeFileSync(ROBOS_PATH, '{}');

function getInv() { try { return JSON.parse(fs.readFileSync(INV_PATH, 'utf8')); } catch { return {}; } }
function saveInv(data) { fs.writeFileSync(INV_PATH, JSON.stringify(data, null, 2)); }

function getCooldowns() { try { return JSON.parse(fs.readFileSync(COOLDOWN_PATH, 'utf8')); } catch { return {}; } }
function saveCooldowns(data) { fs.writeFileSync(COOLDOWN_PATH, JSON.stringify(data, null, 2)); }

function getJail() { try { return JSON.parse(fs.readFileSync(JAIL_PATH, 'utf8') || '{"jailed":{}}'); } catch { return { jailed: {} }; } }
function saveJail(data) { fs.writeFileSync(JAIL_PATH, JSON.stringify(data, null, 2)); }

// 🔥 FUNCIONES DE MENCIONES AZULES ESTRICTAS
function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }

function getTarget(msg, args) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return cleanJid(quoted);
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return cleanJid(mentioned);
  if (args && args[0]) {
    const cleanArgs = args[0].replace(/\D/g, '');
    if (cleanArgs) return `${cleanArgs}@s.whatsapp.net`;
  }
  return null;
}

function msToTime(ms) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

module.exports = {
  name: 'robar',
  aliases: ['steal', 'hurtar', 'ladron'],
  category: 'economía',
  desc: 'Intenta robar XP a otro usuario',

  execute: async ({ sock, msg, remoteJid, sender, args, db, reply }) => {
    try {
      const target = getTarget(msg, args);
      const attackerJid = cleanJid(sender);

      if (!target) return reply('❌ Debes mencionar a quién quieres robar.\n📌 Ejemplo: *.robar @usuario*');
      if (target === attackerJid) return reply('❌ No puedes robarte a ti mismo.');

      const targetNum = cleanNumber(target);
      const attackerNum = cleanNumber(attackerJid);

      // 1. VERIFICAR SI EL LADRÓN ESTÁ EN LA CÁRCEL 🚨
      const attackerData = await db.getUser(attackerJid);
      const jailDB = getJail();
      const jailTimeLeft = Number(attackerData.jailUntil || 0) - Date.now();

      if (jailDB.jailed[attackerJid] || jailTimeLeft > 0) {
        if (jailTimeLeft > 0) {
          return sock.sendMessage(remoteJid, {
            text: `🚨 *ESTÁS ARRESTADO*\n\n@${attackerNum}, no puedes robar desde la cárcel.\n⛓️ Cumple tu condena de *${msToTime(jailTimeLeft)}* o usa una llave de celda.`,
            mentions: [attackerJid]
          }, { quoted: msg });
        } else {
          // Si el tiempo ya pasó, lo liberamos en silencio
          delete jailDB.jailed[attackerJid];
          saveJail(jailDB);
        }
      }

      // 2. Control de spam (10 minutos)
      const cooldowns = getCooldowns();
      const now = Date.now();
      const delay = 10 * 60 * 1000; 

      if (cooldowns[attackerJid] && cooldowns[attackerJid].lastRob) {
        const timeLeft = (cooldowns[attackerJid].lastRob + delay) - now;
        if (timeLeft > 0) {
          return sock.sendMessage(remoteJid, {
            text: `⏳ *MÁS DESPACIO*\n\n@${attackerNum}, estás llamando mucho la atención.\n🕒 Vuelve a intentar en: *${msToTime(timeLeft)}*`,
            mentions: [attackerJid]
          }, { quoted: msg });
        }
      }

      // 3. CONEXIÓN CON EL INVENTARIO (Lectura del Escudo)
      const dbInv = getInv();
      if (!dbInv[target]) dbInv[target] = {};
      const targetInv = dbInv[target];

      // Castigamos al ladrón dándole su cooldown de inmediato
      if (!cooldowns[attackerJid]) cooldowns[attackerJid] = {};
      cooldowns[attackerJid].lastRob = now;
      saveCooldowns(cooldowns);

      // 🔥 INTERCEPCIÓN DE ESCUDO
      if (Number(targetInv.shieldUses || 0) > 0) {
        targetInv.shieldUses -= 1;
        saveInv(dbInv);

        return sock.sendMessage(remoteJid, {
          text: `🛡️ *¡ROBO BLOQUEADO!*\n\nIntentaste asaltar a @${targetNum}, pero tenía un *Escudo Anti-Robo* equipado.\n\n💥 El escudo se ha roto protegiendo su XP.\n🚨 Has sido descubierto y debes huir.`,
          mentions: [target]
        }, { quoted: msg });
      }

      // 4. Lógica del Robo
      const targetData = await db.getUser(target);
      const targetXP = targetData.xp || 0;
      
      if (targetXP < 2000) {
        return sock.sendMessage(remoteJid, {
          text: `❌ @${targetNum} es demasiado pobre. Necesita al menos *2000 XP* para que valga la pena robarle.`,
          mentions: [target]
        }, { quoted: msg });
      }

      // 50% de probabilidad de éxito
      const isSuccess = Math.random() > 0.5;

      if (isSuccess) {
        // Roba entre el 5% y el 15% del XP de la víctima
        const percentage = (Math.floor(Math.random() * 11) + 5) / 100;
        const stolenXP = Math.floor(targetXP * percentage);

        attackerData.xp = (attackerData.xp || 0) + stolenXP;
        targetData.xp -= stolenXP;

        if (attackerData.save) await attackerData.save();
        if (targetData.save) await targetData.save();

        // 🔥 REGISTRAR ROBO PARA EL PLUGIN POLICÍA
        let robosDB = {};
        try { robosDB = JSON.parse(fs.readFileSync(ROBOS_PATH, 'utf8')); } catch {}
        if (!robosDB[remoteJid]) robosDB[remoteJid] = [];
        
        robosDB[remoteJid].push({
          thief: attackerJid,
          victim: target,
          amount: stolenXP,
          time: Date.now(),
          caught: false
        });
        fs.writeFileSync(ROBOS_PATH, JSON.stringify(robosDB, null, 2));

        return sock.sendMessage(remoteJid, {
          text: `🥷 *ROBO EXITOSO*\n\n@${attackerNum} asaltó a @${targetNum} en un callejón oscuro.\n\n💰 Botín: *+${stolenXP} XP*`,
          mentions: [attackerJid, target]
        }, { quoted: msg });

      } else {
        // 🔥 PENALIZACIÓN: Pierde 800 XP y va 20 minutos a la cárcel
        const multa = 800;
        const tiempoCarcel = 20 * 60 * 1000; 

        attackerData.xp = Math.max(0, (attackerData.xp || 0) - multa);
        attackerData.jailUntil = now + tiempoCarcel;
        if (attackerData.save) await attackerData.save();

        // Registrar en el archivo de la cárcel
        jailDB.jailed[attackerJid] = {
           until: now + tiempoCarcel,
           sobornoAttempts: 0
        };
        saveJail(jailDB);

        return sock.sendMessage(remoteJid, {
          text: `🚨 *¡TE ATRAPARON!*\n\n@${targetNum} se defendió y llamó a la policía.\n\n📉 @${attackerNum} pierde *-${multa} XP*.\n⛓️ Has sido enviado a la cárcel por *20 minutos*.`,
          mentions: [attackerJid, target]
        }, { quoted: msg });
      }

    } catch (err) {
      console.log('❌ Error en robar:', err);
      return reply('❌ Ocurrió un error al intentar efectuar el robo.');
    }
  }
};
