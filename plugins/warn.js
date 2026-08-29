'use strict';

const fs = require('fs');
const path = require('path');

const WARNS_PATH = path.join(process.cwd(), 'lib', 'warns.json');
if (!fs.existsSync(path.dirname(WARNS_PATH))) fs.mkdirSync(path.dirname(WARNS_PATH), { recursive: true });
if (!fs.existsSync(WARNS_PATH)) fs.writeFileSync(WARNS_PATH, '{}');

function getWarns() { try { return JSON.parse(fs.readFileSync(WARNS_PATH, 'utf8')); } catch { return {}; } }
function saveWarns(data) { fs.writeFileSync(WARNS_PATH, JSON.stringify(data, null, 2)); }
function cleanJid(jid = '') { return String(jid).split(':')[0] + '@s.whatsapp.net'; }

const MAX_WARN = 3;

module.exports = {
  name: 'warns',
  aliases: ['warn', 'unwarn', 'resetwarn', 'warnings'],
  category: 'administración',
  desc: 'Sistema de advertencias',

  execute: async ({ sock, msg, remoteJid, commandName, args, isOwner, isAdmin, fromGroup, reply }) => {
    if (!fromGroup) return reply('❌ Solo en grupos.');

    // Carga de la DB Blindada
    const dbWarns = getWarns();
    if (!dbWarns[remoteJid]) dbWarns[remoteJid] = {};
    const groupWarns = dbWarns[remoteJid];

    // COMANDO: .warnings (VER TODOS)
    if (commandName === 'warnings') {
      const entries = Object.entries(groupWarns).filter(([_, count]) => count > 0);
      if (!entries.length) return reply('✅ No hay usuarios con advertencias en este grupo.');
      
      let list = '⚠️ *WARNINGS DEL GRUPO*\n\n';
      const mentions = [];
      entries.forEach(([jid, count], i) => { 
        list += `${i + 1}. @${jid.split('@')[0]} — *${count}/${MAX_WARN}*\n`; 
        mentions.push(jid);
      });
      return sock.sendMessage(remoteJid, { text: list, mentions }, { quoted: msg });
    }

    // Protección de permisos
    if (!isAdmin && !isOwner) return reply('❌ Solo admins pueden usar este comando.');

    // Capturar al objetivo (mención o respuesta)
    const target = msg.message?.extendedTextMessage?.contextInfo?.participant || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!target) return reply('❌ Debes mencionar o responder al mensaje del usuario.');
    
    const userJid = cleanJid(target);

    // COMANDO: .resetwarn (ELIMINAR TODOS LOS WARNS DEL USUARIO)
    if (commandName === 'resetwarn') {
      delete groupWarns[userJid];
      saveWarns(dbWarns);
      return reply(`✅ Warns reiniciados a 0 para @${userJid.split('@')[0]}`, { mentions: [userJid] });
    }

    // COMANDO: .unwarn (RESTAR 1 WARN)
    if (commandName === 'unwarn') {
      const current = groupWarns[userJid] || 0;
      groupWarns[userJid] = Math.max(0, current - 1);
      saveWarns(dbWarns);
      return reply(`✅ Se quitó 1 warn a @${userJid.split('@')[0]}\n🚨 Warns actuales: *${groupWarns[userJid]}/${MAX_WARN}*`, { mentions: [userJid] });
    }

    // COMANDO: .warn (SUMAR 1 WARN)
    if (commandName === 'warn') {
      const reason = args.join(' ').replace(/@\d+/g, '').trim() || 'Advertencia manual';
      const current = (groupWarns[userJid] || 0) + 1;
      groupWarns[userJid] = current;
      saveWarns(dbWarns);

      await sock.sendMessage(remoteJid, { 
        text: `⚠️ *Advertencia*\n\n👤 Usuario: @${userJid.split('@')[0]}\n📌 Motivo: ${reason}\n🚨 Warns: *${current}/${MAX_WARN}*`, 
        mentions: [userJid] 
      }, { quoted: msg });

      // Expulsar si llega a 3
      if (current >= MAX_WARN) {
        try {
          const groupMetadata = await sock.groupMetadata(remoteJid);
          const botJid = cleanJid(sock.user.id);
          const isBotAdmin = groupMetadata.participants.some(p => p.id === botJid && (p.admin === 'admin' || p.admin === 'superadmin'));

          if (isBotAdmin) {
            await sock.groupParticipantsUpdate(remoteJid, [userJid], 'remove');
            groupWarns[userJid] = 0; // Reiniciarlo para el futuro
            saveWarns(dbWarns);
            return sock.sendMessage(remoteJid, { text: `🚫 @${userJid.split('@')[0]} fue expulsado por llegar a *${MAX_WARN}* advertencias.`, mentions: [userJid] });
          } else {
            return reply(`⚠️ @${userJid.split('@')[0]} llegó a *${MAX_WARN}* warns, pero no puedo expulsarlo porque no soy admin.`, { mentions: [userJid] });
          }
        } catch (e) {
          return reply(`⚠️ Ocurrió un error al intentar expulsar a @${userJid.split('@')[0]}.`);
        }
      }
    }
  }
};
