'use strict';

const fs = require('fs');
const path = require('path');

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
        const target = cleanJid(jid); 
        const pureNum = cleanNumber(target);
        list += `${i + 1}. @${pureNum} — *${count}/${MAX_WARN}*\n`; 
        mentions.push(target);
      });
      
      return sock.sendMessage(remoteJid, { text: list, mentions }, { quoted: msg });
    }

    // 🛡️ Permisos
    if (!isAdmin && !isOwner) return reply('❌ Solo los administradores pueden usar este comando.');

    // 🔥 USANDO EXACTAMENTE EL MISMO TARGET DE PERFIL.JS
    const target = getTarget(msg);
    if (!target) return reply('❌ Debes mencionar o responder al mensaje del usuario.');
    
    // Obtenemos solo los números limpios para el texto visual
    const pureNumber = cleanNumber(target);

    // 2. COMANDO: REINICIAR WARNS (0/3)
    if (commandName === 'resetwarn') {
      delete groupWarns[target];
      saveWarns(dbWarns);
      return sock.sendMessage(remoteJid, { 
        text: `✅ Warns reiniciados a 0 para @${pureNumber}.`, 
        mentions: [target] 
      }, { quoted: msg });
    }

    // 3. COMANDO: QUITAR 1 WARN (-1)
    if (commandName === 'unwarn') {
      const current = groupWarns[target] || 0;
      groupWarns[target] = Math.max(0, current - 1);
      saveWarns(dbWarns);
      return sock.sendMessage(remoteJid, { 
        text: `✅ Se quitó 1 warn a @${pureNumber}.\n🚨 Warns actuales: *${groupWarns[target]}/${MAX_WARN}*`, 
        mentions: [target] 
      }, { quoted: msg });
    }

    // 4. COMANDO: AGREGAR WARN (+1)
    if (commandName === 'warn') {
      // Limpiamos el texto del motivo
      const reason = args.join(' ').replace(/@\S+/g, '').trim() || 'Advertencia manual';
      
      const current = (groupWarns[target] || 0) + 1;
      groupWarns[target] = current;
      saveWarns(dbWarns);

      const textWarn = `⚠️ *ADVERTENCIA MANUAL*\n\n👤 Usuario: @${pureNumber}\n📌 Motivo: ${reason}\n🚨 Warns: *${current}/${MAX_WARN}*`;

      await sock.sendMessage(remoteJid, { 
        text: textWarn, 
        mentions: [target] 
      }, { quoted: msg });

      // Expulsión
      if (current >= MAX_WARN) {
        groupWarns[target] = 0; 
        saveWarns(dbWarns);

        const textBan = `🚫 *LÍMITE ALCANZADO*\n\n@${pureNumber} ha sido expulsado por llegar a *${MAX_WARN}* advertencias.`;

        await sock.sendMessage(remoteJid, { 
          text: textBan, 
          mentions: [target] 
        });

        setTimeout(async () => {
          try {
            await sock.groupParticipantsUpdate(remoteJid, [target], 'remove');
          } catch (err) {
            console.log('Error expulsando al usuario manualmente:', err.message);
          }
        }, 1000);
      }
    }
  }
};
