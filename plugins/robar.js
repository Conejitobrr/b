'use strict';

const fs = require('fs');
const path = require('path');

const ROBOS_PATH = path.join(process.cwd(), 'lib', 'robos_recientes.json');
if (!fs.existsSync(path.dirname(ROBOS_PATH))) fs.mkdirSync(path.dirname(ROBOS_PATH), { recursive: true });

function loadRobos() {
  try { return JSON.parse(fs.readFileSync(ROBOS_PATH, 'utf8') || '{}'); } catch { return {}; }
}
function saveRobos(data) { fs.writeFileSync(ROBOS_PATH, JSON.stringify(data, null, 2)); }

function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }

const cooldowns = new Map();

module.exports = {
  name: 'robar',
  aliases: ['rob', 'ladron'],
  category: 'economía',
  desc: 'Roba XP a un usuario respondiendo o mencionando',

  execute: async ({ sock, remoteJid, sender, msg, db, reply, fromGroup, userData }) => {
    if (!fromGroup) return reply('❌ Este comando solo funciona en grupos.');

    let target = msg.message?.extendedTextMessage?.contextInfo?.participant 
              || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    
    if (!target) return reply('❌ Debes mencionar o responder al mensaje de alguien para robarle.');
    
    target = cleanJid(target);
    const thief = cleanJid(sender);

    if (target === thief) return reply('❌ No puedes robarte a ti mismo, genio.');

    const now = Date.now();
    const lastRob = cooldowns.get(thief) || 0;
    const remaining = (10 * 60 * 1000) - (now - lastRob); 

    if (remaining > 0) {
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      return reply(`⏳ La policía patrulla la zona. Debes esperar *${m}m ${s}s* antes de volver a robar.`);
    }

    const targetData = await db.getUser(target);
    const targetXp = targetData.xp || 0;

    if (targetXp < 2000) {
      return reply('❌ Esa persona es demasiado pobre para ser asaltada (Mínimo 2000 XP).');
    }

    cooldowns.set(thief, now);

    // 🛡️ REVISAR ESCUDO ANTI-ROBO DIRECTO
    if (targetData.inventory && (targetData.inventory.shieldUses > 0 || targetData.inventory.escudo > 0)) {
      if (targetData.inventory.shieldUses > 0) targetData.inventory.shieldUses -= 1;
      else if (targetData.inventory.escudo > 0) targetData.inventory.escudo -= 1;
      
      if (targetData.save) await targetData.save(); else await db.setUser(target, targetData);
      
      const multa = Math.floor(Math.random() * 2000) + 1000;
      userData.xp = Math.max(0, (userData.xp || 0) - multa); 
      if (userData.save) await userData.save(); else await db.setUser(sender, userData);

      return sock.sendMessage(remoteJid, { 
        text: `🛡️ @${cleanNumber(target)} tiene un *Escudo Anti-Robo* activo. ¡El escudo absorbió tu ataque y se rompió!\n\n_Has salido herido y perdiste *${multa} XP*._`, 
        mentions: [target] 
      }, { quoted: msg });
    }

    let amount = 0;
    let jackpot = false;

    if (Math.random() < 0.05) {
      const porcentaje = (Math.random() * 0.08) + 0.12; 
      amount = Math.floor(targetXp * porcentaje);
      jackpot = true;
    } else {
      const porcentaje = (Math.random() * 0.05) + 0.03; 
      amount = Math.floor(targetXp * porcentaje);
    }

    amount = Math.min(amount, targetXp);

    // 🔥 TRANSFERENCIA MATEMÁTICA DE XP (Libre de errores)
    targetData.xp = Math.max(0, targetXp - amount);
    userData.xp = (userData.xp || 0) + amount;
    
    if (targetData.save) await targetData.save(); else await db.setUser(target, targetData);
    if (userData.save) await userData.save(); else await db.setUser(sender, userData);

    // 📝 REGISTRO POLICIAL
    const robosDB = loadRobos();
    if (!robosDB[remoteJid]) robosDB[remoteJid] = [];
    
    robosDB[remoteJid] = robosDB[remoteJid].filter(r => now - Number(r.time || 0) <= 10 * 60 * 1000);
    robosDB[remoteJid].push({ thief, victim: target, amount, time: now, caught: false });
    saveRobos(robosDB);

    const txt = jackpot
      ? `💎 ¡JACKPOT MAFIOSO!\n\nDiste un gran golpe y le robaste *${amount} XP* a @${cleanNumber(target)}.\n\n🚨 La policía puede atraparte si usan *.policia* en los próximos 5 minutos.`
      : `🦹 Te metiste en los bolsillos de @${cleanNumber(target)} y le robaste silenciosamente *${amount} XP*.\n\n🚨 La policía puede atraparte si usan *.policia* en los próximos 5 minutos.`;

    return sock.sendMessage(remoteJid, { text: txt, mentions: [target] }, { quoted: msg });
  }
};
