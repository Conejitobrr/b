'use strict';

const fs = require('fs');
const path = require('path');

const JAIL_PATH = path.join(process.cwd(), 'lib', 'jail.json');
const ROBOS_PATH = path.join(process.cwd(), 'lib', 'robos_recientes.json');
if (!fs.existsSync(path.dirname(JAIL_PATH))) fs.mkdirSync(path.dirname(JAIL_PATH), { recursive: true });

function loadJail() { try { return JSON.parse(fs.readFileSync(JAIL_PATH, 'utf8') || '{"jailed":{},"fame":{}}'); } catch { return { jailed: {}, fame: {} }; } }
function saveJail(data) { fs.writeFileSync(JAIL_PATH, JSON.stringify(data, null, 2)); }
function loadRobos() { try { return JSON.parse(fs.readFileSync(ROBOS_PATH, 'utf8') || '{}'); } catch { return {}; } }
function saveRobos(data) { fs.writeFileSync(ROBOS_PATH, JSON.stringify(data, null, 2)); }

const JAIL_TIME = 10 * 60 * 1000;
const ROB_TIME = 5 * 60 * 1000;
const MAX_SOBORNO_INTENTOS = 3;

module.exports = {
  name: 'policia',
  aliases: ['policía', 'denunciar', 'carcel', 'fianza', 'sobornar'],
  category: 'economía',
  desc: 'Sistema judicial',

  execute: async ({ sock, remoteJid, sender, msg, commandName, args, db, userData, reply }) => {
    const now = Date.now();
    const jailDB = loadJail();
    jailDB.jailed = jailDB.jailed || {};
    jailDB.fame = jailDB.fame || {};

    // POLICÍA (BUSCAR LADRONES)
    if (commandName === 'policia' || commandName === 'policía' || commandName === 'denunciar') {
      const robosDB = loadRobos();
      const robos = robosDB[remoteJid] || [];
      const suspects = robos.filter(r => !r.caught && now - r.time <= ROB_TIME);

      if (!suspects.length) return reply('✅ No hay ladrones sueltos en los últimos 5 minutos.');

      const captured = [];
      for (const robbery of suspects) {
        const fame = jailDB.fame[robbery.thief] || 0;
        const captureChance = Math.min(0.85, 0.55 + fame / 200);

        if (Math.random() < captureChance) {
          captured.push(robbery);
          jailDB.jailed[robbery.thief] = { until: now + JAIL_TIME, sobornoAttempts: 0 };
          jailDB.fame[robbery.thief] = fame + 10;
          robbery.caught = true;
        } else {
          jailDB.fame[robbery.thief] = fame + 5;
        }
      }

      robosDB[remoteJid] = robos.filter(r => now - r.time <= 10 * 60 * 1000);
      saveRobos(robosDB); saveJail(jailDB);

      if (captured.length) {
        let txt = `🚔 *OPERATIVO EXITOSO*\n\n⛓️ *Arrestados:*\n`;
        const mentions = [];
        for (const r of captured) {
          txt += `➤ @${r.thief.split('@')[0]} arrestado por robar a @${r.victim.split('@')[0]}.\n`;
          mentions.push(r.thief, r.victim);
        }
        txt += `\nCondena: *10 minutos*. Usen *.carcel* para ver opciones de salida.`;
        
        // Extraer foto del primer ladrón capturado
        try {
          const pp = await sock.profilePictureUrl(captured[0].thief, 'image');
          return sock.sendMessage(remoteJid, { image: { url: pp }, caption: txt, mentions }, { quoted: msg });
        } catch {
          return sock.sendMessage(remoteJid, { text: txt, mentions }, { quoted: msg });
        }
      } else {
        return reply('🚓 *FRACASO* - La policía patrulló pero el ladrón logró escapar entre las sombras.');
      }
    }

    // ESTADO DE CÁRCEL
    if (commandName === 'carcel') {
      const jail = jailDB.jailed[sender];
      if (!jail || jail.until <= now) {
        if (jail) { delete jailDB.jailed[sender]; saveJail(jailDB); }
        return reply('✅ Eres un ciudadano libre.');
      }
      
      const fianza = 1000 + ((jailDB.fame[sender] || 0) * 100);
      const m = Math.floor((jail.until - now) / 60000);
      
      return reply(`⛓️ *ESTÁS ARRESTADO*\n⏳ Tiempo restante: *${m} minutos*\n\n💰 *FIANZA SEGURO:* ${fianza} XP (.fianza pagar)\n💸 *SOBORNO RIESGOSO:* .sobornar pagar\n🔑 *USAR LLAVE:* .usar llave`);
    }

    // PAGAR FIANZA
    if (commandName === 'fianza') {
      const jail = jailDB.jailed[sender];
      if (!jail || jail.until <= now) return reply('✅ No estás arrestado.');

      const fianza = 1000 + ((jailDB.fame[sender] || 0) * 100);
      if (args[0] !== 'pagar') return reply(`💰 Fianza: *${fianza} XP*\nTu XP: *${userData.xp}*\nPara pagar usa: *.fianza pagar*`);
      if (userData.xp < fianza) return reply('❌ No tienes XP suficiente para la fianza.');

      userData.xp -= fianza;
      await db.setUser(sender, userData);
      delete jailDB.jailed[sender]; saveJail(jailDB);
      return reply(`💰 Pagaste *${fianza} XP* y saliste libre.`);
    }

    // SOBORNO
    if (commandName === 'sobornar') {
      const jail = jailDB.jailed[sender];
      if (!jail || jail.until <= now) return reply('✅ No estás arrestado.');
      
      if (jail.sobornoAttempts >= MAX_SOBORNO_INTENTOS) return reply('❌ La policía ya no acepta tus sobornos.');
      const soborno = 500 + ((jailDB.fame[sender] || 0) * 50) + (jail.sobornoAttempts * 1000);

      if (args[0] !== 'pagar') return reply(`💸 Soborno: *${soborno} XP*\nIntentos restantes: *${MAX_SOBORNO_INTENTOS - jail.sobornoAttempts}*\nPara intentar usa: *.sobornar pagar*`);
      if (userData.xp < soborno) return reply('❌ No tienes XP suficiente.');

      userData.xp -= soborno;
      await db.setUser(sender, userData);

      const chance = Math.max(0.20, 0.45 - (jail.sobornoAttempts * 0.10));
      if (Math.random() < chance) {
        delete jailDB.jailed[sender]; saveJail(jailDB);
        return reply(`💸 *EXITO* Quedaste libre por ${soborno} XP.`);
      } else {
        jail.sobornoAttempts += 1;
        jail.until += (5 * 60 * 1000); // 5 mins extra
        saveJail(jailDB);
        return reply(`❌ *SOBORNO RECHAZADO*\nPerdiste el dinero y te sumaron 5 minutos a tu condena.`);
      }
    }
  }
};
