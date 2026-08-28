'use strict';

const fs = require('fs');
const path = require('path');
const ROBOS_PATH = path.join(process.cwd(), 'lib', 'robos_recientes.json');
if (!fs.existsSync(path.dirname(ROBOS_PATH))) fs.mkdirSync(path.dirname(ROBOS_PATH), { recursive: true });

function loadRobos() {
  try { return JSON.parse(fs.readFileSync(ROBOS_PATH, 'utf8') || '{}'); } catch { return {}; }
}
function saveRobos(data) { fs.writeFileSync(ROBOS_PATH, JSON.stringify(data, null, 2)); }

const cooldowns = new Map();

module.exports = {
  name: 'robar',
  aliases: ['rob', 'ladron'],
  category: 'economía',
  desc: 'Roba XP a un usuario (Puede salir mal)',

  execute: async ({ sock, remoteJid, sender, msg, args, db, reply, fromGroup, userData }) => {
    if (!fromGroup) return reply('❌ Solo en grupos.');

    const now = Date.now();
    const lastRob = cooldowns.get(sender) || 0;
    const remaining = (30 * 60 * 1000) - (now - lastRob);

    if (remaining > 0) return reply(`⏳ Policía patrullando. Espera *${Math.floor(remaining / 60000)}m* para volver a robar.`);

    const target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!target) return reply('⚠️ Tienes que mencionar a alguien para robarle.\nEjemplo: *.robar @usuario*');
    if (target === sender) return reply('❌ No puedes robarte a ti mismo, genio.');

    const targetData = await db.getUser(target);
    const targetXp = targetData.xp || 0;

    if (targetXp < 500) return reply('❌ Esa persona es demasiado pobre para robarle (menos de 500 XP).');

    cooldowns.set(sender, now);

    // 🛡️ REVISAR ESCUDO
    if (targetData.inventory && targetData.inventory.shieldUses > 0) {
      targetData.inventory.shieldUses -= 1;
      await db.setUser(target, targetData);
      
      // El ladrón pierde XP
      const multa = Math.floor(Math.random() * 2000) + 1000;
      userData.xp -= multa;
      await db.setUser(sender, userData);

      return sock.sendMessage(remoteJid, { text: `🛡️ *¡ROBO FALLIDO!*\n\n@${sender.split('@')[0]} intentó robar a @${target.split('@')[0]}, pero este tenía un **Escudo Anti-Robo**.\n\nEl ladrón salió herido y perdió *${multa} XP*.`, mentions: [sender, target] }, { quoted: msg });
    }

    // PROBABILIDAD DE ROBO (40% ÉXITO)
    const success = Math.random() < 0.40;

    if (success) {
      const stoleAmount = Math.floor(Math.random() * (targetXp * 0.15)) + 500; // Roba hasta el 15%
      
      targetData.xp -= stoleAmount;
      userData.xp += stoleAmount;
      await db.setUser(target, targetData);
      await db.setUser(sender, userData);

      // 📝 REGISTRO PARA LA POLICÍA
      const robosDB = loadRobos();
      if (!robosDB[remoteJid]) robosDB[remoteJid] = [];
      robosDB[remoteJid].push({ thief: sender, victim: target, amount: stoleAmount, time: now, caught: false });
      saveRobos(robosDB);

      return sock.sendMessage(remoteJid, { text: `🥷 *ROBO EXITOSO*\n\n@${sender.split('@')[0]} le robó silenciosamente *${stoleAmount} XP* a @${target.split('@')[0]}.\n\n🚨 ¡Cuidado! La policía tiene 5 minutos para usar *.policia* y atraparte.`, mentions: [sender, target] }, { quoted: msg });
    } else {
      const multa = Math.floor(Math.random() * 1500) + 500;
      userData.xp -= multa;
      await db.setUser(sender, userData);
      return sock.sendMessage(remoteJid, { text: `🚔 *¡TE ATRAPARON EN EL ACTO!*\n\n@${sender.split('@')[0]} intentó robar a @${target.split('@')[0]} pero el perro ladró.\nEn la huida, se le cayeron *${multa} XP*.`, mentions: [sender, target] }, { quoted: msg });
    }
  }
};
