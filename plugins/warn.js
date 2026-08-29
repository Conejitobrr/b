'use strict';

const fs = require('fs');
const path = require('path');

// 🗄️ BÓVEDA LOCAL PARA WARNS
const WARNS_PATH = path.join(process.cwd(), 'lib', 'warns.json');
if (!fs.existsSync(path.dirname(WARNS_PATH))) fs.mkdirSync(path.dirname(WARNS_PATH), { recursive: true });
if (!fs.existsSync(WARNS_PATH)) fs.writeFileSync(WARNS_PATH, '{}');

function getWarns() { try { return JSON.parse(fs.readFileSync(WARNS_PATH, 'utf8')); } catch { return {}; } }
function saveWarns(data) { fs.writeFileSync(WARNS_PATH, JSON.stringify(data, null, 2)); }

// 🔥 FUNCIÓN DEFINITIVA: Destruye el ID "sucio" de WhatsApp y lo reconstruye perfecto
function getTargetJid(msg) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  
  const raw = quoted || mentioned;
  if (!raw) return null;

  // Extrae ÚNICAMENTE los números puros (sin '+', espacios ni colones)
  const pureNum = String(raw).replace(/\D/g, '');
  return `${pureNum}@s.whatsapp.net`;
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
        const pureNum = String(jid).replace(/\D/g, '');
        const targetJid = `${pureNum}@s.whatsapp.net`;
        list += `${i + 1}. @${pureNum} — *${count}/${MAX_WARN}*\n`; 
        mentions.push(targetJid);
      });
      
      return sock.sendMessage(remoteJid, { text: list, mentions }, { quoted: msg });
    }

    // 🛡️ Permisos
    if (!isAdmin && !isOwner) return reply('❌ Solo los administradores pueden usar este comando.');

    // 🎯 CAPTURA DEL JID (Totalmente purificado para forzar el color azul)
    const targetJid = getTargetJid(msg);
    if (!targetJid) return reply('❌ Debes mencionar o responder al mensaje del usuario.');
    
    const pureNumber = targetJid.split('@')[0];

    // 2. COMANDO: REINICIAR WARNS (0/3)
    if (commandName === 'resetwarn') {
      delete groupWarns[targetJid];
      saveWarns(dbWarns);
      return sock.sendMessage(remoteJid, { 
        text: `✅ Warns reiniciados a 0 para @${pureNumber}.`, 
        mentions: [targetJid] 
      }, { quoted: msg });
    }

    // 3. COMANDO: QUITAR 1 WARN (-1)
    if (commandName === 'unwarn') {
      const current = groupWarns[targetJid] || 0;
      groupWarns[targetJid] = Math.max(0, current - 1);
      saveWarns(dbWarns);
      return sock.sendMessage(remoteJid, { 
        text: `✅ Se quitó 1 warn a @${pureNumber}.\n🚨 Warns actuales: *${groupWarns[targetJid]}/${MAX_WARN}*`, 
        mentions: [targetJid] 
      }, { quoted: msg });
    }

    // 4. COMANDO: AGREGAR WARN (+1)
    if (commandName === 'warn') {
      // Limpiamos el texto del motivo para que no aparezca el "@Nick" ahí metido
      const reason = args.join(' ').replace(/@\S+/g, '').trim() || 'Advertencia manual';
      
      const current = (groupWarns[targetJid] || 0) + 1;
      groupWarns[targetJid] = current;
      saveWarns(dbWarns);

      const textWarn = `⚠️ *ADVERTENCIA MANUAL*\n\n👤 Usuario: @${pureNumber}\n📌 Motivo: ${reason}\n🚨 Warns: *${current}/${MAX_WARN}*`;

      await sock.sendMessage(remoteJid, { 
        text: textWarn, 
        mentions: [targetJid] 
      }, { quoted: msg });

      // Expulsión
      if (current >= MAX_WARN) {
        groupWarns[targetJid] = 0; 
        saveWarns(dbWarns);

        const textBan = `🚫 *LÍMITE ALCANZADO*\n\n@${pureNumber} ha sido expulsado por llegar a *${MAX_WARN}* advertencias.`;

        await sock.sendMessage(remoteJid, { 
          text: textBan, 
          mentions: [targetJid] 
        });

        setTimeout(async () => {
          try {
            await sock.groupParticipantsUpdate(remoteJid, [targetJid], 'remove');
          } catch (err) {
            console.log('Error expulsando al usuario manualmente:', err.message);
          }
        }, 1000);
      }
    }
  }
};
