'use strict';

const fs = require('fs');
const path = require('path');

// 🗄️ BÓVEDA LOCAL PARA WARNS
const WARNS_PATH = path.join(process.cwd(), 'lib', 'warns.json');
if (!fs.existsSync(path.dirname(WARNS_PATH))) fs.mkdirSync(path.dirname(WARNS_PATH), { recursive: true });
if (!fs.existsSync(WARNS_PATH)) fs.writeFileSync(WARNS_PATH, '{}');

function getWarns() { try { return JSON.parse(fs.readFileSync(WARNS_PATH, 'utf8')); } catch { return {}; } }
function saveWarns(data) { fs.writeFileSync(WARNS_PATH, JSON.stringify(data, null, 2)); }

// 🔥 FUNCIONES CLONADAS EXACTAMENTE DE TU PERFIL.JS
function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

function cleanNumber(jid = '') {
  return cleanJid(jid).split('@')[0].replace(/\D/g, '');
}

function getTarget(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return cleanJid(quoted);

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return cleanJid(mentioned);

  return null;
}

const MAX_WARN = 3;

module.exports = {
  name: 'warns',
  aliases: ['warn', 'unwarn', 'resetwarn', 'warnings'],
  category: 'administración',
  desc: 'Sistema manual de advertencias',

  execute: async ({ sock, msg, remoteJid, commandName, args, isOwner, isAdmin, fromGroup, reply }) => {
    if (!fromGroup) return reply('❌ Comando exclusivo para grupos.');

    const dbWarns = getWarns();
    if (!dbWarns[remoteJid]) dbWarns[remoteJid] = {};
    const groupWarns = dbWarns[remoteJid];

    // 1. COMANDO: VER TODOS LOS WARNS
    if (commandName === 'warnings') {
      const entries = Object.entries(groupWarns).filter(([_, count]) => count > 0);
      if (!entries.length) return reply('✅ No hay usuarios con advertencias en este grupo.');
      
      let list = '⚠️ *WARNINGS DEL GRUPO*\n\n';
      const mentions = [];
      
      entries.forEach(([jid, count], i) => { 
        const pureNum = cleanNumber(jid);
        const formatJid = `${pureNum}@s.whatsapp.net`;
        list += `${i + 1}. @${pureNum} — *${count}/${MAX_WARN}*\n`; 
        mentions.push(formatJid);
      });
      
      return sock.sendMessage(remoteJid, { text: list, mentions }, { quoted: msg });
    }

    // 🛡️ Permisos
    if (!isAdmin && !isOwner) return reply('❌ Solo los administradores pueden usar este comando.');

    // Usamos el detector infalible de perfil.js
    const target = getTarget(msg);
    if (!target) return reply('❌ Debes mencionar o responder al mensaje del usuario.');
    
    const pureNumber = cleanNumber(target);
    const formatJid = `${pureNumber}@s.whatsapp.net`;

    // 2. COMANDO: REINICIAR WARNS (0/3)
    if (commandName === 'resetwarn') {
      delete groupWarns[formatJid];
      saveWarns(dbWarns);
      return sock.sendMessage(remoteJid, { 
        text: `✅ Warns reiniciados a 0 para @${pureNumber}.`, 
        mentions: [formatJid] 
      }, { quoted: msg });
    }

    // 3. COMANDO: QUITAR 1 WARN (-1)
    if (commandName === 'unwarn') {
      const current = groupWarns[formatJid] || 0;
      groupWarns[formatJid] = Math.max(0, current - 1);
      saveWarns(dbWarns);
      return sock.sendMessage(remoteJid, { 
        text: `✅ Se quitó 1 warn a @${pureNumber}.\n🚨 Warns actuales: *${groupWarns[formatJid]}/${MAX_WARN}*`, 
        mentions: [formatJid] 
      }, { quoted: msg });
    }

    // 4. COMANDO: AGREGAR WARN (+1)
    if (commandName === 'warn') {
      const reason = args.join(' ').replace(/@\d+/g, '').trim() || 'Advertencia manual';
      
      const current = (groupWarns[formatJid] || 0) + 1;
      groupWarns[formatJid] = current;
      saveWarns(dbWarns);

      await sock.sendMessage(remoteJid, { 
        text: `⚠️ *ADVERTENCIA MANUAL*\n\n👤 Usuario: @${pureNumber}\n📌 Motivo: ${reason}\n🚨 Warns: *${current}/${MAX_WARN}*`, 
        mentions: [formatJid] 
      }, { quoted: msg });

      // Expulsión si llega a 3
      if (current >= MAX_WARN) {
        groupWarns[formatJid] = 0; 
        saveWarns(dbWarns);

        await sock.sendMessage(remoteJid, { 
          text: `🚫 *LÍMITE ALCANZADO*\n\n@${pureNumber} ha sido expulsado por llegar a *${MAX_WARN}* advertencias.`, 
          mentions: [formatJid] 
        });

        setTimeout(async () => {
          try {
            await sock.groupParticipantsUpdate(remoteJid, [formatJid], 'remove');
          } catch (err) {
            console.log('Error expulsando al usuario manualmente:', err.message);
          }
        }, 1000);
      }
    }
  }
};
