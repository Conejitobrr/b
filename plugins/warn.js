'use strict';

const MAX_WARN = 3;
function cleanJid(jid = '') { return String(jid).split(':')[0]; }

module.exports = {
  name: 'warns',
  aliases: ['warn', 'unwarn', 'resetwarn', 'warnings'],
  category: 'administración',
  desc: 'Sistema de advertencias',

  execute: async ({ sock, msg, remoteJid, commandName, args, isOwner, isAdmin, fromGroup, groupData, db, reply }) => {
    if (!fromGroup) return reply('❌ Solo en grupos.');

    if (commandName === 'warnings') {
      const warns = groupData.warns || {};
      const entries = Object.entries(warns).filter(([_, count]) => count > 0);
      if (!entries.length) return reply('✅ No hay usuarios con advertencias en este grupo.');
      
      let list = '⚠️ *WARNINGS DEL GRUPO*\n\n';
      entries.forEach(([jid, count], i) => { list += `${i + 1}. @${jid.split('@')[0]} — *${count}/${MAX_WARN}*\n`; });
      return sock.sendMessage(remoteJid, { text: list, mentions: entries.map(e => `${e[0]}@s.whatsapp.net`) }, { quoted: msg });
    }

    if (!isAdmin && !isOwner) return reply('❌ Solo admins pueden usar este comando.');

    const target = msg.message?.extendedTextMessage?.contextInfo?.participant || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!target) return reply('❌ Debes mencionar o responder al mensaje del usuario.');
    
    const userJid = cleanJid(target);
    if (!groupData.warns) groupData.warns = {};

    if (commandName === 'resetwarn') {
      delete groupData.warns[userJid];
      if (groupData.save) await groupData.save(); else await db.setGroup(remoteJid, groupData);
      return reply(`✅ Warns reiniciados para @${userJid.split('@')[0]}`, { mentions: [userJid] });
    }

    if (commandName === 'unwarn') {
      const current = groupData.warns[userJid] || 0;
      groupData.warns[userJid] = Math.max(0, current - 1);
      if (groupData.save) await groupData.save(); else await db.setGroup(remoteJid, groupData);
      return reply(`✅ Se quitó 1 warn a @${userJid.split('@')[0]}`, { mentions: [userJid] });
    }

    if (commandName === 'warn') {
      const reason = args.join(' ').replace(/@\d+/g, '').trim() || 'Advertencia manual';
      const current = (groupData.warns[userJid] || 0) + 1;
      groupData.warns[userJid] = current;
      if (groupData.save) await groupData.save(); else await db.setGroup(remoteJid, groupData);

      await sock.sendMessage(remoteJid, { 
        text: `⚠️ *Advertencia*\n\n👤 Usuario: @${userJid.split('@')[0]}\n📌 Motivo: ${reason}\n🚨 Warns: *${current}/${MAX_WARN}*`, 
        mentions: [target] 
      }, { quoted: msg });

      if (current >= MAX_WARN) {
        try {
          await sock.groupParticipantsUpdate(remoteJid, [target], 'remove');
          delete groupData.warns[userJid];
          if (groupData.save) await groupData.save(); else await db.setGroup(remoteJid, groupData);
          return reply(`🚫 @${userJid.split('@')[0]} fue expulsado por llegar a *${MAX_WARN}* advertencias.`, { mentions: [target] });
        } catch (e) {
          return reply(`⚠️ Llegó a *${MAX_WARN}* warns, pero no puedo expulsarlo porque no soy admin.`);
        }
      }
    }
  }
};
